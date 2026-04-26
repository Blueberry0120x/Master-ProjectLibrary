# San Diego Permit Reference Library

Drop zone for all City of San Diego (Development Services Dept.) permit forms
needed for residential / ADU / small infill building permits.

**Naming convention:** `NN-category_form-id_short-name.ext`
where `NN-category` is one of:

| Prefix | Category |
|---|---|
| `01-app`   | Application & intake |
| `02-owner` | Owner / applicant authorization |
| `03-storm` | Storm water / SWPPP / BMP |
| `04-waste` | Construction & demolition waste |
| `05-water` | Water / sewer |
| `06-photo` | Photographic / site survey |
| `07-zoning`| Zoning / land use |
| `08-struct`| Structural / engineering |
| `09-fire`  | Fire / safety |
| `10-env`   | Environmental / historical / MSCP |
| `11-calgn` | Accessibility / CalGreen / energy |

Files sort in submittal order without subfolders. Add new files using the
prefix that matches the category below.

**Main forms page:** https://www.sandiego.gov/development-services/forms-publications/forms
**Information Bulletins:** https://www.sandiego.gov/development-services/forms-publications/information-bulletins
**Fire Prevention forms:** https://www.sandiego.gov/fire/fireprev/forms

Items marked **verify** have correct form names/numbers but the exact PDF URL
should be confirmed from the forms page before download.

---

## 01-app — Application & Intake

| Form | Purpose | URL | Required? |
|---|---|---|---|
| DS-3032 General Application | Master application for all DSD permits | https://www.sandiego.gov/sites/default/files/legacy/development-services/pdf/industry/forms/ds3032.pdf | Required |
| DS-3032A Project Address/Location | Multi-APN supplement | https://www.sandiego.gov/sites/default/files/dsdds3032a.pdf | Conditional |
| DS-345 Project Contacts | Owner/architect/engineer/contractor contacts | verify | Required |
| DS-375 Preliminary Review Questionnaire | Optional pre-submittal staff review (IB-513) | https://www.sandiego.gov/sites/default/files/ds375.pdf | Optional (recommended) |
| DS-4107 Postentitlement Housing Declaration | AB-2234 housing streamlining | verify | Conditional |

## Site-specific fill-out workflow

**Blank templates live in this directory, one per city.** Site-specific filled
forms MUST be written to `Output/permits/{SiteLabel}/` — never checked in here.

Canonical DS-375 blank: `ds375-BLANK.pdf` (official City of San Diego AcroForm,
46 fillable fields, 7 pages).

To fill DS-375 for a given site, run:

```
py tools/fill_permits.py CA-4335_EUCLID CA-2921_ELCAJON
py tools/fill_permits.py --all-sandiego
```

The tool reads `data/sites/<site>.json`, maps site fields onto the blank
AcroForm, and writes `Output/permits/<SiteLabel>/01-app_DS-375.pdf`.

Fields intentionally left blank (require applicant judgment / not in site JSON):
Applicant Name, Project Scope (when JSON is empty), CBC construction-type
header text, Public Improvements, Deviations/Variances, Policy Questions,
Earthwork Quantities, Amendment/Historically Significant/Rezone text fields,
and ambiguous buttons (runoff, previously graded, egress analysis).

## 02-owner — Owner / Applicant Authorization

| Form | Purpose | URL | Required? |
|---|---|---|---|
| DS-3242 Financially Responsible Party / Deposit | Who pays deposits; owner signature | https://www.sandiego.gov/sites/default/files/ds3242.pdf | Required |
| DS-3042 Owner-Builder Verification | Owner acts as contractor | verify | Conditional |
| Owner authorization letter | Authorizes agent to submit | Part of DS-3032 signature block | If agent submits |

## 03-storm — Storm Water / SWPPP / BMP

| Form | Purpose | URL | Required? |
|---|---|---|---|
| DS-560 Storm Water Requirements Applicability Checklist | PDP vs. Standard Project (IB-560) | https://www.sandiego.gov/sites/default/files/ds560.pdf | Required (all permits) |
| DS-561 Construction BMP / Water Pollution Control Plan | Site-specific construction BMPs | verify | Most grading/new |
| DS-562 Standard Project Requirements | Non-PDP small projects | verify | Conditional |
| DS-563 PDP SWQMP | Full Storm Water Quality Management Plan | verify | PDP only |

## 04-waste — Construction & Demolition Waste

| Form | Purpose | URL | Required? |
|---|---|---|---|
| C&D Debris Deposit / Waste Management Form | 65%-by-weight diversion compliance | https://www.sandiego.gov/environmental-services/recycling/cd | Required (most permits) |
| IB-119 C&D Recycling Requirements | Reference bulletin | https://www.sandiego.gov/sites/default/files/legacy/environmental-services/recycling/pdf/cdbulletin119a.pdf | Reference |

