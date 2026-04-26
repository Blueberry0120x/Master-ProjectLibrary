# WMF Field Label Map
# Source: Parsed from sandiego.seamlessdocs.com/f/wmf_acknowledgements
# Form ID: CO21111000291242771 | PDF ID: CO21111000291242765

## Section 1 - Responsible Party / Contact Info (RPCI)

| aria-label | Field Name | Required | Notes |
|---|---|---|---|
| RPCI Name Text Box | Applicant Full Name | YES | |
| RPCI Title Text Box | Applicant Title | YES | |
| RPCI Company Text Box | Company Name | YES | |
| RPCI Address Text Box | Mailing Address | YES | |
| RPCI City Text Box | City | YES | |
| RPCI State Zip Text Box | State + ZIP | YES | Format: CA XXXXX |
| RPCI Phone Text Box | Phone | YES | Format: XXX-XXX-XXXX |
| RPCI Email Text Box | Email | YES | validated format |

## Section 2 - Project Info

| aria-label | Field Name | Required | Notes |
|---|---|---|---|
| Approval/Permit No Text Box | PMT Number | YES | Omit "PMT-" prefix. Tooltip: "Do not enter PMT-, only the permit number." |
| Project Number Text Box | PRJ Number | YES | Omit "PRJ-" prefix. Tooltip: "Do NOT enter PRJ-, only the project number." |
| Project Title Text Box | Project Title | YES | |
| Project Address Text Box | Project Street Address | YES | |
| Project Zip Text Box | Project ZIP | YES | Format: XXXXX |
| Project Type (radio) | New Construction / Addition-Alteration / Demolition | YES | Select one |
| Building Type (radio) | Commercial / Residential | YES | Select one |
| Estimated Square Feet Text Box | Estimated SF | YES | |

## Section 3 - Debris Table

Each material row has 5 inputs (columns A, B, C, Hauler, Destination).
Column C is auto-calculated: C = A + B

| Form Material Label | A Column | B Column | C Column | Notes |
|---|---|---|---|---|
| Asphalt Concrete | Recycle | Trash | Auto-sum | Only if existing AC demo |
| Brick Masonry Tile | Recycle | Trash | Auto-sum | |
| Cabinets Doors | Recycle | Trash | Auto-sum | "circle all that apply" |
| Cardboard | Recycle | Trash | Auto-sum | |
| Carpet Padding Foam | Recycle | Trash | Auto-sum | |
| Ceiling Tile | Recycle | Trash | Auto-sum | acoustic |
| Dirt | Recycle | Trash | Auto-sum | |
| Drywall | Recycle | Trash | Auto-sum | |
| Landscape Debris | Recycle | Trash | Auto-sum | |
| Mixed C&D Debris | Recycle | Trash | Auto-sum | BOLD in form |
| Mixed Inerts | Recycle | Trash | Auto-sum | |
| Roofing Materials | Recycle | Trash | Auto-sum | |
| Scrap Metal | Recycle | Trash | Auto-sum | |
| Stucco | Recycle | Trash | Auto-sum | |
| Unpainted Wood & Pallets | Recycle | Trash | Auto-sum | |
| Garbage / Trash | (gray - no recycle) | Trash | Auto-sum | Col A locked/gray |
| Other | Recycle | Trash | Auto-sum | Includes text label field |

TOTAL row: auto-calculated by form.

## Section 4 - Acknowledgments

4 checkboxes + signature field + date (auto-populated).
Signer role: "Applicant"
