"""DEPRECATED — superseded by PlanCheck-Planner/tools/fill_pdf_forms.py.

This script filled DS-375 only (pypdf, DS-375 alone). The full engine in
PlanCheck-Planner fills DS-375, DS-3032, and DS-420 via PyMuPDF and reads
from data/sites/{site_id}/site_data.json (per-site JSON, GLOBAL-004 compliant).

To fill permits: use PlanCheck-Planner
    py tools/fill_pdf_forms.py --project 4335-euclid
    py tools/fill_pdf_forms.py --project 2921-el-cajon

This file is kept for reference only. Do not run.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pypdf
from pypdf.generic import BooleanObject, NameObject, TextStringObject

ROOT = Path(__file__).resolve().parent.parent
BLANK_PDF = ROOT / "reference" / "pre_app-adu" / "San_Diego" / "permit" / "ds375-BLANK.pdf"
INDEX = ROOT / "data" / "sites" / "index.json"
OUT_ROOT = ROOT / "Output" / "permits"

BTN_ON_STATES = {
    "Yes": "/On", "Water": "/On", "Wastewater": "/On",
    "No": "/On",
    "Yes CCNow": "/Yes_2", "No CCNow": "/No",
    "sprinkled": "/On", "not sprinkled": "/On",
    "egress analysis": "/On", "no egress analysis": "/On",
    "previously graded": "/On", "not previously graded": "/On",
    "community plan amendment": "/On", "no community plan amendment": "/On",
    "45 years old": "/On", "not 45 years old": "/On",
    "historically significant": "/Yes_3", "not historically significant": "/No_2",
    "MHPA a wetland area etc": "/Yes_4", "no MHPA a wetland area etc": "/No_3",
    "runoff": "/On", "no runoff": "/On",
    "rezone": "/Yes_5", "no rezone": "/No_4",
}


def _folder_label(site_id: str, address: str) -> str:
    """Find the existing per-site permit folder, matching on the numeric suffix.

    Falls back to Title-cased derivation if no existing folder is found.
    """
    parts = site_id.split("_", 1)
    num = parts[0].split("-", 1)[1] if "-" in parts[0] else parts[0]
    if OUT_ROOT.exists():
        for p in OUT_ROOT.iterdir():
            if p.is_dir() and p.name.endswith(f"_{num}"):
                return p.name
    name_raw = parts[1] if len(parts) > 1 else ""
    name = name_raw.replace("_", " ").title().replace(" ", "")
    return f"{name}_{num}"


def _ascii_safe(s: str) -> str:
    """Replace Unicode punctuation that pypdf's default font cannot encode."""
    if not s:
        return s
    return (s.replace("\u2014", "--")
             .replace("\u2013", "-")
             .replace("\u2018", "'").replace("\u2019", "'")
             .replace("\u201C", '"').replace("\u201D", '"')
             .replace("\u2026", "...")
             .replace("\u00a0", " "))


def _pa(site: dict, key: str) -> str:
    for row in site.get("planningAreas", []) or []:
        if row.get("name", "").upper().startswith(key.upper()):
            return str(row.get("val") or "")
    return ""


def _oz(site: dict, key: str) -> str:
    for row in site.get("overlayZones", []) or []:
        if row.get("name", "").upper().startswith(key.upper()):
            return str(row.get("val") or "")
    return ""


def _yes(s: str) -> bool:
    return bool(s) and s.strip().lower().startswith("yes")


def _no(s: str) -> bool:
    return bool(s) and s.strip().lower().startswith("no")


def _year_45plus(year_built: str) -> bool | None:
    import re
    m = re.search(r"(\d{4})", str(year_built or ""))
    if not m:
        return None
    return (2026 - int(m.group(1))) >= 45


def _proposed_sf(saved: dict) -> int:
    total = 0
    for b in saved.get("buildings", []) or []:
        w = float(b.get("W") or 0)
        d = float(b.get("D") or 0)
        stories = int(b.get("stories") or 1)
        count = int(b.get("count") or 1)
        total += int(round(w * d * stories * count))
    return total


