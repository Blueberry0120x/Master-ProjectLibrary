# Zoning & Development Standards — City of San Diego

Primary code: **SDMC Chapter 13 (Zones)** + **Chapter 14 (General Regulations)**.
Zoning map: https://www.sandiego.gov/development-services/zoning +
https://maps.sandiego.gov (Zoning & Parcel Information).

## Base zone categories

| Family | Typical zones | Where used |
|--------|---------------|------------|
| Residential — Single Dwelling | RS-1-1 … RS-1-14 | Detached SFD. Numerical suffix = min lot size tier (1 = largest, 14 = smallest) |
| Residential — Two/Multi | RM-1-1, RM-1-2, RM-1-3, RM-2-4, RM-2-5, RM-2-6, RM-3-7, RM-3-8, RM-3-9, RM-4-10, RM-4-11, RM-5-12 | Duplex, townhomes, apartments. Higher trailing digit = greater density |
| Residential — Mixed | RX-1-1, RX-1-2 | Small-lot infill, row house |
| Residential — Rural/Estate | RE-1-1 (older), RT (townhouse) | Limited |
| Commercial | CC-*, CN-*, CR-*, CV-*, CO-* | Community Commercial, Neighborhood Commercial, Regional Commercial, Visitor, Office |
| Mixed-Use | handled via Complete Communities overlay & MU subdistricts of CC/CN | TPA corridors |
| Industrial | IP-*, IL-*, IH-*, IS-* | Park, Light, Heavy, Small-lot |
| Open Space / Ag | OC-*, OR-*, OP-*, AR-*, AG-* | Preserves, parks, ag |
| Planned Districts | Barrio Logan PDO, Mid-City PDO, Centre City PDO (Downtown), Mission Valley, La Jolla, etc. | Override base zone per Chapter 15 |

RS zone suffix is a **minimum lot size tier**, not a numeric dimension. Rough
translation (typical — verify Table 131-04B/C in SDMC Ch 13 Art 1 Div 4):

| Zone | Min lot (sf) | Min lot width |
|------|--------------|---------------|
| RS-1-1 | 40,000 | 100 ft |
| RS-1-2 | 20,000 | 80 ft |
| RS-1-3 | 15,000 | 70 ft |
| RS-1-4 | 10,000 | 65 ft |
| RS-1-5 | 8,000 | 60 ft |
| RS-1-6 | 6,000 | 55 ft |
| RS-1-7 | 5,000 | 50 ft |
| RS-1-8 | 5,000 | 50 ft (hillside variant) |
| RS-1-9 | 4,000 | 40 ft |
| RS-1-10 | 3,500 | 35 ft |
| RS-1-11 | 3,000 | 30 ft |
| RS-1-12 | 2,500 | 25 ft |
| RS-1-13 | 1,500 | 15 ft |
| RS-1-14 | 1,000 | 15 ft |

## Setback, height, FAR, coverage — common SFD zones

Reference tables 131-04C through 131-04J. Verify current values in the
**March 2026 supplement** of Ch 13 Art 1 Div 4 before citing.

| Zone | Front setback | Street side | Interior side | Rear | Max height* | Max FAR (5,000 sf lot) | Max lot coverage |
|------|---------------|-------------|---------------|------|-------------|------------------------|------------------|
| RS-1-2 | 25 ft | 10 ft | 10 ft | 25 ft | 30 ft | ~0.45 | 40% |
| RS-1-4 | 20 ft | 10 ft | 8 ft | 20 ft | 30 ft | ~0.50 | 45% |
| RS-1-7 | 15 ft | 10 ft | 5 ft (or 10% lot width, whichever greater) | 15 ft | 30 ft | **0.60** (4,001–5,000 sf) / 0.59 (5,001–6,000 sf) | 50% |
| RS-1-10 | 10 ft | 10 ft | 4 ft | 10 ft | 30 ft | ~0.70 | 55% |
| RS-1-14 | 0–10 ft | 5 ft | 0–4 ft | 5–10 ft | 30 ft | 1.0+ | 60%+ |

