"""
WMF Agent - City of San Diego Waste Management Form Filler
Reads an uploaded HTML form, maps fields, outputs completed field table.

Usage:
  python wmf_agent.py --form path/to/form.html
  python wmf_agent.py --form path/to/form.html --output outputs/wmf_filled.md
"""
from __future__ import annotations

import json
import argparse
import sys
from pathlib import Path

AGENTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = AGENTS_DIR.parent.parent
DATA_DIR = REPO_ROOT / "data"
OUTPUT_DIR = REPO_ROOT / "output"

# Import calc module from same agents/ folder
sys.path.insert(0, str(AGENTS_DIR))
from calgreen_calc import run as calc_debris


def load_project() -> dict:
    return json.loads((DATA_DIR / "project_info.json").read_text(encoding="utf-8"))


# Canonical WMF field map: aria-label -> semantic name
# Derived from parsing sandiego.seamlessdocs.com/f/wmf_acknowledgements
WMF_FIELD_MAP = {
    # Responsible Party / Contact Info
    'RPCI Name Text Box':    'applicant_name',
    'RPCI Title Text Box':   'applicant_title',
    'RPCI Company Text Box': 'applicant_company',
    'RPCI Address Text Box': 'applicant_address',
    'RPCI City Text Box':    'applicant_city',
    'RPCI State Zip Text Box': 'applicant_state_zip',
    'RPCI Phone Text Box':   'applicant_phone',
    'RPCI Email Text Box':   'applicant_email',
    # Project Info
    'Approval/Permit No Text Box': 'permit_number',
    'Project Number Text Box':     'project_number',
    'Project Title Text Box':      'project_title',
    'Project Address Text Box':    'project_address',
    'Project Zip Text Box':        'project_zip',
    # Radios
    'New Construction': 'project_type',
    'Addition/Alteration': 'project_type',
    'Demolition': 'project_type',
    'Commercial': 'building_type',
    'Residential': 'building_type',
    'Estimated Square Feet Text Box': 'estimated_sf',
}

# Debris row field suffixes (A=recycle, B=trash, C=total, Hauler, Destination)
DEBRIS_MATERIALS_ORDER = [
    'Asphalt Concrete',
    'Brick Masonry Tile',
    'Cabinets Doors',
    'Cardboard',
    'Carpet Padding Foam',
    'Ceiling Tile',
    'Dirt',
    'Drywall',
    'Landscape Debris',
    'Mixed C&D',
    'Mixed Inerts',
    'Roofing Materials',
    'Scrap Metal',
    'Stucco',
    'Wood Pallets',
    'Garbage',
    'Other',
]

# Map form material names to debris_factors.json keys
MATERIAL_KEY_MAP = {
    'Asphalt Concrete':  'Asphalt & Concrete',
    'Brick Masonry Tile': 'Brick / Masonry / Tile',
    'Cabinets Doors':    'Cabinets, Doors, Fixtures, Windows',
    'Cardboard':         'Cardboard',
    'Carpet Padding Foam': 'Carpet, Padding / Foam',
    'Ceiling Tile':      'Ceiling Tile (acoustic)',
    'Dirt':              'Dirt',
    'Drywall':           'Drywall',
    'Landscape Debris':  'Landscape Debris',
    'Mixed C&D':         'Mixed C&D Debris',
    'Mixed Inerts':      'Mixed Inerts',
    'Roofing Materials': 'Roofing Materials',
    'Scrap Metal':       'Scrap Metal',
    'Stucco':            'Stucco',
    'Wood Pallets':      'Unpainted Wood & Pallets',
    'Garbage':           'Garbage / Trash',
    'Other':             'Other',
}


def get_field_values(project):
    """Map project_info.json to WMF fields."""
    p = project['project']
    b = project['building']
    a = project['applicant']

    pmt = p.get('pmt_number') or '[NOT YET ISSUED - leave blank or use PRJ number]'
    prj = p.get('prj_number', '')

    return {
        'applicant_name':    a.get('name', ''),
        'applicant_title':   a.get('title', ''),
        'applicant_company': a.get('company', '[Your LLC name]'),
        'applicant_address': '[Your mailing address]',
        'applicant_city':    '[City]',
        'applicant_state_zip': f"CA [ZIP]",
        'applicant_phone':   a.get('phone', '[Your phone]'),
        'applicant_email':   a.get('email', '[Your email]'),
        'permit_number':     pmt,
        'project_number':    prj,
        'project_title':     p.get('name', ''),
        'project_address':   p.get('address', ''),
        'project_zip':       p.get('zip', ''),
        'project_type':      b.get('project_type', 'New Construction'),
        'building_type':     b.get('type', 'Residential'),
        'estimated_sf':      str(b.get('sf', '')),
    }


