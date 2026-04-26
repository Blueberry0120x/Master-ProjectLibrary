#!/usr/bin/env python3
"""
build.py - Canonical build pipeline for ProjectBook-Planner.

Compiles src/ into Output/InteractiveMap.html and Output/PreApp_Checklist.html.
Optionally runs a local dev server with save/switch endpoints.

Usage:
    python tools/build.py            # compile only
    python tools/build.py debug      # compile + open in browser
    python tools/build.py serve      # compile + local server (port 3034)
"""
from __future__ import annotations

import json
import os
import re
import shutil
import sys
import webbrowser
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE = Path(__file__).resolve().parent.parent
SRC = BASE / "src"
OUTPUT_DIR = BASE / "Output"
DOCS_DIR = BASE / "docs"
SITE_DATA_FILE = BASE / "data" / "site-data.json"
SITES_DIR = BASE / "data" / "sites"

OUTPUT_MAP      = OUTPUT_DIR / "InteractiveMap.html"
OUTPUT_CHK      = OUTPUT_DIR / "PreApp_Checklist.html"
OUTPUT_SITEINFO = OUTPUT_DIR / "SiteInfoSheet.html"

PUBLIC_URL = "https://blueberry0120x.github.io/ParcelDashboard/"

ENGINES = [
    "js/engine-config.js",
    "js/engine-ui.js",
    "js/engine-map.js",
    "js/engine-elevation.js",
    "js/engine-setback.js",
    "js/engine-export.js",
    "js/engine-vertex.js",
    "js/engine-resize.js",
    "js/bootstrap.js",
]

PORT = 3040


# ── Core helpers ──────────────────────────────────────────────────────────────

def get_active_site_id() -> str | None:
    """Read activeSiteId pointer from site-data.json."""
    if not SITE_DATA_FILE.exists():
        return None
    try:
        sd = _read_json(SITE_DATA_FILE)
        # New pointer format
        aid = sd.get("activeSiteId")
        if aid:
            return str(aid)
        # Migration: top-level siteId (client payload)
        tid = sd.get("siteId")
        if tid:
            return str(tid)
        # Migration: old full-copy format had .site.siteId
        site = sd.get("site")
        if site and site.get("siteId"):
            return str(site["siteId"])
    except Exception as e:
        print(f"  [WARN] site-data.json unreadable: {e}")
    return None


def _read_json(path: Path) -> dict:
    """Read a JSON file, tolerating UTF-8 BOM."""
    return json.loads(path.read_text(encoding="utf-8-sig"))


def get_site_file(site_id: str) -> Path | None:
    """Find the .json path for a given siteId by scanning data/sites/."""
    if not SITES_DIR.is_dir():
        return None
    for f in SITES_DIR.glob("*.json"):
        try:
            raw = _read_json(f)
            site = raw.get("site")
            if site and str(site.get("siteId", "")) == site_id:
                return f
        except Exception:
            continue
    return None


def _merge_site_data(sd: dict) -> dict:
    """Merge a site JSON (project + site + saved) into a flat defaults dict."""
    merged = {}
    if sd.get("project"):
        merged["project"] = sd["project"]
    if sd.get("site"):
        merged.update(sd["site"])
    if sd.get("saved"):
        merged.update(sd["saved"])
    return merged


def get_inject_script() -> str:
    """Build <script>window.__SITE_DEFAULTS__ = {...};</script> from active site file."""
    active_id = get_active_site_id()
    if not active_id:
        return ""
    site_file = get_site_file(active_id)
    if not site_file:
        return ""
    try:
        sd = _read_json(site_file)
        merged = _merge_site_data(sd)
        merged["siteFileName"] = site_file.name
        if merged:
            j = json.dumps(merged, separators=(",", ":"))
            cache_clear = (
                "<script>"
                "try{var _sd=window.__SITE_DEFAULTS__||{},"
                "_ls=null;try{_ls=JSON.parse(localStorage.getItem('site_state'))}catch(e){}"
                "var _sb=(_sd.buildings||[]).length,"
                "_lb=(_ls&&_ls.saved&&_ls.saved.buildings)?_ls.saved.buildings.length:0;"
                "if(_sb>0&&_sb!==_lb){console.log('[SEED] Server buildings('+_sb+') != local('+_lb+') — clearing cache');"
                "localStorage.removeItem('site_state')}}catch(e){}"
                "</script>"
            )
            return f"<script>window.__SITE_DEFAULTS__ = {j};</script>\n{cache_clear}"
    except Exception:
        pass
    return ""


