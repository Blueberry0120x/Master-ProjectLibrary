# California Regulations Master Library

AI-assisted plan-check reference for California permit submittals. Covers statewide
California codes (Title 24) and jurisdiction-specific requirements for City of San Diego,
San Diego County, Orange County unincorporated, Chula Vista, Garden Grove, Santa Ana,
and Escondido.

**Code cycle baseline:** 2022 California codes (CBC/CRC/CPC/CMC/CEC/CALGreen/CFC)
as locally amended. **2025 cycle effective Jan 1, 2026** — projects submitted on/after
that date must comply with the new cycle.

**Active project:** 7201 Garden Grove Blvd, STE A, San Diego 92841 — PRJ 1142530, detached ADU,
2-story, 1,200 sf, wood-frame, stucco. See `san-diego-city/` files.

---

## Structure

```
knowledge/
  _shared/                          ← Statewide California codes (all jurisdictions)
  san-diego-city/                   ← City of San Diego (DSD)
  san-diego-county/                 ← San Diego County (PDS)
  orange-county/                    ← OC unincorporated (OCDS)
  chula-vista/                      ← City of Chula Vista
  garden-grove/                     ← City of Garden Grove (OC)
  santa-ana/                        ← City of Santa Ana (OC)
  escondido/                        ← City of Escondido (SD County)
```

---

## Statewide (`_shared/`)

| File | Scope |
|------|-------|
| [california-codes-overview.md](_shared/california-codes-overview.md) | Title 24 structure, 12 Parts, code cycles, how to cite |
| [cbc-occupancy-and-construction-types.md](_shared/cbc-occupancy-and-construction-types.md) | CBC Ch 3 occupancy groups, Ch 6 construction types, mixed |
| [cbc-fire-and-materials.md](_shared/cbc-fire-and-materials.md) | CBC fire-resistance, materials, exterior walls, openings |
| [accessibility-cbc-11a-11b.md](_shared/accessibility-cbc-11a-11b.md) | CBC Ch 11A (residential) + 11B (public), HCD/DSA-AC roles |
| [calgreen.md](_shared/calgreen.md) | CALGreen Part 11 — mandatory + Tier 1/2, residential/nonres |
| [title24-energy.md](_shared/title24-energy.md) | Part 6 energy code — CEC standards, HERS, PV, reach codes |
| [statewide-adu-law.md](_shared/statewide-adu-law.md) | Gov Code 65852.2 ADU law, ministerial approval, SB 9 |
| [stormwater-construction.md](_shared/stormwater-construction.md) | NPDES CGP, SWPPP, Construction General Permit |

---

## City of San Diego (`san-diego-city/`)

| File | Scope |
|------|-------|
| [README.md](san-diego-city/README.md) | Agency contacts, portals, code refs, gotchas |
| [zoning-development-standards.md](san-diego-city/zoning-development-standards.md) | Zones, setbacks, FAR, height, parking, overlays |
| [permits-and-submittals.md](san-diego-city/permits-and-submittals.md) | OpenDSD workflow, required exhibits, IB list |
| [forms-index.md](san-diego-city/forms-index.md) | All DSD forms, IB references, SeamlessDocs links |
| [fire-code-local-amendments.md](san-diego-city/fire-code-local-amendments.md) | SDFD access, defensible space, WUI, alarms |
| [stormwater-and-grading.md](san-diego-city/stormwater-and-grading.md) | PDP thresholds, BMP design manual, WPCP/SWPPP |
| [adu-and-sb9.md](san-diego-city/adu-and-sb9.md) | ADU/JADU (SDMC 141.0302), IB-400, SB 9 |
| [waste-and-calgreen.md](san-diego-city/waste-and-calgreen.md) | WMF, C&D ordinance, CALGreen, 65% diversion |
| [energy-and-title24.md](san-diego-city/energy-and-title24.md) | CAP reach code, PV/ESS, heat-pump water heaters |
| [preliminary-review-ds375.md](san-diego-city/preliminary-review-ds375.md) | DS-375 pre-app workflow, 10-question cap, audit pattern |

---

## San Diego County (`san-diego-county/`)

| File | Scope |
|------|-------|
| [README.md](san-diego-county/README.md) | PDS contacts, portals, code refs |
| [zoning-and-land-use.md](san-diego-county/zoning-and-land-use.md) | Zoning Ordinance, RVS/A70/A72/S92, lot coverage |
| [permits-and-submittals.md](san-diego-county/permits-and-submittals.md) | PDS workflow, PDS portfolios, fast-track |
| [forms-index.md](san-diego-county/forms-index.md) | All PDS forms and permit types |
| [adu-and-sb9.md](san-diego-county/adu-and-sb9.md) | ADU/JADU county rules (state floor), SB 9 |
| [calgreen-and-energy.md](san-diego-county/calgreen-and-energy.md) | CALGreen, reach code, WMF equivalent |
| [fire-and-wildfire.md](san-diego-county/fire-and-wildfire.md) | County Fire, WUI, defensible space |
| [grading-drainage-stormwater.md](san-diego-county/grading-drainage-stormwater.md) | WPO, stormwater ordinance, grading permits |

---

## Orange County Unincorporated (`orange-county/`)

