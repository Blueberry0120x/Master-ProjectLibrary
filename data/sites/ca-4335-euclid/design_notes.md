# 4335 Euclid Ave — Design Notes
APN 471-271-16-00 · CUPD-CU-2-4 · Mid-City: City Heights · 6,250 SF lot (50 ft × 125 ft)

---

## Design Strategy: Stacked R-3 Unit Blocks via CBC 706 Fire Walls

Eliminate the shared corridor. Each fire-wall-separated block contains ≤2 dwelling units (one ground, one upper), each with its own private exterior entry. Each block = separate "building" per CBC 702 → Group R-3 per CBC 310.5 → CBC 903.2.8 (NFPA 13R) does not apply → NFPA 13D only (CRC R313 new construction).

### Block Layout
| Block | Ground Floor | Upper Floor | Notes |
|-------|-------------|-------------|-------|
| A | Unit 1 (~568 SF) | Unit 5 (~568 SF) | R-3 block |
| B | Unit 2 (~568 SF) | Unit 6 (~568 SF) | R-3 block |
| C | Unit 3 (~568 SF) | Unit 7 (~568 SF) | R-3 block |
| D | Unit 4 (~568 SF) | Unit 8 (~568 SF) | R-3 block |
| E (Comm) | 640 SF Group B | Unit 9 (~670 SF) | R-3 upper / B ground, CBC 508.4 separation |

**Total**: 9 residential units + 640 SF commercial. 4 fire walls (between 5 blocks).

---

## Party Wall / Fire Wall — CBC 706

### Code Path
| Requirement | Code Section | Value for Euclid (Type V-B) |
|---|---|---|
| Fire-resistance rating | CBC 706.4 | **2 hours** — tested per ASTM E119 / UL 263, rated from both sides |
| Structural independence | CBC 706.4 | Must remain standing if structure on either side collapses |
| Horizontal continuity | CBC 706.5 | Runs full building depth (front exterior wall to rear exterior wall) |
| Extension at exterior walls | CBC 706.5 | **≥ 18 in.** beyond face of exterior wall at each end |
| Vertical continuity | CBC 706.6 | Foundation slab/footing → through roof |
| Parapet (combustible roof) | CBC 706.6 | **≥ 30 in.** above adjacent roof surface (both sides) |
| Parapet exception | CBC 706.6 Ex.1 | Terminate at underside of roof deck if: (1) no openings in roof within 4 ft of wall, (2) Class B min. roof covering, (3) FRT sheathing 4 ft each side OR 5/8 in. Type X GWB directly under deck 4 ft each side |
| Openings | CBC 706.8 | None permitted in fire wall between R-3 units |
| Through penetrations | CBC 706.11 | UL-listed through-penetration firestop assemblies required at every pipe/duct/conduit crossing |

> **CRC R302.2.2 cross-reference**: Under the CRC common-wall path, a 2-hour wall is required where Section R313 sprinklers are NOT provided; 1-hour where R313 (NFPA 13D) IS provided. Euclid uses the **CBC 706 fire wall path** — 2-hour regardless of sprinklers. The two paths happen to match at 2-hour for the no-full-sprinkler case.

---

## Party Wall — Construction Assembly

### Recommended: USG Area Separation Wall (SA-925 Solid System)
Purpose-built for wood-frame townhouse fire walls. Structurally independent by design.