def build_field_map(site_json: dict) -> tuple[dict, dict]:
    """Return (text_fields, button_fields_on)."""
    site = site_json.get("site", {}) or {}
    saved = site_json.get("saved", {}) or {}

    addr = site.get("address") or ""
    zone = site.get("zoning") or ""
    cpa = _pa(site, "COMMUNITY PLAN")
    scope = site.get("scopeOfWork") or ""

    occ = site.get("occupancyGroup") or ""
    ex_occ, prop_occ = "", ""
    if "/" in occ:
        ex_occ, prop_occ = [s.strip() for s in occ.split("/", 1)]
    else:
        ex_occ = occ

    ex_sf = site.get("existingDwellingSF")
    prop_sf = _proposed_sf(saved)

    parking = _pa(site, "PARKING STANDARDS")

    text = {
        "Applicant Name": "",
        "Project Address": addr,
        "Project Scope": scope,
        "Community Planning Area": cpa,
        "Base Zone": zone,
        "Type of Construction per CBC": "",
        "Existing": "V-B",
        "Proposed": "V-A (sprinklered)",
        "Occupancy Classification per CBC": "",
        "Existing_2": ex_occ,
        "Proposed_2": prop_occ or "R-2 + B",
        "Building Square Footage": "",
        "Existing_3": str(ex_sf) if ex_sf else "",
        "Proposed_3": str(prop_sf) if prop_sf else "",
        "List any proposed public improvements": "",
        "Proposed Parking Ratio": parking,
        "List any deviation or variance requests": "",
        "Policy Questions": "",
        "Earthwork Quantities": "",
        "Amendment": "",
        "Historically Significant": "",
        "Rezone": "",
    }

    btn_on: list[str] = []
    btn_on += ["Water", "Wastewater"]

    cchs = _pa(site, "CCHS")
    if _yes(cchs):
        btn_on.append("Yes CCNow")
    else:
        btn_on.append("No CCNow")

    btn_on.append("sprinkled")

    age = _year_45plus(site.get("yearBuilt"))
    if age is True:
        btn_on.append("45 years old")
    elif age is False:
        btn_on.append("not 45 years old")

    hist = site.get("historicalDesignation") or ""
    if _yes(hist):
        btn_on.append("historically significant")
    else:
        btn_on.append("not historically significant")

    btn_on.append("no MHPA a wetland area etc")
    btn_on.append("no community plan amendment")
    btn_on.append("no rezone")

    return text, btn_on


def fill_pdf(site_json: dict, out_path: Path) -> None:
    reader = pypdf.PdfReader(str(BLANK_PDF))
    writer = pypdf.PdfWriter(clone_from=reader)

    text_fields, btn_on = build_field_map(site_json)
    text_fields = {k: _ascii_safe(v) for k, v in text_fields.items()}

    combined: dict = dict(text_fields)
    for name in btn_on:
        state = BTN_ON_STATES.get(name, "/On")
        combined[name] = NameObject(state)

    for page in writer.pages:
        writer.update_page_form_field_values(page, combined)

    if "/AcroForm" in writer._root_object:
        writer._root_object["/AcroForm"][NameObject("/NeedAppearances")] = BooleanObject(True)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("wb") as f:
        writer.write(f)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("site_ids", nargs="*")
    ap.add_argument("--all-sandiego", action="store_true")
    args = ap.parse_args()

    with INDEX.open(encoding="utf-8") as f:
        idx = json.load(f)

    sites = idx.get("sites", [])
    by_id = {s["id"]: s for s in sites}

    target_ids: list[str]
    if args.all_sandiego:
        target_ids = [s["id"] for s in sites if s.get("city") == "San Diego"]
    else:
        target_ids = args.site_ids

    if not target_ids:
        ap.error("provide site IDs or --all-sandiego")

    for sid in target_ids:
        meta = by_id.get(sid)
        if not meta:
            print(f"  SKIP {sid} (not in index.json)", file=sys.stderr)
            continue
        if meta.get("city") != "San Diego":
            print(f"  SKIP {sid} (city={meta.get('city')!r} - DS-375 is San Diego only)", file=sys.stderr)
            continue

        site_path = ROOT / "data" / "sites" / meta["file"]
        with site_path.open(encoding="utf-8") as f:
            site_json = json.load(f)

        label = _folder_label(sid, meta.get("address", ""))
        out_path = OUT_ROOT / label / "01-app_DS-375.pdf"
        fill_pdf(site_json, out_path)
        print(f"  OK   {sid} -> {out_path.relative_to(ROOT)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