| File | Scope |
|------|-------|
| [README.md](orange-county/README.md) | OCDS contacts, portals, code refs |
| [zoning-unincorporated.md](orange-county/zoning-unincorporated.md) | OC Zoning Code Title 7, use classifications |
| [permits-and-submittals.md](orange-county/permits-and-submittals.md) | OCDS workflow, ePlans |
| [forms-index.md](orange-county/forms-index.md) | OCDS forms and checklists |
| [adu-and-sb9.md](orange-county/adu-and-sb9.md) | ADU/JADU OC rules |
| [calgreen-energy.md](orange-county/calgreen-energy.md) | CALGreen + OC energy |
| [fire-ocfa.md](orange-county/fire-ocfa.md) | OCFA fire review, WUI, sprinklers |
| [stormwater-wqmp.md](orange-county/stormwater-wqmp.md) | WQMP, DAMP, Low Impact Development |

---

## City of Chula Vista (`chula-vista/`)

| File | Scope |
|------|-------|
| [README.md](chula-vista/README.md) | Contacts, portals, code refs |
| [zoning-and-development-standards.md](chula-vista/zoning-and-development-standards.md) | CVMC Title 19, zones, setbacks |
| [permits-and-submittals.md](chula-vista/permits-and-submittals.md) | Chula Vista permit workflow |
| [forms-index.md](chula-vista/forms-index.md) | CV forms and checklists |
| [adu-and-sb9.md](chula-vista/adu-and-sb9.md) | ADU/JADU (CVMC 19.58.022) |
| [calgreen-energy.md](chula-vista/calgreen-energy.md) | CALGreen, CAP reach code |
| [fire-cvfd.md](chula-vista/fire-cvfd.md) | CVFD fire review |
| [stormwater-grading.md](chula-vista/stormwater-grading.md) | Stormwater, grading |

---

## City of Garden Grove (`garden-grove/`)

| File | Scope |
|------|-------|
| [README.md](garden-grove/README.md) | Agency contacts, portals, code refs |
| [zoning-and-development-standards.md](garden-grove/zoning-and-development-standards.md) | GGMC zoning, setbacks, FAR, parking |
| [permits-and-submittals.md](garden-grove/permits-and-submittals.md) | Building Division workflow, required exhibits |
| [forms-index.md](garden-grove/forms-index.md) | All GG forms and checklists |
| [adu-and-sb9.md](garden-grove/adu-and-sb9.md) | ADU/JADU Garden Grove rules |
| [calgreen-energy.md](garden-grove/calgreen-energy.md) | CALGreen, energy, reach code |
| [fire-ggfd.md](garden-grove/fire-ggfd.md) | GGFD fire review, sprinklers |
| [stormwater-grading.md](garden-grove/stormwater-grading.md) | NPDES, WQMP, OC stormwater |

---

## City of Santa Ana (`santa-ana/`)

| File | Scope |
|------|-------|
| [README.md](santa-ana/README.md) | Agency contacts, portals, code refs |
| [zoning-and-development-standards.md](santa-ana/zoning-and-development-standards.md) | SAMC zoning, setbacks, overlay districts |
| [permits-and-submittals.md](santa-ana/permits-and-submittals.md) | Building Safety workflow, required exhibits |
| [forms-index.md](santa-ana/forms-index.md) | All SA forms and checklists |
| [adu-and-sb9.md](santa-ana/adu-and-sb9.md) | ADU/JADU Santa Ana rules |
| [calgreen-energy.md](santa-ana/calgreen-energy.md) | CALGreen, energy, reach code |
| [fire-safd.md](santa-ana/fire-safd.md) | SAFD fire review |
| [stormwater-grading.md](santa-ana/stormwater-grading.md) | NPDES, WQMP, OC stormwater |

---

## City of Escondido (`escondido/`)

| File | Scope |
|------|-------|
| [README.md](escondido/README.md) | Agency contacts, portals, code refs |
| [zoning-and-development-standards.md](escondido/zoning-and-development-standards.md) | EMC Title 33 zoning, setbacks, hillside |
| [permits-and-submittals.md](escondido/permits-and-submittals.md) | Building Division workflow, required exhibits |
| [forms-index.md](escondido/forms-index.md) | All Escondido forms and checklists |
| [adu-and-sb9.md](escondido/adu-and-sb9.md) | ADU/JADU Escondido rules |
| [calgreen-energy.md](escondido/calgreen-energy.md) | CALGreen, energy, reach code |
| [fire-efd.md](escondido/fire-efd.md) | EFD fire review, WUI |
| [stormwater-grading.md](escondido/stormwater-grading.md) | Stormwater, grading, hillside |

---

## Multi-Persona Review Checklists (`_checklists/`)

| File | Scope |
|------|-------|
| [pre-submittal-audit.md](_checklists/pre-submittal-audit.md) | Full pre-submittal audit across all disciplines |
| [correction-response-checklist.md](_checklists/correction-response-checklist.md) | Responding to plan check corrections |
| [adu-fast-track-checklist.md](_checklists/adu-fast-track-checklist.md) | ADU-specific fast-track readiness |
| [calgreen-compliance-checklist.md](_checklists/calgreen-compliance-checklist.md) | CALGreen mandatory measures checklist |

---

## How to Use This Library

1. **Start with `_shared/`** for statewide code questions (occupancy, construction type, ADU law).
2. **Go to the jurisdiction folder** for local amendments, portals, and forms.
3. **Use `forms-index.md`** in each jurisdiction to find the exact form and where to submit.
4. **Use `_checklists/`** before any submittal or resubmittal.
5. **Cross-reference `preliminary-review-ds375.md`** for City of San Diego pre-app questions.