| Component | Spec |
|---|---|
| System | USG H-Stud Solid Area Separation Wall |
| Studs | 2 in. USG Steel H-Studs @ 24 in. o.c., C-Runners at top/bottom/intermediate floors |
| Panels | Two 1 in. SHEETROCK Gypsum Liner Panels inserted vertically in H-Studs |
| Structural independence | 0.063 in. USG aluminum breakaway clips attach H-studs to adjacent wood framing at each floor line and roof — clips release at ~790°F, allowing burning structure to collapse while wall remains standing |
| Fire rating | **2-hour** (solid system, both sides) |
| Wall thickness | ~3½ in. to 4 in. total (thinner than any masonry or double-stud option) |
| Max height | 44 ft (Euclid is ~20 ft — well within limit) |
| Clip spacing | Top 23 ft of wall: clips at 10 ft o.c. · Below top 23 ft: clips at 5 ft o.c. |
| UL listing | Cavity system: UL Design U415 · Solid system: proprietary test (not UL-numbered separately) |
| Sound | STC up to 60 (solid system) |
| Reference | `reference/FireWall/USG-SA925-AreaSeparationWall-Townhouse.pdf` |

### Alternative: Prescriptive 2-Hour Wood Stud (AWC DCA-3, WS6-2.1)
For conventional wood-stud construction where H-stud system is not preferred.

| Component | Spec |
|---|---|
| Framing | 2x6 wood studs @ 24 in. o.c., double top plate, single bottom plate |
| Sheathing — each side | **Base layer**: 5/8 in. Type X GWB horizontal, screws @ 24 in. o.c. |
| | **Face layer**: 5/8 in. Type X GWB horizontal, screws @ 8 in. o.c., joints staggered from base layer |
| Insulation | 5½ in. mineral wool (2.5 pcf) |
| Wall thickness | ~9½ in. total (5½ in. stud + 2× double layer GWB) |
| Fire rating | **2-hour**, rated from both sides, ASTM E119 (Test WP-1262) |
| Reference | `reference/FireWall/AWC-DCA3-FireRatedWoodWallAssemblies-2024.pdf` — Assembly WS6-2.1 |
| Structural note | This assembly shares wood framing with the unit — structural independence per CBC 706.4 must be achieved by designing each unit's floor/roof diaphragm as independent (no continuous sheathing across wall) |

---

## Party Wall — Termination Details

### At Roof (Parapet Option — CBC 706.6)
- Wall extends **30 in. above finished roof surface** on both sides
- Parapet constructed as continuation of fire wall (2-hr rated both sides)
- Flashing and counter-flashing at wall/roof junction per roofing manufacturer + RESD-3-3 Section I.B.6

### At Roof (No-Parapet Exception — CBC 706.6 Exception 1)
Preferred for Euclid (eliminates parapet construction complexity):
1. No roof openings (vents, skylights, HVAC curbs) within **4 ft** of wall centerline on either side
2. Roof covering: **Class B minimum** (standard composition shingle or torch-down)
3. Roof sheathing protection: **5/8 in. Type X GWB applied directly to underside of roof sheathing** for 4 ft each side of wall
4. Wall terminates **tight against the underside of roof deck** (mineral wool or fire-rated caulk at gap per RESD-3-3 Figure 3.3)
> USG SA-925 page 8 diagram shows this detail — the 5/8 in. SHEETROCK FIRECODE panel under untreated deck.

### At Foundation
- Two 2 in. C-Runners on monolithic poured footing, fastened with powder-driven fasteners at both ends and @ 24 in. o.c.
- Wall starts at top of footing (continuous from footing to roof deck)
- Per RESD-3-3 Figure 3.1: individual separate walls on monolithic poured footing

### At Intermediate Floor
- H-studs cap with C-Runner at each floor line
- Breakaway clips attach to floor/truss bottom chord framing on both sides
- Fire blocking in wall cavity at floor lines (per CBC 718 and USG SA-925 instructions)
- **Floor sheathing NOT continuous across wall** — separate sheathing for each unit (per RESD-3-3 Figure 3.2)

### At Exterior Wall Ends
- Wall extends **≥ 18 in. beyond face of exterior wall** at both ends (front at Euclid Ave, rear at alley)
- Return wall segment: 18 in. deep, same 2-hr rating, same construction
- Alternatively: perpendicular exterior wall may satisfy continuity per CBC 706.5.1 with adequate fire separation distance

---

## Penetrations Through Fire Wall