## 05-water — Water / Sewer

| Form | Purpose | URL | Required? |
|---|---|---|---|
| DS-16 Water Meter Data Card | Meter sizing from fixture count | https://www.sandiego.gov/sites/default/files/legacy/development-services/pdf/industry/forms/ds016.pdf | Required (new/changed plumbing) |
| DS-16a Supplemental | Multi-meter projects | https://www.sandiego.gov/sites/default/files/dsdds16a.pdf | Conditional |
| Sewer capacity / reclaimed water | Handled via Public Utilities during plan check | verify | Conditional |

## 06-photo — Photographic / Site Survey

| Form | Purpose | URL | Required? |
|---|---|---|---|
| Photographic Survey + County Assessor Building Record | Historical screening (structures >=45 yrs) | https://www.sandiego.gov/sites/default/files/legacy/planning/programs/historical/pdf/surveyguidelines.pdf | If structure >=45 yrs |

## 07-zoning — Zoning / Land Use

| Form | Purpose | URL | Required? |
|---|---|---|---|
| Neighborhood Development Permit (NDP) | Uses DS-3032 + findings | verify | Discretionary only |
| Coastal Development Permit (CDP) | DS-3032 + coastal findings | verify | Coastal Overlay |
| DS-4106 ADU Coastal Agreement | SDMC 141.0302 ADU/JADU in coastal | https://www.sandiego.gov/sites/default/files/ds-4106.pdf | ADU + coastal |
| DS-202a JADU Agreement | Recorded covenant before JADU | https://www.sandiego.gov/sites/default/files/ds-202a.pdf | JADU only |
| DS-530 Affordable Housing Checklist | Inclusionary for 2+ unit | verify | >=2 units |

## 08-struct — Structural / Engineering

| Form | Purpose | URL | Required? |
|---|---|---|---|
| Special Inspection & Testing Agreement | CBC Ch. 17 inspections | verify (DS-120 series) | Per structural plans |
| Deferred Submittal Request | Trusses, solar, PV | verify | Conditional |
| Soils / Geotechnical Report | Signed/stamped per IB-515 | https://www.sandiego.gov/development-services/forms-publications/information-bulletins/515 | Hillsides, cuts/fills, new foundations |

## 09-fire — Fire / Safety

| Form | Purpose | URL | Required? |
|---|---|---|---|
| Fire Department forms index | Hydrant, fire-flow, sprinkler, HPS | https://www.sandiego.gov/fire/fireprev/forms | Conditional |
| DS-164 High-Piled Combustible Storage | Industrial/commercial HPS | verify | Conditional |
| DS-165 Hazardous Materials Reporting | Non-residential hazmat | verify | Non-residential |
| NFPA 13D Residential Sprinkler plans | Per CRC R313 | Via Fire Prevention forms page | Conditional |

## 10-env — Environmental / Historical / MSCP

| Form | Purpose | URL | Required? |
|---|---|---|---|
| CEQA Exemption / Initial Study | Ministerial ADUs exempt | verify | Discretionary only |
| Historical Resources Review (IB-580) | Structures >=45 yrs or designated | https://www.sandiego.gov/sites/default/files/dsdib580.pdf | Conditional |
| MSCP Biology Letter / MHPA review | Sites in/adjacent to MHPA | verify | MSCP/MHPA area |
| Brush Management Easement (DS-50 / DS-51) | Fire-prone hillsides | https://www.sandiego.gov/sites/default/files/legacy/development-services/pdf/industry/forms/ds050.pdf | Conditional |

## 11-calgn — Accessibility / CalGreen / Energy

| Form | Purpose | URL | Required? |
|---|---|---|---|
| Title 24 Part 6 Energy Compliance (CF1R) | CEC-generated, CEA-stamped | energy.ca.gov | Required (new/additions) |
| CalGreen (Title 24 Part 11) Checklist | Mandatory measures worksheet | verify (state template) | Required |
| DS-18 Reasonable Accommodations | Zoning relief for disability access | https://www.sandiego.gov/sites/default/files/legacy/development-services/pdf/industry/forms/ds018.pdf | Conditional |

---

## Key references

- Forms landing: https://www.sandiego.gov/development-services/forms-publications/forms
- Building permit checklist: https://www.sandiego.gov/development-services/permits/building-permit
- IB-400 ADU/JADU: https://www.sandiego.gov/development-services/forms-publications/information-bulletins/400
- C&D recycling: https://www.sandiego.gov/environmental-services/recycling/cd
- Fire Prevention forms: https://www.sandiego.gov/fire/fireprev/forms

Scouted 2026-04-17. Re-verify URLs before relying on them — City periodically
moves PDFs off `/legacy/` paths.
