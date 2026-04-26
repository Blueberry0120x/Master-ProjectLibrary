#!/usr/bin/env python3
"""
serve_all.py - Launch all registered version snapshots simultaneously.

Reads versions/registry.json, starts each version on its assigned port
in a daemon thread, then blocks until Ctrl+C.

Usage:
    py tools/serve_all.py               # serve all + open browsers
    py tools/serve_all.py --no-browser  # serve all, suppress auto-open

Port map:
    3040  -- build.py live dev server (reserved, not managed here)
    3041+ -- version snapshots (from registry.json)
"""
from __future__ import annotations

import json
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE = Path(__file__).resolve().parent.parent
REGISTRY_FILE = BASE / "versions" / "registry.json"


# ── Registry ──────────────────────────────────────────────────────────────────

def _load_registry() -> dict:
    if not REGISTRY_FILE.exists():
        print("[serve_all] ERROR: versions/registry.json not found.")
        print("  Run: py tools/version_manager.py snapshot <version>")
        sys.exit(1)
    try:
        return json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"[serve_all] ERROR: registry.json corrupt: {e}")
        sys.exit(1)


# ── Handler factory ───────────────────────────────────────────────────────────

def _make_handler(directory: Path):
    """Return a handler class bound to a specific snapshot directory."""

    class SnapshotHandler(BaseHTTPRequestHandler):
        snap_dir = directory

        def do_GET(self):
            path = self.path.lstrip("/") or "InteractiveMap.html"
            if path in ("", "map", "map/"):
                path = "InteractiveMap.html"
            elif path in ("checklist", "checklist/"):
                path = "PreApp_Checklist.html"

            file_path = self.snap_dir / path
            if not file_path.exists() or not file_path.is_file():
                file_path = self.snap_dir / "InteractiveMap.html"
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

    return SnapshotHandler


# ── Server thread ─────────────────────────────────────────────────────────────

def _start_version_server(ver: str, entry: dict, open_browser: bool) -> HTTPServer | None:
    snap_dir = BASE / entry["snapshot_path"]
    port = entry["port"]

    if not snap_dir.exists():
        print(f"  [SKIP] v{ver} — snapshot missing: {snap_dir.relative_to(BASE)}")
        return None

    handler = _make_handler(snap_dir)
    server = HTTPServer(("localhost", port), handler)

    t = threading.Thread(
        target=server.serve_forever,
        name=f"snap-v{ver}",
        daemon=True,   # dies automatically when main exits
    )
    t.start()

    print(f"  v{ver:<12}  http://localhost:{port}/   ({snap_dir.relative_to(BASE)})")

    if open_browser:
        webbrowser.open(f"http://localhost:{port}/")

    return server


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    open_browser = "--no-browser" not in sys.argv

    reg = _load_registry()
    versions = reg.get("versions", {})

    if not versions:
        print("[serve_all] No versions registered.")
        print("  Run: py tools/version_manager.py snapshot <version>")
        sys.exit(0)

    print()
    print("===========================================")
    print("  serve_all.py — all registered snapshots")
    print("===========================================")
    print()
    print(f"  {'Version':<14} URL                          Snapshot")
    print(f"  {'-'*14} {'-'*35} {'-'*30}")

    servers: list[HTTPServer] = []
    for ver, entry in sorted(versions.items()):
        srv = _start_version_server(ver, entry, open_browser)
        if srv:
            servers.append(srv)

    if not servers:
        print("\n  No servers started — all snapshot directories missing.")
        sys.exit(1)

    print()
    print(f"  {len(servers)} server(s) running.  Ctrl+C to stop all.")
    print("===========================================")
    print()

    try:
        threading.Event().wait()   # block main thread forever
    except KeyboardInterrupt:
        print("\n[serve_all] Stopping all servers...")
        for srv in servers:
            srv.shutdown()
            srv.server_close()
        print("[serve_all] Done.")


if __name__ == "__main__":
    main()
