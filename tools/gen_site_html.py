"""Generate Output/SiteMasterList.html from site_data.json files.

No inline style= attributes — all styling via CSS classes.
Viewport meta included. Matches app suite-bar pattern.
"""
from __future__ import annotations
import html
import json
import os
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SITES_DIR = REPO / "data" / "sites"
OUT_HTML = REPO / "Output" / "SiteMasterList.html"

DROPBOX = {
    "ca-2921-el-cajon":  "2921-2923 El Cajon Blvd/",
    "ca-4335-euclid":    "4335 Euclid Ave San Diego, CA 92115/",
    "ca-1905-rohn":      "1905 Rohn Rd Escondido, CA 92025/",
    "ca-12652-laux":     "12652 Laux Ave, Garden Grove, CA 92840/",
    "ca-5251-palmyra":   "5251 Palmyra Ave, San Diego CA 92117/",
    "ca-9362-angwin":    "9362 Angwin Pl San Diego, CA 92123 United States/",
    "wa-405-126th":      "405 SW 126th St Seattle, WA 98146/",
}
CITY_COUNTY = {
    "San Diego": "San Diego", "Escondido": "San Diego",
    "Garden Grove": "Orange", "Kirkland": "King, WA",
    "Renton": "King, WA", "Burien": "King, WA",
}
SITE_ORDER = [
    "ca-2921-el-cajon", "ca-3063-cabrillo-mesa", "ca-4335-euclid",
    "ca-4876-cannington", "ca-5251-palmyra", "ca-9362-angwin",
    "ca-1905-rohn", "ca-11001-westminster", "ca-12652-laux",
    "wa-10404-kirkland", "wa-12843-175th", "wa-405-126th",
]

CSS = """
/* ── layout ─────────────────────────────────────────────────────────── */
.sm-wrap { max-width: 100%; padding: 0 12px 40px; overflow-x: auto; }
.sm-title { font-size: 1em; font-weight: 700; color: var(--cad-gold,#d4a843);
            letter-spacing:.04em; text-transform:uppercase; padding: 10px 0 6px; }
.sm-updated { font-size:.72em; color:#94a3b8; margin-bottom:12px; }

/* ── table ───────────────────────────────────────────────────────────── */
.sm-table { width:100%; border-collapse:collapse; font-size:.78em;
            background:var(--card,#fff); }
.sm-table th { background:#0f4c81; color:#fff; font-weight:600;
               padding:7px 8px; text-align:left; white-space:nowrap; }
.sm-table td { padding:6px 8px; vertical-align:top; border-bottom:1px solid var(--border,#e2e8f0); }
.sm-table tr:hover td { background:rgba(15,76,129,.05); }

/* ── row county colours ──────────────────────────────────────────────── */
.row-sd  td { background:#d6e4f0; }
.row-oc  td { background:#fff3cd; }
.row-wa  td { background:#d5f0d5; }
.row-sd:hover td { background:#c2d9ee; }
.row-oc:hover td { background:#ffedb5; }
.row-wa:hover td { background:#bfe8bf; }

/* ── step / file cells ───────────────────────────────────────────────── */
.step-yes  { background:#c6efce !important; text-align:center; }
.step-no   { background:#ffcccc !important; text-align:center; }
.file-ok   { background:#c6efce !important; font-size:.7em; word-break:break-all; }
.file-no   { background:#ffcccc !important; }

/* ── legend ──────────────────────────────────────────────────────────── */
.sm-legend { display:flex; gap:10px; flex-wrap:wrap; margin-top:14px; font-size:.74em; }
.leg-item { display:flex; align-items:center; gap:5px; }
.leg-swatch { width:16px; height:16px; border:1px solid #ccc; flex-shrink:0; }
.leg-sd  { background:#d6e4f0; } .leg-oc { background:#fff3cd; }
.leg-wa  { background:#d5f0d5; } .leg-y  { background:#c6efce; }
.leg-n   { background:#ffcccc; }

/* ── print ───────────────────────────────────────────────────────────── */
@media print {
    .suite-bar,.no-print { display:none !important; }
    .sm-table th { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
"""

STEP_HEADERS = [
    "S1<br>Proj Info", "S2<br>APN", "S3<br>Zoning",
    "S7<br>Parcel Map", "S5<br>Site Visit",
    "S4<br>Photos", "S6<br>Survey Req", "S8<br>Survey Rcvd",
]

INDEX_STATUS: dict[str, str] = {}


def _load_index() -> None:
    fp = SITES_DIR / "index.json"
    if not fp.exists():
        return
    data = json.loads(fp.read_text(encoding="utf-8"))
    for entry in data.get("sites", []):
        raw = entry["id"].lower().replace("_", "-")
        # normalise: CA-4335_EUCLID → ca-4335-euclid
        INDEX_STATUS[raw] = entry.get("status", "skeleton")