def get_site_list_script() -> str:
    """Build <script>window.__SITE_LIST__ = [...];</script> from all site files."""
    if not SITES_DIR.is_dir():
        return ""
    entries = []
    for f in sorted(SITES_DIR.glob("*.json")):
        try:
            raw = _read_json(f)
            site = raw.get("site")
            if not site:
                continue
            entries.append({
                "siteId": site.get("siteId", ""),
                "address": site.get("address", ""),
                "apn": site.get("apn", ""),
                "file": f.name,
            })
        except Exception:
            continue
    if entries:
        j = json.dumps(entries, separators=(",", ":"))
        return f"<script>window.__SITE_LIST__ = {j};</script>"
    return ""


def get_all_site_data_script() -> str:
    """Build <script>window.__ALL_SITE_DATA__ = {...};</script> for offline switching."""
    if not SITES_DIR.is_dir():
        return ""
    all_data = {}
    for f in sorted(SITES_DIR.glob("*.json")):
        try:
            sd = _read_json(f)
            site = sd.get("site")
            if not site or not site.get("siteId"):
                continue
            site_id = str(site["siteId"])
            merged = _merge_site_data(sd)
            merged["siteFileName"] = f.name
            all_data[site_id] = merged
        except Exception:
            continue
    if all_data:
        j = json.dumps(all_data, separators=(",", ":"))
        return f"<script>window.__ALL_SITE_DATA__ = {j};</script>"
    return ""


def get_sites_api_json() -> str:
    """Return JSON array for GET /api/sites."""
    active_id = get_active_site_id()
    sites = []
    if SITES_DIR.is_dir():
        for f in sorted(SITES_DIR.glob("*.json")):
            try:
                raw = _read_json(f)
                site = raw.get("site")
                if not site or not site.get("siteId"):
                    continue
                sites.append({
                    "id": str(site["siteId"]),
                    "address": site.get("address", ""),
                    "apn": site.get("apn", ""),
                    "active": str(site["siteId"]) == active_id,
                })
            except Exception:
                continue
    return json.dumps(sites, separators=(",", ":"))


def set_active_site(site_id: str) -> bool:
    """Write activeSiteId pointer to site-data.json and rebuild."""
    if not site_id:
        return False
    site_file = get_site_file(site_id)
    if not site_file:
        return False
    pointer = json.dumps({"activeSiteId": site_id}, separators=(",", ":"))
    SITE_DATA_FILE.write_text(pointer, encoding="utf-8")
    build_interactive_map()
    build_checklist()
    build_siteinfo()
    return True


# ── Build functions ───────────────────────────────────────────────────────────

def get_google_maps_key_script() -> str:
    """Read googleMapsApiKey from UserPref.json and emit window.__GOOGLE_MAPS_KEY__."""
    pref_file = BASE / "UserPref.json"
    key = ""
    if pref_file.exists():
        try:
            prefs = _read_json(pref_file)
            key = str(prefs.get("googleMapsApiKey", "") or "").strip()
        except Exception:
            pass
    return f'<script>window.__GOOGLE_MAPS_KEY__="{key}";</script>'


def _inject_globals(html: str) -> str:
    """Inject __GOOGLE_MAPS_KEY__ at head start; __SITE_DEFAULTS__, __SITE_LIST__, __ALL_SITE_DATA__ before </head>."""
    # Google Maps key goes first so all subsequent scripts can read it
    gmap = get_google_maps_key_script()
    html = html.replace("<head>", f"<head>\n{gmap}", 1)
    print("  [+] Injected __GOOGLE_MAPS_KEY__")

    inject = get_inject_script()
    if inject:
        html = html.replace("</head>", f"{inject}\n</head>", 1)
        print("  [+] Injected __SITE_DEFAULTS__")
    else:
        print("  [i] No active site found (using defaults)")

    site_list = get_site_list_script()
    if site_list:
        html = html.replace("</head>", f"{site_list}\n</head>", 1)
        print("  [+] Injected __SITE_LIST__")

    all_data = get_all_site_data_script()
    if all_data:
        html = html.replace("</head>", f"{all_data}\n</head>", 1)
        print("  [+] Injected __ALL_SITE_DATA__")

    return html