**No mechanical, plumbing, or electrical crossing between units** (per RESD-3-3 Section III.A).

All utility services are individual per block — separate meters, separate laterals.

Where fire wall penetration is unavoidable (shared utility in limited cases):
- **Pipe penetrations**: UL-listed through-penetration firestop assembly (TP-1 type, per Imperial go-by P3.0 detail)
- **Electrical only**: No through-penetrations. Separate conduit runs per unit
- **Grease ducts / HVAC**: Shall not penetrate fire wall (dedicated ducts per unit)

---

## Egress (Structural Basis for R-3)

| Unit Type | Egress |
|---|---|
| Ground floor units (1–4) | Private door directly to exterior grade |
| Upper floor units (5–8) | Private enclosed stair entry at grade (own door) → stair entirely within that block → private door at second floor |
| Unit 9 (upper, above comm. block) | Private stair from ground (separate from commercial entry) |
| Commercial (Block E) | Own separate entry from Euclid Ave |

No shared corridors, no shared stairs between any units. This non-shared egress is the operative requirement for R-3 classification per CBC 310.5 and DSD IB-125.

---

## Reference Files

| Document | Location | Relevance |
|---|---|---|
| DSD Technical Bulletin RESD-3-3 (Townhouses, Jan 2020) | `reference/StateRegulation/CA/San-Diego/SD-TechBulletin-RESD-3-3-Townhouses.pdf` | DSD's townhouse wall requirements, structural independence figures |
| USG SA-925 Area Separation Wall System | `reference/FireWall/USG-SA925-AreaSeparationWall-Townhouse.pdf` | H-stud construction, breakaway clip details, 2-hr/3-hr ratings |
| AWC DCA-3 Fire-Rated Wood-Frame Wall Assemblies (Feb 2024) | `reference/FireWall/AWC-DCA3-FireRatedWoodWallAssemblies-2024.pdf` | 1-hr and 2-hr prescriptive wood stud assemblies (WS4, WS6 series) |
| Builder Tip No. 73 — Party Wall Termination | `reference/FireWall/BuilderTip73-PartyWall-Termination.pdf` | Termination detail at roof, mineral wool gap fill |
| Fire Rated Separations (Oakland CA, CRC/CBC) | `reference/FireWall/FireRatedSeparations.pdf` | Inspection standard: party wall, floor/ceiling, penetrations |
| Imperial Ave Go-By (Full Permit Set 2021) | `reference/StateRegulation/CA/San-Diego/GoBy_MixedUse_Imperial_FullSet_2021.pdf` | R-2/shared corridor path — what Euclid avoids; pipe-thru-fire-wall detail TP-1 |
| UL Wood Stud Wall Assemblies (1-hr and 2-hr) | `reference/FireWall/UL-WoodStudWallAssemblies-1hr-2hr.pdf` | UL design numbers U301, U302, U371 for exterior wall context |
| Angelus Block Masonry Fire Resistance | `reference/FireWall/AngelusBlock-Masonry-FireResistance-CBCRefs.pdf` | CMU wall ratings — if masonry fire wall is considered |
| DSD IB-125 (R-2 vs R-3) | HTML only — sandiego.gov/development-services/forms-publications/information-bulletins/125 | Confirms R-3 path via individual separate walls/private egress |
| DSD IB-124 (Residential Sprinkler Permit) | HTML only — sandiego.gov | Fire sprinkler permit process |

---

## Key DS-375 Questions (Fire Wall Related)

**Q2**: If the 9 R-2 units are separated by CBC 706 fire walls (structurally independent, continuous through roof sheathing per CBC 706.6), may the occupancy be classified as Group R-3 per CBC 310.5 (townhouse), thereby removing the CBC 903.2.8 NFPA 13R automatic sprinkler requirement?

This is the controlling question for the Euclid permit strategy. R-3 via fire wall path → 13D only → significant cost savings.

---

*Last updated: 2026-04-27*