def _load_sites() -> list[dict]:
    _load_index()
    rows = []
    for site_id in SITE_ORDER:
        folder = SITES_DIR / site_id
        fp = folder / "site_data.json"
        if not fp.exists():
            continue
        d = json.loads(fp.read_text(encoding="utf-8"))

        addr_raw = d.get("address", "")
        if isinstance(addr_raw, dict):
            full_addr = addr_raw.get("full", "")
            city = addr_raw.get("city", "")
        else:
            full_addr = str(addr_raw)
            parts = full_addr.split(",")
            city = parts[1].strip() if len(parts) > 1 else ""

        county = CITY_COUNTY.get(city, "")
        state = site_id[:2].upper()

        apn = d.get("apn", "") or ""
        if isinstance(apn, list):
            apn = ", ".join(apn)

        zoning = ""
        if isinstance(d.get("site"), dict):
            zoning = d["site"].get("zoning", "")
        zoning = zoning or d.get("zoning", "") or ""

        files_in = [f.name for f in folder.iterdir() if f.name != "site_data.json"]
        pdfs = [f for f in files_in if f.lower().endswith(".pdf")]
        dwgs = [f for f in files_in if f.lower().endswith(".dwg")]
        parcel_maps = [f for f in pdfs if "parcelmap" in f.lower() or "parcel_map" in f.lower()]
        surveys = [f for f in pdfs + dwgs
                   if any(k in f.lower() for k in ("survey", "topo", "rohn", "sv-"))]

        # look up index status
        idx_key = site_id.replace("-", "-")   # already normalised
        idx_st = INDEX_STATUS.get(idx_key, "skeleton")

        proj = d.get("project", "")
        has_proj = isinstance(proj, dict) and proj != {}

        steps = {
            "s1": "Y" if has_proj else "",
            "s2": "Y" if apn else "",
            "s3": "Y" if zoning else "",
            "s7": "Y" if parcel_maps else "",
            "s5": "Y" if idx_st in ("complete", "partial") else "",
            "s4": "",
            "s6": "",
            "s8": "Y" if surveys else "",
        }

        rows.append({
            "site_id": site_id,
            "address": full_addr,
            "apn": apn,
            "county": county,
            "state": state,
            "zoning": zoning,
            "dropbox": DROPBOX.get(site_id, ""),
            "parcel_map": "; ".join(parcel_maps),
            "survey": "; ".join(surveys),
            **steps,
        })
    return rows


def _row_class(r: dict) -> str:
    if r["county"] == "Orange":
        return "row-oc"
    if r["state"] == "WA":
        return "row-wa"
    return "row-sd"


def _step_td(val: str) -> str:
    cls = "step-yes" if val == "Y" else "step-no"
    return f'<td class="{cls}">{html.escape(val)}</td>'


def _file_td(val: str) -> str:
    cls = "file-ok" if val else "file-no"
    return f'<td class="{cls}">{html.escape(val)}</td>'


def build_html(rows: list[dict]) -> str:
    from datetime import datetime, timezone
    updated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    thead_steps = "".join(f"<th>{h}</th>" for h in STEP_HEADERS)
    header_row = (
        "<tr><th>#</th><th>Site ID</th><th>Full Address</th>"
        "<th>APN(s)</th><th>County</th><th>St</th><th>Zoning</th>"
        "<th>Dropbox Folder</th><th>Parcel Map (repo)</th><th>Survey (repo)</th>"
        f"{thead_steps}<th>Notes</th></tr>"
    )

    tbody_rows = []
    for i, r in enumerate(rows, 1):
        rc = _row_class(r)
        step_tds = "".join(_step_td(r[k]) for k in ("s1","s2","s3","s7","s5","s4","s6","s8"))
        tbody_rows.append(
            f'<tr class="{rc}">'
            f"<td>{i}</td>"
            f"<td>{html.escape(r['site_id'])}</td>"
            f"<td>{html.escape(r['address'])}</td>"
            f"<td>{html.escape(r['apn'])}</td>"
            f"<td>{html.escape(r['county'])}</td>"
            f"<td>{html.escape(r['state'])}</td>"
            f"<td>{html.escape(r['zoning'])}</td>"
            f"<td>{html.escape(r['dropbox'])}</td>"
            f"{_file_td(r['parcel_map'])}"
            f"{_file_td(r['survey'])}"
            f"{step_tds}"
            f"<td></td>"
            f"</tr>"
        )

    legend = """
<div class="sm-legend no-print">
  <div class="leg-item"><div class="leg-swatch leg-sd"></div>San Diego County</div>
  <div class="leg-item"><div class="leg-swatch leg-oc"></div>Orange County</div>
  <div class="leg-item"><div class="leg-swatch leg-wa"></div>Washington</div>
  <div class="leg-item"><div class="leg-swatch leg-y"></div>Complete / File present</div>
  <div class="leg-item"><div class="leg-swatch leg-n"></div>Not done / Missing</div>
</div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="#0f4c81">
  <title>Site Master List</title>
  <link rel="stylesheet" href="../app/src/css/style.css">
  <style>{CSS}</style>
</head>
<body>
<div class="page-wrapper">

  <div class="suite-bar no-print">
    <a href="InteractiveMap.html" class="suite-bar-link">Map</a>
    <span class="suite-bar-sep">|</span>
    <a href="SiteInfoSheet.html" class="suite-bar-link">Site Info</a>
    <span class="suite-bar-sep">|</span>
    <a href="PreApp_Checklist.html" class="suite-bar-link">Checklist</a>
    <span class="suite-bar-sep">|</span>
    <span class="suite-bar-active">Master List</span>
  </div>

  <div class="sm-wrap">
    <div class="sm-title">Site Master List</div>
    <div class="sm-updated no-print">Last generated: {updated}</div>

    <table class="sm-table">
      <thead>{header_row}</thead>
      <tbody>{''.join(tbody_rows)}</tbody>
    </table>

    {legend}
  </div>

</div>
</body>
</html>
"""


if __name__ == "__main__":
    rows = _load_sites()
    html_out = build_html(rows)
    OUT_HTML.write_text(html_out, encoding="utf-8")
    print(f"HTML: {OUT_HTML}  ({len(rows)} sites)")