def build_interactive_map() -> bool:
    """Build Output/InteractiveMap.html from src/index.html."""
    print()
    print("===========================================")
    print("  [1/2] InteractiveMap")
    print("===========================================")
    print()

    shell_path = SRC / "html" / "index.html"
    css_path = SRC / "css" / "style.css"

    if not shell_path.exists():
        print("  [ERROR] src/html/index.html not found")
        return False

    html = shell_path.read_text(encoding="utf-8")

    # Inline CSS
    if not css_path.exists():
        print("  [ERROR] src/css/style.css not found")
        return False
    css_content = css_path.read_text(encoding="utf-8")
    html = html.replace(
        '<link rel="stylesheet" href="../css/style.css" />',
        f"<style>\n{css_content}\n</style>",
    )
    print("  [+] Inlined: css/style.css")

    # Inline engine JS files
    for eng in ENGINES:
        eng_path = SRC / eng
        if not eng_path.exists():
            print(f"  [WARN] Missing: {eng}")
            continue
        js_content = eng_path.read_text(encoding="utf-8")
        html = html.replace(
            f'<script src="../{eng}"></script>',
            f"<script>\n{js_content}\n</script>",
        )
        print(f"  [+] Inlined: {eng}")

    # Replace markers
    html = html.replace("Development Shell -->", "Compiled Build -->")
    html = html.replace(
        "<!-- Open with Live Server (VS Code Go Live). Run build.cmd to compile to InteractiveMap.html -->",
        "",
    )

    # Inject all 3 globals
    html = _inject_globals(html)

    # Write output
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_MAP.write_text(html, encoding="utf-8")

    print()
    print("  [DONE] Output/InteractiveMap.html")
    print()
    return True


def build_siteinfo() -> bool:
    """Build Output/SiteInfoSheet.html from src/html/siteinfo.html."""
    src_path = SRC / "html" / "siteinfo.html"
    css_path = SRC / "css" / "style.css"
    if not src_path.exists():
        print("  [WARN] src/html/siteinfo.html not found -- skipping")
        return True

    html = src_path.read_text(encoding="utf-8")

    # Inline CSS (same pattern as InteractiveMap build)
    if css_path.exists():
        css_content = css_path.read_text(encoding="utf-8")
        html = html.replace(
            '<link rel="stylesheet" href="../css/style.css" />',
            f"<style>\n{css_content}\n</style>",
        )

    # Inject globals
    html = _inject_globals(html)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_SITEINFO.write_text(html, encoding="utf-8")
    print("  [DONE] Output/SiteInfoSheet.html")
    return True


def build_checklist() -> bool:
    """Build Output/PreApp_Checklist.html from src/checklist.html."""
    print("===========================================")
    print("  [2/2] PreApp_Checklist")
    print("===========================================")
    print()

    src_path = SRC / "html" / "checklist.html"
    if not src_path.exists():
        print("  [WARN] src/html/checklist.html not found -- skipping")
        return True

    html = src_path.read_text(encoding="utf-8")

    # Inject all 3 globals
    html = _inject_globals(html)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_CHK.write_text(html, encoding="utf-8")

    print()
    print("  [DONE] Output/PreApp_Checklist.html")
    print()
    return True


def copy_to_docs() -> None:
    """Copy Output/ HTML files to docs/ for GitHub Pages."""
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    for fname in ["InteractiveMap.html", "PreApp_Checklist.html", "SiteInfoSheet.html"]:
        src = OUTPUT_DIR / fname
        dst = DOCS_DIR / fname
        if src.exists():
            shutil.copy2(src, dst)
    print("  [DOCS] Synced Output -> docs/")


# ── Dev server ────────────────────────────────────────────────────────────────