\* Structural height is measured per **SDMC 113.0270** from the lower of existing
or finished grade to the highest structural element. Architectural projections
(chimneys, vents, parapets ≤ 42", solar panels, elevator over-runs) can extend
above the 30-ft limit under **SDMC 131.0461** subject to listed limits.

### RS side setback rule (lots > 50 ft wide)
For RS-1-3 through RS-1-7, interior side = greater of Table value OR 10% of
lot width. (Source: SDMC 131.0446.)

### 5552 Redwood reference
Likely zone **RS-1-7** (standard Mid-City infill 5,000 sf lot).
- FAR limit (primary + ADU) ≈ 0.60 × lot area — e.g., 3,000 sf on a 5,000 sf
  lot. ADU SF does **not** count toward FAR if ≤ 1,200 sf (state ADU
  preemption; City implements via IB-400).
- Height: 30 ft structural; 2-story OK. ADU limited to 2-story / 25 ft if
  attached, 18 ft detached near transit (see `adu-and-sb9.md`).

## RM (multifamily) density

Density = lot area ÷ dwelling-unit factor:

| Zone | DU factor (sf per DU) | Example — 7,000 sf lot |
|------|-----------------------|------------------------|
| RM-1-1 | 3,000 | 2 DU |
| RM-1-2 | 2,500 | 2 DU |
| RM-1-3 | 1,750 | 4 DU |
| RM-2-4 | 1,500 | 4 DU |
| RM-2-5 | 1,250 | 5 DU |
| RM-2-6 | 800 | 8 DU |
| RM-3-7 | 600 | 11 DU |
| RM-3-8 | 400 | 17 DU |
| RM-3-9 | 200 | 35 DU |
| RM-4-10 | 150 | 46 DU |
| RM-5-12 | 100 | 70 DU |

Actual yields vary by setbacks and Complete Communities / AHDB bonuses.

## Floor Area Ratio (FAR) — what counts

FAR = Gross Floor Area ÷ Lot Area.

**Excluded from GFA** (SDMC 113.0234 + 131.0446):
- Basements with ≥ 50% below grade
- Required covered parking (typically first 400 sf per DU)
- Unenclosed porches, balconies, decks ≤ 40% wall enclosure
- Attic with ≤ 5 ft ceiling where sloped
- ADU up to 1,200 sf (state preemption — Gov Code 65852.2(a)(1)(D) + SDMC 141.0302; cities may not use FAR to deny an otherwise compliant ADU)

## Overlays that modify base zone

| Overlay | Effect | Source |
|---------|--------|--------|
| **Coastal Overlay Zone** | 30 ft citywide height cap; **26-ft/28-ft gabled cap** in Proposition D "coastal height limit zone" (most of beach communities west of I-5); CDP required | SDMC Ch 13 Art 2 Div 4; Prop D (1972) |
| **Airport Influence / ALUCP** | Height restricted by FAR Part 77 surfaces + noise/safety zones; AIA review for Montgomery, Brown, Miramar, SDIA | SDMC 132.1509 |
| **Transit Priority Area (TPA)** | ≤ 0.5 mi of major transit stop; eliminates parking minimums for multifamily; unlocks Complete Communities, Bonus ADU, 18-ft ADU height | SDMC 132.0403; AB 2097 (state) |
| **Sustainable Development Area (SDA)** | CAP implementation overlay; requires mode-shift & electrification measures | Climate Action Plan 2022 update |
| **Parking Impact / Beach Impact Area (PIA/BIA)** | Adds parking requirements in impacted neighborhoods | SDMC 142.0525 |
| **Hillside / Steep Slopes** | ESL regs, grading caps, reduced FAR on slopes ≥ 25% | SDMC 143.0110 |
| **Sensitive Biological / MHPA** | Habitat-based dev restrictions | MSCP Subarea Plan |
| **Brush Management Zone (BMZ)** | 100 ft defensible space; Zone 1 (35 ft) + Zone 2 (65 ft) | SDMC 142.0412 |
| **Historic / Potentially Historic** | ≥ 45-yr structures require Historical Resources review | SDMC 143.0200 |

## Parking standards (post-2019 reform)

- **Ordinance O-21057 (Mar 2019)**: eliminated minimum parking for
  multifamily/mixed-use in TPAs; added **parking maximums** (typically 1 space/DU
  in urban core) and unbundled parking requirements.
- **Ordinance O-21041 (Jan 16, 2022)**: extended elimination to most
  commercial/retail uses in TPAs citywide.
- **AB 2097 (2022 state law)**: pre-empts local parking minimums within
  ½-mile of major transit stops.
- **SFD baseline**: 2 covered spaces; 1 in some small-lot RS/RX zones.
- **ADU parking (SDMC 141.0302(b)(4))**:
  - **0 spaces** if (a) within ½-mile walking of transit, (b) in historic
    district, (c) converted from existing space, (d) in TPA, (e) on-street
    permit district prohibiting new residential permits, or (f) within one
    block of car-share.
  - Otherwise **1 space** per unit (tandem, driveway, or setback OK).
  - Replacement parking **not** required when converting a garage to ADU.

See **SDMC Ch 14 Art 2 Div 5** (parking) for full matrix.

## Complete Communities — Housing Solutions (SDMC Ch 14 Art 3 Div 10)

Optional, opt-in bonus track for multifamily in TPAs:
- Tier-based bonus FAR / height / density in exchange for deed-restricted
  affordable units and neighborhood enhancements.
- Reference: **IB-411 Complete Communities Housing Solutions**.
- Stacks on top of state Affordable Housing Density Bonus where eligible.

## Affordable Housing Density Bonus (AHDB) — SDMC Ch 14 Art 3 Div 7

- Implements state Gov Code 65915 with local menu of concessions/waivers.
- Bonus tiers scale with affordable percentage. Key thresholds (Gov Code 65915 as
  amended by AB 2345/2020 + AB 2334/2022):
  - 15% LI or 8% VLI → ~22.5% bonus
  - 24% VLI → **50% bonus** (maximum standard-project tier)
  - 100% affordable (all VLI/LI) → **80% bonus**
- Always run the actual density-bonus calculation — "50% for 15% LI" is a common
  misstatement; 15% LI only yields ~22.5%.
- Parking waivers, height/FAR concessions.

## Brush Management Zones (BMZ) — SDMC 142.0412

| Zone | Distance from structure | Treatment |
|------|--------------------------|-----------|
| Zone 1 | 0–35 ft | Irrigated / thinned; no ornamental flammables; 3× vertical:horizontal spacing tree canopy |
| Zone 2 | 35–100 ft (or to property line) | Reduced fuel; 50% clearing; native vegetation permitted with thinning |

BMZ applies to parcels adjacent to **Very High Fire Hazard Severity Zone
(VHFHSZ)** mapping — see `fire-code-local-amendments.md`.

## Coastal height-limit quick reference

| Area | Max height |
|------|-----------|
| Coastal Overlay (general) | 30 ft |
| "Coastal Height Limit Zone" (Prop D) — west of I-5 from Pacific Beach south to 8th Ave incl. most beach communities | **30 ft** overall, **26 ft** to ridge where roof pitch < 3:12 (i.e., 30 ft only where gabled/sloped) |

Verify exact Prop D boundary at maps.sandiego.gov.

## References

- SDMC Chapter 13 (Zones): https://docs.sandiego.gov/municode/municodechapter13/ch13art01division04.pdf
- SDMC Chapter 14 (General Regulations): https://docs.sandiego.gov/municode/MuniCodeChapter14/
- Zoning Map Divisions overview: https://www.sandiego.gov/development-services/zoning/zoninginfo/zoninginfo130104
- Parking Reform: https://www.sandiego.gov/planning/programs/transportation/mobility/parking-reform
- TPA Parking Standards: https://www.sandiego.gov/planning/work/transportation/mobility/tpa
- SDMC 14-2-5 parking (3-2026 supplement): https://docs.sandiego.gov/municode/MuniCodeChapter14/Ch14Art02Division05.pdf
- Complete Communities IB-411: https://www.sandiego.gov/sites/default/files/ib-411_complete_communities_housing_solutions.pdf
- SDMC Ch 14 Art 3 Div 10 (CC Housing Solutions): https://docs.sandiego.gov/municode/MuniCodeChapter14/Ch14Art03Division10.pdf
- Steadily summary 2026: https://www.steadily.com/blog/residential-zoning-laws-regulations-san-diego