def build_output(project, debris_rows, total_a, total_b, total_c, diversion_pct):
    fv = get_field_values(project)
    lines = []
    lines.append("# WMF - Completed Field Values")
    lines.append("## City of San Diego Waste Management Form")
    lines.append(f"## Project: {fv['project_title']}\n")

    lines.append("---\n")
    lines.append("## SECTION 1: Responsible Party / Contact Info\n")
    lines.append(f"| Field | Value |")
    lines.append(f"|---|---|")
    lines.append(f"| Name | {fv['applicant_name']} |")
    lines.append(f"| Title | {fv['applicant_title']} |")
    lines.append(f"| Company | {fv['applicant_company']} |")
    lines.append(f"| Address | {fv['applicant_address']} |")
    lines.append(f"| City | {fv['applicant_city']} |")
    lines.append(f"| State / Zip | {fv['applicant_state_zip']} |")
    lines.append(f"| Phone | {fv['applicant_phone']} |")
    lines.append(f"| Email | {fv['applicant_email']} |\n")

    lines.append("---\n")
    lines.append("## SECTION 2: Project Info\n")
    lines.append(f"| Field | Value |")
    lines.append(f"|---|---|")
    lines.append(f"| Approval/Permit No | {fv['permit_number']} |")
    lines.append(f"| Project Number | {fv['project_number']} |")
    lines.append(f"| Project Title | {fv['project_title']} |")
    lines.append(f"| Project Address | {fv['project_address']} |")
    lines.append(f"| Project Zip | {fv['project_zip']} |")
    lines.append(f"| Project Type | {fv['project_type']} (select radio) |")
    lines.append(f"| Building Type | {fv['building_type']} (select radio) |")
    lines.append(f"| Estimated Square Feet | {fv['estimated_sf']} |\n")

    lines.append("---\n")
    lines.append("## SECTION 3: Debris Estimation Table\n")
    lines.append(
        f"| Material Type | A - Recycle (tons) | B - Trash (tons) | "
        f"C - Total (tons) | Hauler | Facility / Destination |"
    )
    lines.append("|---|---|---|---|---|---|")

    # Map debris_rows (keyed by debris_factors.json name) by form material name
    row_lookup = {r['material']: r for r in debris_rows}

    for form_mat in DEBRIS_MATERIALS_ORDER:
        key = MATERIAL_KEY_MAP[form_mat]
        row = row_lookup.get(key)
        if row is None or row['C'] == 0:
            lines.append(f"| {form_mat} | | | 0 | | |")
        else:
            a_str = f"{row['A']:.2f}" if row['A'] > 0 else ''
            b_str = f"{row['B']:.2f}" if row['B'] > 0 else ''
            lines.append(
                f"| {form_mat} | {a_str} | {b_str} | {row['C']:.2f} | "
                f"{row['hauler']} | {row['destination']} |"
            )

    lines.append(
        f"| **TOTAL** | **{total_a:.2f}** | **{total_b:.2f}** | "
        f"**{total_c:.2f}** | | |"
    )

    status = 'PASS' if diversion_pct >= 65.0 else '*** FAIL - MUST REVISE ***'
    lines.append(f"\n**Recycling Rate: ({total_a:.2f} / {total_c:.2f}) x 100 = {diversion_pct:.1f}% - {status}**")
    lines.append(f"(CALGreen requirement: >= 65% for permits issued after July 1, 2016)\n")

    lines.append("---\n")
    lines.append("## SECTION 4: Acknowledgments & Signature\n")
    lines.append("- [ ] Ack 1: Submit completed WMF")
    lines.append("- [ ] Ack 2: Pay refundable C&D Deposit")
    lines.append("- [ ] Ack 3: Divert C&D debris using certified facilities")
    lines.append("- [ ] Ack 4: Submit receipts within 180 days of final inspection")
    lines.append("\n**Signature:** Sign as Applicant")
    lines.append("**Date:** (auto-populated by form)\n")

    lines.append("---\n")
    lines.append("## NOTES\n")
    lines.append(f"- PMT number: If not yet issued, leave blank. DSD will assign at permit issuance.")
    lines.append(f"- Deposit is REFUNDABLE if weight receipts submitted within 180 days of final inspection.")
    lines.append(f"- One WMF per permit. If multiple permits exist on this project, file separately.")
    lines.append(f"- DSD contact: (619) 446-5000 | CALGreen questions: (619) 446-5003")
    lines.append(f"- Live form: https://sandiego.seamlessdocs.com/f/wmf_acknowledgements")

    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description='WMF Form Filler')
    parser.add_argument('--form', type=str, default=None, help='Path to WMF HTML form (optional)')
    parser.add_argument('--output', type=str, default=None, help='Output markdown path')
    args = parser.parse_args()

    project = load_project()
    b = project['building']

    print(f"\n[WMF Agent] Generating completed form for: {project['project']['name']}")
    print(f"[WMF Agent] Running CALGreen debris estimate...\n")

    debris_rows, total_a, total_b, total_c, diversion_pct = calc_debris(
        sf=b['sf'],
        stories=b['stories'],
        finish=b['exterior_finish']
    )

    output_md = build_output(project, debris_rows, total_a, total_b, total_c, diversion_pct)

    if args.output:
        out_path = Path(args.output)
    else:
        out_path = OUTPUT_DIR / "wmf_filled.md"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output_md, encoding="utf-8")

    print(f"\n[WMF Agent] Output written to: {out_path}")
    print("\n" + output_md)


if __name__ == '__main__':
    main()
