"""Fill official City of San Diego DSD PDF forms for each project.

Usage:
    py tools/fill_pdf_forms.py                  # fill all projects
    py tools/fill_pdf_forms.py --project 4335-euclid
    py tools/fill_pdf_forms.py --project 2921-el-cajon

Output: knowledge/san-diego-city/ProjectBook/{project}/{form}.pdf

Data source: data/sites/{site_id}/site_data.json — one file per project.
To add a new project: create data/sites/<site_id>/site_data.json.
No changes to this script needed.
"""
from __future__ import annotations

import argparse
import json
import re as _re
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parent.parent
BLANK_DIR = ROOT / "knowledge/san-diego-city/Reference/Form"
PROJECT_BOOK = ROOT / "knowledge/san-diego-city/ProjectBook"
SITES_DIR = ROOT / "data/sites"


# ---------------------------------------------------------------------------
# Data loader — flattens nested site_data.json into the flat dict expected
# by the fill_* functions below.
# ---------------------------------------------------------------------------

def load_site(site_id: str) -> dict:
    """Load data/sites/{site_id}/site_data.json and flatten for fill functions."""
    path = SITES_DIR / site_id / "site_data.json"
    if not path.exists():
        raise FileNotFoundError(
            f"No site_data.json for '{site_id}' — expected: {path}"
        )
    with path.open(encoding="utf-8") as f:
        data = json.load(f)

    addr = data.get("address", {})
    site = data.get("site", {})
    proj = data.get("project", {})
    existing = proj.get("existing", {})
    proposed = proj.get("proposed", {})
    ds375 = data.get("ds375", {})
    applicant = data.get("applicant", {})
    owner = data.get("owner", {})

    return {
        # identity
        "address":                    addr.get("full", ""),
        "address_street":             addr.get("street", ""),
        "city":                       addr.get("city", ""),
        "state":                      addr.get("state", ""),
        "zip":                        addr.get("zip", ""),
        "apn":                        site.get("apn", ""),
        "legal_description":          site.get("legal_description", ""),
        "community_plan":             site.get("community_plan", ""),
        "base_zone":                  site.get("base_zone", ""),
        "year_built_existing":        site.get("year_built_existing", ""),
        # project
        "prj":                        proj.get("prj", ""),
        "title":                      proj.get("title", ""),
        "permit_type":                proj.get("permit_type", "Building"),
        "scope":                      proj.get("scope", ""),
        "forms":                      proj.get("forms", []),
        "is_45_years":                proj.get("is_45_years", False),
        "fire_sprinklers":            proj.get("fire_sprinklers", False),
        "egress_analysis":            proj.get("egress_analysis", False),
        "previously_graded":          proj.get("previously_graded", False),
        "parking_ratio":              proj.get("parking_ratio", ""),
        "deviations":                 proj.get("deviations", ""),
        "earthwork_quantities":       proj.get("earthwork_quantities", ""),
        "public_improvements":        proj.get("public_improvements", ""),
        # existing / proposed
        "existing_sf":                existing.get("sf", ""),
        "existing_stories":           existing.get("stories", ""),
        "existing_construction_type": existing.get("construction_type", ""),
        "existing_occupancy":         existing.get("occupancy", ""),
        "existing_use":               existing.get("use", ""),
        "proposed_sf":                proposed.get("sf", ""),
        "proposed_stories":           proposed.get("stories", ""),
        "proposed_construction_type": proposed.get("construction_type", ""),
        "proposed_occupancy":         proposed.get("occupancy", ""),
        "proposed_use":               proposed.get("use", ""),
        # ds375
        "ds375_policy_questions":       ds375.get("policy_questions", ""),
        "ds375_community_plan_amend":   ds375.get("community_plan_amend", False),
        "ds375_historically_significant": ds375.get("historically_significant", False),
        "ds375_mhpa":                   ds375.get("mhpa", False),
        "ds375_runoff":                 ds375.get("runoff", False),
        "ds375_rezone":                 ds375.get("rezone", False),
        # applicant
        "applicant_name":    applicant.get("name", ""),
        "applicant_company": applicant.get("company", ""),
        "applicant_phone":   applicant.get("phone", ""),
        "applicant_email":   applicant.get("email", ""),
        "applicant_title":   applicant.get("title", ""),
        "license_no":        applicant.get("license_no", ""),
        # owner
        "owner_name":    owner.get("name", ""),
        "owner_phone":   owner.get("phone", ""),
        "owner_address": owner.get("address", ""),
        "owner_city":    owner.get("city", ""),
        "owner_state":   owner.get("state", ""),
        "owner_zip":     owner.get("zip", ""),
        "owner_email":   owner.get("email", ""),
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _radio_on_value(doc: fitz.Document, widget: fitz.Widget) -> str:
    """Return the PDF export on-value for a radio button widget.

    Parses the widget's /AP /N dict from the xref object to find the key
    that is NOT '/Off' — that key is the 'checked' export value.
    """
    try:
        xobj = doc.xref_object(widget.xref)
        keys = _re.findall(r'/([A-Za-z0-9_]+)\s+\d+ 0 R', xobj)
        on_key = next((k for k in keys if k != "Off"), None)
        return on_key or "Yes"
    except Exception:
        return "Yes"


def set_field(doc: fitz.Document, name: str, value: str | bool) -> None:
    """Set a named AcroForm field across all pages.

    For checkboxes: value True → 'On', False → 'Off'.
    For radio buttons: uses xref_set_key to write /V and /AS directly —
      widget.field_value does not reliably persist through save for radio buttons.
    For text fields: value is written directly.
    """
    for page in doc:
        for widget in page.widgets():
            if widget.field_name == name:
                if widget.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                    # DS-375 uses "On" (not "Yes") as the checkbox on-value
                    widget.field_value = "On" if value else "Off"
                    widget.text_color = (0, 0, 0)
                    widget.update()
                elif widget.field_type == fitz.PDF_WIDGET_TYPE_RADIOBUTTON:
                    # widget.field_value doesn't persist through garbage-collected saves;
                    # write /V and /AS directly into the xref dict instead.
                    if value:
                        on_key = _radio_on_value(doc, widget)
                        doc.xref_set_key(widget.xref, "V",  f"/{on_key}")
                        doc.xref_set_key(widget.xref, "AS", f"/{on_key}")
                    else:
                        doc.xref_set_key(widget.xref, "V",  "/Off")
                        doc.xref_set_key(widget.xref, "AS", "/Off")
                else:
                    widget.field_value = str(value) if value else ""
                    widget.text_color = (0, 0, 0)
                    widget.update()


def write_text_block(doc: fitz.Document, field_name: str, text: str,
                     fontsize: float = 8.0) -> None:
    """Fill a long-text AcroForm field — visible in all PDF viewers.

    Sets multiline flag + explicit font size, then calls widget.update()
    to force appearance-stream regeneration.
    """
    for page in doc:
        for w in page.widgets():
            if w.field_name == field_name:
                w.field_flags = (w.field_flags or 0) | (1 << 12)  # Multiline
                w.text_fontsize = fontsize
                w.text_color = (0, 0, 0)
                w.field_value = str(text) if text else ""
                w.update()


# ---------------------------------------------------------------------------
# Form fillers
# ---------------------------------------------------------------------------

def fill_ds3032(proj: dict, out_path: Path) -> None:
    """Fill DS-3032 General Application — Building Permit."""
    src = BLANK_DIR / "ds3032-blank.pdf"
    doc = fitz.open(str(src))

    set_field(doc, "Building", True)

    addr = proj["address"]
    set_field(doc, "Project Address Location Include Building or Suite No - Page 1", addr)
    set_field(doc, "Project Address Location Include Building or Suite No - Page 2", addr)
    set_field(doc, "Project Title", proj["title"])
    set_field(doc, "Project No For City Use Only - Page 1", proj.get("prj", ""))
    set_field(doc, "Project No For City Use Only - Page 2", proj.get("prj", ""))
    set_field(doc, "Assessors Parcel Number", proj.get("apn", ""))
    set_field(doc, "Legal Description Lot Block Subdivision Name Map Number",
              proj.get("legal_description", ""))
    write_text_block(doc, "Project Description", proj["scope"], fontsize=7.0)

    use_map = {
        "residential": "HouseDuplexTownhouse",
        "commercial":  "CommercialNonResidential",
        "mixed":       "CommercialNonResidential",
        "vacant":      "Vacant Land",
    }
    ex_use = use_map.get(proj.get("existing_use", "residential"), "HouseDuplexTownhouse")
    pr_use = use_map.get(proj.get("proposed_use", "residential"), "HouseDuplexTownhouse")
    set_field(doc, f"{ex_use} - existing use", True)
    set_field(doc, f"{pr_use} - proposed use", True)

    set_field(doc, "Property Owner Name", proj["owner_name"])
    set_field(doc, "Property Owner Telephone", proj.get("owner_phone", ""))
    set_field(doc, "Property Owner Address", proj["owner_address"])
    set_field(doc, "Property Owner City", proj["owner_city"])
    set_field(doc, "Property Owner State", proj["owner_state"])
    set_field(doc, "Property Owner Zip Code", proj["owner_zip"])
    set_field(doc, "Property Owner Email", proj["owner_email"])

    set_field(doc, "Authorized Agent of Property Owner", True)
    set_field(doc, "Applicant Name", proj["applicant_name"])
    set_field(doc, "Applicant Telephone", proj.get("applicant_phone", ""))
    set_field(doc, "Applicant Address", proj["owner_address"])
    set_field(doc, "Applicant City", proj["owner_city"])
    set_field(doc, "Applicant State", proj["owner_state"])
    set_field(doc, "Applicant Zip Code", proj["owner_zip"])
    set_field(doc, "Applicant Email", proj["applicant_email"])

    set_field(doc, "Permit Holder Name", proj["applicant_name"])
    set_field(doc, "Permit Holder Telephone", proj.get("applicant_phone", ""))
    set_field(doc, "Permit Holder Address", proj["owner_address"])
    set_field(doc, "Permit Holder City", proj["owner_city"])
    set_field(doc, "Permit Holder State", proj["owner_state"])
    set_field(doc, "Permit Holder Zip Code", proj["owner_zip"])
    set_field(doc, "Permit Holder Email", proj["applicant_email"])

    set_field(doc, "ArchitectCheckBox", False)
    set_field(doc, "EngineerCheckBox", True)
    set_field(doc, "Licensed Design Professional Name", proj["applicant_name"])
    set_field(doc, "Licensed Design Professional Telephone", proj.get("applicant_phone", ""))
    set_field(doc, "Licensed Design Professional Address", proj["owner_address"])
    set_field(doc, "Licensed Design Professional City", proj["owner_city"])
    set_field(doc, "Licensed Design Professional State", proj["owner_state"])
    set_field(doc, "Licensed Design Professional Zip Code", proj["owner_zip"])
    set_field(doc, "Licensed Design Professional Email", proj["applicant_email"])
    set_field(doc, "LicenseNo", proj.get("license_no", ""))

    set_field(doc, "List the year constructed for all buildings on the project site",
              proj.get("year_built_existing", ""))

    doc.save(str(out_path), garbage=4, deflate=True, clean=True)
    doc.close()
    try:
        label = out_path.relative_to(ROOT)
    except ValueError:
        label = out_path
    print(f"  Saved: {label}")


def fill_ds420(proj: dict, out_path: Path) -> None:
    """Fill DS-420 Property Owner Authorization / Letter of Agency."""
    src = BLANK_DIR / "ds420-blank.pdf"
    doc = fitz.open(str(src))

    set_field(doc, "1 Project Title Carrier Name Project Name Do not use carrier ID numbers be descriptive",
              proj["title"])
    set_field(doc, "2 Project Address", proj["address"])
    set_field(doc, "Project No For City Use Only", proj.get("prj", ""))

    set_field(doc, "Printed Name", proj["owner_name"])
    set_field(doc, "Title", proj.get("applicant_title", "Property Owner"))
    set_field(doc, "Date", "")

    doc.save(str(out_path), garbage=4, deflate=True, clean=True)
    doc.close()
    try:
        label = out_path.relative_to(ROOT)
    except ValueError:
        label = out_path
    print(f"  Saved: {label}")


def fill_ds375(proj: dict, out_path: Path) -> None:
    """Fill DS-375 Preliminary Review Questionnaire."""
    src = BLANK_DIR / "ds375-blank.pdf"
    doc = fitz.open(str(src))

    name = proj["applicant_name"]
    company = proj.get("applicant_company", "")
    label = name if (not company or company == name) else f"{name} - {company}"
    set_field(doc, "Applicant Name", label)
    set_field(doc, "Project Address", proj["address"])
    write_text_block(doc, "Project Scope", proj["scope"], fontsize=7.0)
    write_text_block(doc, "Policy Questions", proj.get("ds375_policy_questions", ""),
                     fontsize=6.5)

    set_field(doc, "Water", True)
    set_field(doc, "Wastewater", True)

    set_field(doc, "Community Planning Area", proj.get("community_plan", ""))
    set_field(doc, "Base Zone", proj.get("base_zone", ""))
    set_field(doc, "Existing",   proj.get("existing_construction_type", ""))
    set_field(doc, "Proposed",   proj.get("proposed_construction_type", ""))
    set_field(doc, "Existing_2", proj.get("existing_occupancy", ""))
    set_field(doc, "Proposed_2", proj.get("proposed_occupancy", ""))
    set_field(doc, "Existing_3", proj.get("existing_sf", ""))
    set_field(doc, "Proposed_3", proj.get("proposed_sf", ""))

    is_sprinkled = proj.get("fire_sprinklers", False)
    set_field(doc, "sprinkled",     is_sprinkled)
    set_field(doc, "not sprinkled", not is_sprinkled)

    has_egress = proj.get("egress_analysis", False)
    set_field(doc, "egress analysis",    has_egress)
    set_field(doc, "no egress analysis", not has_egress)

    is_45 = proj.get("is_45_years", False)
    set_field(doc, "45 years old",     is_45)
    set_field(doc, "not 45 years old", not is_45)

    prev_graded = proj.get("previously_graded", False)
    set_field(doc, "previously graded",     prev_graded)
    set_field(doc, "not previously graded", not prev_graded)

    set_field(doc, "Earthwork Quantities",             proj.get("earthwork_quantities", ""))
    set_field(doc, "List any proposed public improvements", proj.get("public_improvements", ""))

    set_field(doc, "no community plan amendment", not proj.get("ds375_community_plan_amend", False))
    set_field(doc, "community plan amendment",        proj.get("ds375_community_plan_amend", False))

    is_historic = proj.get("ds375_historically_significant", False)
    set_field(doc, "historically significant",     is_historic)
    set_field(doc, "not historically significant", not is_historic)

    in_mhpa = proj.get("ds375_mhpa", False)
    set_field(doc, "MHPA a wetland area etc",    in_mhpa)
    set_field(doc, "no MHPA a wetland area etc", not in_mhpa)

    set_field(doc, "runoff",    proj.get("ds375_runoff", False))
    set_field(doc, "no runoff", not proj.get("ds375_runoff", False))

    set_field(doc, "rezone",    proj.get("ds375_rezone", False))
    set_field(doc, "no rezone", not proj.get("ds375_rezone", False))

    set_field(doc, "Proposed Parking Ratio",          proj.get("parking_ratio", ""))
    set_field(doc, "List any deviation or variance requests", proj.get("deviations", "None"))

    doc.save(str(out_path), garbage=4, deflate=True, clean=True)
    doc.close()
    try:
        label = out_path.relative_to(ROOT)
    except ValueError:
        label = out_path
    print(f"  Saved: {label}")


FILLERS: dict[str, tuple] = {
    "ds3032": (fill_ds3032, "ds3032-building-permit-app.pdf"),
    "ds420":  (fill_ds420,  "ds420-owner-authorization.pdf"),
    "ds375":  (fill_ds375,  "ds375-preliminary-review.pdf"),
}


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def fill_project(site_id: str) -> None:
    proj = load_site(site_id)
    out_dir = PROJECT_BOOK / site_id
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n[{site_id}]")
    for form_key in proj.get("forms", []):
        filler, fname = FILLERS[form_key]
        out_path = out_dir / fname
        filler(proj, out_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Fill DSD PDF forms from data/sites/.")
    parser.add_argument("--project", help="Single project site_id to fill (default: all)")
    args = parser.parse_args()

    if args.project:
        targets = [args.project]
    else:
        targets = sorted(
            d.name for d in SITES_DIR.iterdir()
            if d.is_dir() and (d / "site_data.json").exists()
        )
        if not targets:
            print(f"No site_data.json files found under {SITES_DIR.relative_to(ROOT)}")
            return

    for pid in targets:
        try:
            fill_project(pid)
        except FileNotFoundError as exc:
            print(f"  ERROR: {exc}")

    print("\nDone.")


if __name__ == "__main__":
    main()
