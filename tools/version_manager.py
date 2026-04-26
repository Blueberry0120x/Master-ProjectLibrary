#!/usr/bin/env python3
"""
version_manager.py - Snapshot and serve versioned builds of ProjectBook-Planner.

Usage:
    py tools/version_manager.py snapshot <version>
        Build Output/, copy to versions/v<version>/, record in versions/registry.json.
        Ports are assigned sequentially starting at 3041.
        Example: py tools/version_manager.py snapshot 1.1.0

    py tools/version_manager.py serve <version>
        Serve a specific version snapshot on its assigned port.
        Example: py tools/version_manager.py serve 1.1.0

    py tools/version_manager.py list
        List all registered versions with their ports and snapshot paths.

Port map:
    3040  -- build.py live dev server (reserved)
    3041+ -- version snapshots (assigned in registry.json)
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE = Path(__file__).resolve().parent.parent
VERSIONS_DIR = BASE / "versions"
REGISTRY_FILE = VERSIONS_DIR / "registry.json"
OUTPUT_DIR = BASE / "Output"

PORT_BASE = 3041  # 3040 is reserved for build.py dev server


# ── Registry helpers ──────────────────────────────────────────────────────────

def _load_registry() -> dict:
    """Load registry.json; return empty structure if missing or corrupt."""
    if not REGISTRY_FILE.exists():
        return {"versions": {}}
    try:
        return json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"versions": {}}


def _save_registry(reg: dict) -> None:
    """Write registry.json atomically."""
    VERSIONS_DIR.mkdir(parents=True, exist_ok=True)
    tmp = REGISTRY_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(reg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(REGISTRY_FILE)


def _next_port(reg: dict) -> int:
    """Return the next available port starting at PORT_BASE."""
    used = {entry["port"] for entry in reg["versions"].values()}
    port = PORT_BASE
    while port in used:
        port += 1
    return port


def _normalize(version: str) -> str:
    """Strip leading 'v' so '1.1.0' and 'v1.1.0' resolve to the same key."""
    return version.lstrip("v")


def _snapshot_dir(version: str) -> Path:
    return VERSIONS_DIR / f"v{_normalize(version)}"


# ── Commands ──────────────────────────────────────────────────────────────────

def cmd_snapshot(version: str) -> int:
    """Build project then snapshot Output/ into versions/v<version>/."""
    ver = _normalize(version)
    snap_dir = _snapshot_dir(ver)

    print(f"\n[version_manager] Building snapshot v{ver}...")
    result = subprocess.run(
        [sys.executable, str(BASE / "tools" / "build.py")],
        cwd=str(BASE),
    )
    if result.returncode != 0:
        print("[version_manager] ERROR: build.py failed — snapshot aborted.")
        return 1

    if not OUTPUT_DIR.exists() or not any(OUTPUT_DIR.iterdir()):
        print("[version_manager] ERROR: Output/ empty after build — snapshot aborted.")
        return 1

    if snap_dir.exists():
        print(f"[version_manager] WARNING: {snap_dir.relative_to(BASE)} exists — overwriting.")
        shutil.rmtree(snap_dir)
    shutil.copytree(str(OUTPUT_DIR), str(snap_dir))
    print(f"[version_manager] Snapshot written: {snap_dir.relative_to(BASE)}")

    reg = _load_registry()
    existing = reg["versions"].get(ver)
    port = existing["port"] if existing else _next_port(reg)
    files = sorted(f.name for f in snap_dir.iterdir() if f.is_file())
    reg["versions"][ver] = {
        "version": ver,
        "port": port,
        "snapshot_path": str(snap_dir.relative_to(BASE)).replace("\\", "/"),
        "files": files,
    }
    _save_registry(reg)

    print(f"[version_manager] Registered  v{ver} → port {port}")
    print(f"[version_manager] Files:       {', '.join(files)}")
    print(f"[version_manager] Serve with:  py tools/version_manager.py serve {ver}")
    return 0


def cmd_serve(version: str) -> int:
    """Serve a version snapshot from registry on its assigned port."""
    ver = _normalize(version)
    reg = _load_registry()
    entry = reg["versions"].get(ver)
    if not entry:
        print(f"[version_manager] ERROR: version '{ver}' not in registry.")
        _print_available(reg)
        return 1

    snap_dir = BASE / entry["snapshot_path"]
    if not snap_dir.exists():
        print(f"[version_manager] ERROR: snapshot missing: {snap_dir.relative_to(BASE)}")
        print("  Re-run: py tools/version_manager.py snapshot " + ver)
        return 1

    _serve_snapshot(snap_dir, entry["port"], ver)
    return 0


def cmd_list() -> int:
    """Print all registered versions."""
    reg = _load_registry()
    versions = reg.get("versions", {})
    if not versions:
        print("[version_manager] No versions registered yet.")
        print("  Run: py tools/version_manager.py snapshot <version>")
        return 0

    print()
    print(f"  {'Version':<12} {'Port':<8} {'Path':<30} Files")
    print(f"  {'-'*12} {'-'*8} {'-'*30} {'-'*30}")
    for ver, e in sorted(versions.items()):
        files = ", ".join(e.get("files", []))
        print(f"  v{e['version']:<11} {e['port']:<8} {e['snapshot_path']:<30} {files}")
    print()
    return 0


def _print_available(reg: dict) -> None:
    versions = list(reg.get("versions", {}).keys())
    if versions:
        print("  Available: " + ", ".join(f"v{v}" for v in sorted(versions)))
    else:
        print("  No versions registered. Run snapshot first.")


# ── HTTP server ───────────────────────────────────────────────────────────────

def _serve_snapshot(directory: Path, port: int, version: str) -> None:
    """Static file server for a snapshot directory."""

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            path = self.path.lstrip("/") or "InteractiveMap.html"
            if path in ("", "map", "map/"):
                path = "InteractiveMap.html"
            elif path in ("checklist", "checklist/"):
                path = "PreApp_Checklist.html"

            file_path = directory / path
            if not file_path.exists() or not file_path.is_file():
                file_path = directory / "InteractiveMap.html"
            if not file_path.exists():
                self.send_response(404)
                self.end_headers()
                return

            content = file_path.read_bytes()
            self.send_response(200)
            ct = "text/html; charset=utf-8" if file_path.suffix == ".html" else "application/octet-stream"
            self.send_header("Content-Type", ct)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)

        def do_OPTIONS(self):
            self.send_response(204)
            self.end_headers()

        def log_message(self, fmt, *args):
            pass  # quiet

    server = HTTPServer(("localhost", port), Handler)
    print()
    print("===========================================")
    print(f"  [SNAPSHOT]  v{version}")
    print(f"  Map:        http://localhost:{port}/")
    print(f"  Checklist:  http://localhost:{port}/checklist")
    print(f"  Directory:  {directory.relative_to(BASE)}")
    print(f"  Ctrl+C to stop")
    print("===========================================")
    print()
    webbrowser.open(f"http://localhost:{port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print(f"\n  [SNAPSHOT] v{version} stopped.")
        server.server_close()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    cmd = sys.argv[1].lower()

    if cmd == "snapshot":
        if len(sys.argv) < 3:
            print("ERROR: snapshot requires a version.  e.g. py tools/version_manager.py snapshot 1.1.0")
            sys.exit(1)
        sys.exit(cmd_snapshot(sys.argv[2]))

    elif cmd == "serve":
        if len(sys.argv) < 3:
            print("ERROR: serve requires a version.  e.g. py tools/version_manager.py serve 1.1.0")
            sys.exit(1)
        sys.exit(cmd_serve(sys.argv[2]))

    elif cmd == "list":
        sys.exit(cmd_list())

    else:
        print(f"ERROR: Unknown command '{cmd}'.  Commands: snapshot, serve, list")
        sys.exit(1)


if __name__ == "__main__":
    main()