def serve(port: int = PORT) -> None:
    """Run local dev server matching PS1 serve mode."""
    import datetime
    from http.server import BaseHTTPRequestHandler, HTTPServer
    from urllib.parse import unquote

    EDITABLE_FIELDS = {
        "legalDescription", "yearBuilt", "occupancyGroup", "projectType",
        "architect", "notes", "scopeOfWork", "existingDwellingSF",
        "inspectors", "planningAreas", "overlayZones",
    }

    class Handler(BaseHTTPRequestHandler):
        def do_OPTIONS(self):
            self.send_response(204)
            self._cors()
            self.end_headers()

        def do_GET(self):
            if self.path in ("/", ""):
                self._serve_root_launcher()
            elif self.path in ("/map", "/map/", "/InteractiveMap.html"):
                self._serve_file(OUTPUT_MAP)
            elif self.path in ("/checklist", "/PreApp_Checklist.html"):
                self._serve_file(OUTPUT_CHK)
            elif self.path in ("/siteinfo", "/SiteInfoSheet.html"):
                self._serve_file(OUTPUT_SITEINFO)
            elif self.path == "/api/sites":
                self._json_response(200, get_sites_api_json())
            else:
                self._serve_file(OUTPUT_MAP)

        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")

            if self.path == "/save":
                self._handle_save(body)
            elif self.path == "/backup-checklist":
                self._handle_backup(body)
            else:
                # Route pattern: /api/sites/{id}/activate or /api/sites/{id}/update-site
                m_activate = re.match(r"^/api/sites/([^/]+)/activate$", self.path)
                m_update = re.match(r"^/api/sites/([^/]+)/update-site$", self.path)
                if m_activate:
                    self._handle_activate(unquote(m_activate.group(1)))
                elif m_update:
                    self._handle_update_site(unquote(m_update.group(1)), body)
                else:
                    self.send_response(404)
                    self.end_headers()

        def _handle_save(self, body: str):
            """POST /save -- write to per-site file, preserve .site, overwrite .saved."""
            try:
                incoming = json.loads(body)
            except json.JSONDecodeError as e:
                print(f"  [SAVE ERROR] Bad JSON: {e}")
                self._json_response(400, json.dumps({"ok": False, "error": "invalid JSON"}))
                return

            target_id = incoming.get("siteId") or get_active_site_id()
            if not target_id:
                print("  [SAVE ERROR] No siteId in payload and no active site pointer")
                self._json_response(400, json.dumps({"ok": False, "error": "no active site"}))
                return

            site_file = get_site_file(target_id)
            if not site_file:
                print(f"  [SAVE ERROR] Site file not found for: {target_id}")
                self._json_response(404, json.dumps({"ok": False, "error": "site_not_found"}))
                return

            try:
                existing = _read_json(site_file)
                merged = {
                    "project": incoming.get("project", "ProjectBook-Planner"),
                    "site": existing.get("site"),
                    "saved": incoming.get("saved"),
                    "checklist": incoming.get("checklist"),
                }
                # Atomic write: write to temp then rename so a crash can't corrupt the file
                tmp = site_file.with_suffix(".tmp")
                tmp.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
                tmp.replace(site_file)
            except Exception as e:
                print(f"  [SAVE ERROR] Write failed: {e}")
                self._json_response(500, json.dumps({"ok": False, "error": str(e)}))
                return

            print(f"  [SAVE] {target_id} saved -- rebuilding...")
            build_interactive_map()
            build_checklist()
            build_siteinfo()
            copy_to_docs()
            print("  [SAVE] Done.")
            self._json_response(200, '{"ok":true}')

        def _handle_activate(self, site_id: str):
            """POST /api/sites/{id}/activate -- pointer update only, rebuild."""
            if not re.match(r"^[a-zA-Z0-9_-]+$", site_id):
                self._json_response(400, '{"ok":false,"error":"invalid site id"}')
                return
            if set_active_site(site_id):
                copy_to_docs()
                print(f"  [SITE] Activated: {site_id}")
                self._json_response(200, '{"ok":true}')
            else:
                self._json_response(404, '{"ok":false,"error":"site_not_found"}')

        def _handle_update_site(self, site_id: str, body: str):
            """POST /api/sites/{id}/update-site -- edit whitelisted .site fields."""
            site_file = get_site_file(site_id)
            if not site_file:
                self._json_response(404, '{"ok":false,"error":"site_not_found"}')
                return
            try:
                updates = json.loads(body)
                existing = _read_json(site_file)
                site_obj = existing.get("site", {})
                for field in EDITABLE_FIELDS:
                    if field in updates:
                        site_obj[field] = updates[field]
                existing["site"] = site_obj
                tmp = site_file.with_suffix(".tmp")
                tmp.write_text(json.dumps(existing, indent=2, ensure_ascii=False), encoding="utf-8")
                tmp.replace(site_file)
                build_interactive_map()
                build_checklist()
                build_siteinfo()
                copy_to_docs()
                print(f"  [EDIT] Site info updated + rebuilt.")
                self._json_response(200, '{"ok":true}')
            except Exception as e:
                self._json_response(500, json.dumps({"ok": False, "error": str(e)}))

        def _handle_backup(self, body: str):
            """POST /backup-checklist -- archive checklist JSON."""
            backup_dir = BASE / "config" / "backup"
            backup_dir.mkdir(parents=True, exist_ok=True)
            stamp = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
            path = backup_dir / f"preapp-checklist-{stamp}.json"
            path.write_text(body, encoding="utf-8")
            self._json_response(200, '{"ok":true}')

        def _serve_root_launcher(self):
            """Serve root index.html with href paths rewritten for the dev server."""
            launcher = BASE / 'index.html'
            if launcher.exists():
                html = launcher.read_text(encoding='utf-8')
                html = html.replace('href="InteractiveMap.html"', 'href="/map"')
                html = html.replace('href="PreApp_Checklist.html"', 'href="/checklist"')
                body = html.encode('utf-8')
                self.send_response(200)
                self._cors()
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            else:
                self._serve_launcher_fallback()

        def _serve_launcher_fallback(self):
            body = (
                '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
                '<meta name="viewport" content="width=device-width,initial-scale=1">'
                '<title>ProjectBook-Planner</title>'
                '<style>*{box-sizing:border-box;margin:0;padding:0}'
                'body{background:#0d1b2a;font-family:system-ui,sans-serif;'
                'min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:32px;}'
                'h1{color:#e2e8f0;font-size:2rem;font-weight:800;letter-spacing:-0.5px;}'
                'p{color:#64748b;font-size:0.9rem;margin-top:4px;}'
                '.cards{display:flex;gap:20px;flex-wrap:wrap;justify-content:center;}'
                '.card{background:#1e3a5f;border:1px solid #2d4a7a;border-radius:12px;'
                'padding:32px 40px;text-align:center;text-decoration:none;color:#e2e8f0;'
                'min-width:200px;transition:background .15s,transform .15s;}'
                '.card:hover{background:#2d4a7a;transform:translateY(-2px);}'
                '.card-icon{font-size:2.4rem;margin-bottom:12px;}'
                '.card-title{font-size:1.1rem;font-weight:700;}'
                '.card-sub{font-size:0.8rem;color:#64748b;margin-top:4px;}'
                '</style></head><body>'
                '<div><h1>ProjectBook-Planner</h1>'
                '<p style="text-align:center">Interactive Planning &amp; Concept Design</p></div>'
                '<div class="cards">'
                f'<a class="card" href="http://localhost:{p}/map">'
                '<div class="card-icon">&#x1F5FA;</div>'
                '<div class="card-title">Interactive Map</div>'
                '<div class="card-sub">Parcel / setbacks / buildings</div></a>'
                f'<a class="card" href="http://localhost:{p}/checklist">'
                '<div class="card-icon">&#x2611;</div>'
                '<div class="card-title">Pre-App Checklist</div>'
                '<div class="card-sub">Permit &amp; entitlement tracker</div></a>'
                f'<a class="card" href="http://localhost:{p}/siteinfo">'
                '<div class="card-icon">&#x1F4CB;</div>'
                '<div class="card-title">Site Info Sheet</div>'
                '<div class="card-sub">Data sheet + Export LISP</div></a>'
                '</div></body></html>'
            ).encode('utf-8')
            self.send_response(200)
            self._cors()
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _serve_launcher(self, p: int):
            """Legacy alias — redirects to _serve_launcher_fallback."""
            self._serve_launcher_fallback()

        def _serve_file(self, filepath: Path):
            try:
                content = filepath.read_bytes()
                self.send_response(200)
                self._cors()
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            except FileNotFoundError:
                self.send_response(404)
                self.end_headers()

        def _json_response(self, code: int, body: str):
            self.send_response(code)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body.encode("utf-8"))

        def _cors(self):
            origin = self.headers.get("Origin", "")
            if origin and re.match(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$", origin):
                self.send_header("Access-Control-Allow-Origin", origin)
            else:
                self.send_header("Access-Control-Allow-Origin", f"http://localhost:{port}")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def log_message(self, fmt, *args):
            pass  # quiet

    server = HTTPServer(("localhost", port), Handler)
    print()
    print("===========================================")
    print(f"  [LOCAL]  http://localhost:{port}/           Launcher")
    print(f"           http://localhost:{port}/map         Map")
    print(f"           http://localhost:{port}/checklist   Checklist")
    print(f"           http://localhost:{port}/siteinfo    Site Info Sheet")
    print(f"  [PUBLIC] {PUBLIC_URL}")
    print(f"           {PUBLIC_URL}PreApp_Checklist.html")
    print("  Save Config writes directly to site JSON")
    print("  Press Ctrl+C to stop")
    print("===========================================")
    print()

    webbrowser.open(f"http://localhost:{port}/")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  [SERVE] Server stopped.")
        server.server_close()


# ── Main ──────────────────────────────────────────────────────────────────────

def validate_sites():
    """Enforce required .saved fields on every site JSON. Auto-fix missing fields."""
    REQUIRED_SAVED = {
        "lat": 0.0, "lng": 0.0, "rotation": 0, "locked": True,
        "setbacks": {"front": 10, "rear": 10, "sideL": 0, "sideR": 0},
        "buildings": [{"orientation": 0, "W": 30, "D": 60, "offsetX": 0,
                       "offsetY": 0, "count": 1, "stackSpacing": 0,
                       "anchor": "center", "stories": 1, "floorHeight": 9}],
        "activeBuilding": 0,
        "commFront": False, "showBldgDims": False,
        "hiddenDimKeys": [], "chainWOffset": 0, "chainDOffset": 0,
        "mapOpacity": 60, "setbacksApplied": False,
        "freeDrag": True, "snapEdge": True, "siteNorthDeg": 0,
        "vehicles": [], "activeVehicle": -1,
    }
    REQUIRED_BLDG = {"W", "D", "offsetX", "offsetY", "stories", "floorHeight"}

    if not SITES_DIR.is_dir():
        return
    for f in sorted(SITES_DIR.glob("*.json")):
        if f.name == "index.json":
            continue
        try:
            sd = _read_json(f)
        except Exception:
            continue
        saved = sd.get("saved")
        if not saved:
            continue
        sid = sd.get("site", {}).get("siteId", f.stem)
        fixed = []
        for key, default in REQUIRED_SAVED.items():
            if key not in saved:
                saved[key] = default
                fixed.append(key)
        for i, b in enumerate(saved.get("buildings", [])):
            for bk in REQUIRED_BLDG:
                if bk not in b:
                    b[bk] = 0 if bk != "floorHeight" else 9
                    fixed.append(f"buildings[{i}].{bk}")
        if fixed:
            f.write_text(json.dumps(sd, indent=2) + "\n", encoding="utf-8")
            print(f"  [FIX] {sid}: added missing fields: {', '.join(fixed)}")


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "build"

    validate_sites()
    ok = build_interactive_map()
    if not ok:
        sys.exit(1)
    build_checklist()
    build_siteinfo()
    copy_to_docs()

    print("===========================================")
    print()

    if mode == "debug":
        print("  [DEBUG] Opening in browser...")
        webbrowser.open(str(OUTPUT_MAP))
    elif mode == "serve":
        port = int(sys.argv[2]) if len(sys.argv) > 2 else PORT
        serve(port)


if __name__ == "__main__":
    main()
