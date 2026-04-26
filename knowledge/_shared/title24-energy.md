# Title 24 Part 6 — California Energy Code

**Scope:** 2022 California Energy Code (Title 24, Part 6; effective Jan 1, 2023). Covers compliance paths, HERS verification, PV/battery triggers, envelope/fenestration, HVAC equipment minimums, ventilation, and Climate Zone 6/7/8/10 specifics. Notes 2025 updates effective Jan 1, 2026.

## 1. Scope of Part 6

Title 24 Part 6 applies to **new construction, additions, and alterations** of buildings in California. It is written and adopted by the **California Energy Commission (CEC)** — distinct from the CBSC-adopted parts. It does **not** regulate building structure or life safety; it regulates energy use and ventilation.

## 2. Compliance Paths

Every project must pick one of two paths:

| Path | Description | Registration |
|------|-------------|--------------|
| **Prescriptive** | Follow cookbook values for each component in §150.1(c) (residential) or §140 (nonresidential) | CF1R required |
| **Performance** | Use an approved energy model (CBECC-Res / CBECC-Com) demonstrating total TDV energy ≤ Standard Design budget | CF1R with model output |

Most ADUs and small additions use **performance** because the prescriptive PV and envelope rules are punishing for small buildings; the model can trade off.

## 3. Compliance Documents: CF1R / CF2R / CF3R

| Form | Who signs | Phase | Purpose |
|------|-----------|-------|---------|
| **CF1R** (Certificate of Compliance) | **Designer / responsible person** (typically the T24 consultant, engineer, or architect) | Design / permit submittal | Declares design complies; registered on approved data registry (CHEERS, CalCERTS); accompanies plans |
| **CF2R** (Certificate of Installation) | **Installing contractor** (HVAC, insulation, PV, plumbing) | Construction | Declares installation matches CF1R; signed at rough-in / before cover |
| **CF3R** (Certificate of Verification) | **HERS Rater** (independent 3rd-party) | Field verification | Diagnostic testing passed (duct leakage, QII, refrigerant charge, airflow, etc.) |

**Rule:** the HERS rater shall **not** sign a CF3R unless a signed CF2R is registered first (Ref Appendix RA3). The local inspector relies on the registered forms.

## 4. HERS Verification Measures (Residential)

**Mandatory HERS** items on most residential projects:

- **Duct leakage** (≤5% to outdoors for new systems; ≤10% for alterations) — DL verification
- **Quality Insulation Installation (QII)** — inspector confirms Grade I installation, sealing, etc. per RA3.5
- **Refrigerant charge** (split AC systems in CZ 2, 8–15)
- **Whole-house ventilation airflow** (§150.0(o)) — ASHRAE 62.2-based
- **Kitchen range hood airflow** or capture efficiency (§150.0(o)1.C)
- **Fan watt draw** / fan efficacy (HVAC air handler)
- **Heat pump system verification** — 2022 added new HERS checks for heat pumps replacing gas furnaces or heat pumps installed where prescriptive
- **PV/battery installed capacity** — verified per JA11/JA12

## 5. HVAC Equipment Minimums (2022)

Equipment meets federal (DOE) efficiencies plus any California-elevated thresholds. As of Jan 1, 2023 federal rule change, HVAC is rated to new test procedures:

| Equipment | 2022 min (new procedure) |
|-----------|--------------------------|
| Split-system central AC (<45,000 Btu/h) | **14.3 SEER2**, 11.7 EER2 |
| Split heat pump (<45,000 Btu/h) | **14.3 SEER2**, 7.5 HSPF2, 11.7 EER2 |
| Packaged AC/HP | 13.4 SEER2 / 6.7 HSPF2 |
| Gas furnace (non-weatherized) | 80% AFUE (federal); CA prescriptive path prefers heat pump |
| Heat pump water heater (residential) | UEF per JA13 / NEEA Tier III for prescriptive |

**Old ratings (pre-2023):** SEER → SEER2 ≈ 0.96× (so 15 SEER ≈ 14.3 SEER2). Don't mix the two.

## 6. Heat-Pump Baseline (2022 prescriptive)

The 2022 code made **heat pumps the prescriptive baseline** for most dwelling units:

- **Space heating** — heat pump is prescriptive in 10 of 16 climate zones (CZ 3, 4, 13, others vary by equipment class). In CZs where a gas furnace is prescriptive, a heat pump earns a model credit.
- **Water heating** — prescriptive baseline for single-family is either a **heat-pump water heater** (CZs 1, 3, 5, 11–16) or **solar thermal with electric backup** (most zones). CZs 4, 6, 7, 8, 9, 10 have specific combinations.

## 7. Solar PV & Battery Storage (Residential — §150.1(c)14)

### Photovoltaic (PV) Requirement
All **newly constructed single-family** dwellings and **low-rise multifamily ≤3 stories** must install a PV system.

**Sizing** — Prescriptive system size = smaller of:
1. `kWPV = (CFA × A) / 1000 + (NDwell × B)` — Equation 150.1-C, factors by Climate Zone (tables in Reference Appendices)
2. The maximum PV that fits the Solar Access Roof Area (SARA) — available roof, not shaded

**Minimum qualification** per Joint Appendix **JA11**.

**Exceptions:**
- Insufficient SARA (≤80 sf effective)
- Heavy shading (reducing to <80% of unshaded production)
- Historic preservation district restrictions
- Community solar participation (specific criteria)

### Battery Storage
**2022 Nonresidential** (high-rise multifamily, hotel/motel, offices, retail, schools, warehouses, grocery) require **both PV and battery storage**. **Single-family** requires PV but not battery — except battery yields performance credit for compliance.

### Expansion in 2025 Code
2025 Energy Code (effective Jan 1, 2026) expands **battery storage** requirements to include additional residential occupancies and adds more electric-ready provisions (EV, heat pump space heating ready circuits, etc.).

## 8. Envelope & Fenestration Requirements (2022 Prescriptive)

### Fenestration (§150.1(c)3)

| Parameter | Prescriptive value (CZ 7 / coastal) |
|-----------|-------------------------------------|
| U-factor | **0.30** max |
| SHGC | **0.23** max |
| Total fenestration area | ≤20% of CFA |
| West-facing fenestration | ≤5% of CFA |

(Other Climate Zones vary — e.g., CZ 1, 16 tighter U-factor; CZ 6, 7 can relax SHGC slightly.)

### Insulation (prescriptive, CZ 7 example — low-rise res)

| Assembly | Prescriptive R-value |
|----------|---------------------|
| Ceiling (attic, ≥R-38 + QII) | R-38 cavity |
| 2×4 wall cavity | R-15 + R-4 continuous exterior (or R-13 + R-5) |
| 2×6 wall cavity | R-21 cavity + R-4 continuous (or R-19 + R-5) |
| Floor over unconditioned | R-19 |
| Slab edge (CZ 16 only for res) | R-7 |

**Quality Insulation Installation (QII)** — mandatory HERS verification on all new low-rise residential and most additions >700 sf.

## 9. Whole-House & Local Ventilation (§150.0(o); ASHRAE 62.2-2019 as amended)

**Whole-house continuous ventilation airflow** (Qtot) =

`Qtot (cfm) = 0.03 × CFA + 7.5 × (NBr + 1)`

where CFA = conditioned floor area (sf); NBr = number of bedrooms.

(CA-specific: California does not permit the 62.2 infiltration credit for natural leakage; the blower-door-derived credit was removed in 2016.)

**Local exhaust:**
- **Bathroom** — 50 cfm intermittent or 20 cfm continuous, ducted to outdoors
- **Kitchen range hood** — airflow + sone limits per §150.0(o)1.C:

| Range type | Min airflow (cfm) @ high | Max sound |
|------------|--------------------------|-----------|
| Electric / induction | 100 cfm (demand-controlled) OR capture efficiency per ASTM E3087 | 3 sones at ≥100 cfm |
| Gas | 300 cfm (prescriptive for gas — often higher to meet capture efficiency) | 3 sones at ≥100 cfm |

(2022 introduced a **capture efficiency** alternative to raw cfm — per ASTM E3087.)

## 10. Climate Zones — California Statewide

California has **16** climate zones assigned by CEC. For Southern California coastal/inland infill work the relevant zones are:

| CZ | Region | Sample cities |
|----|--------|---------------|
| **6** | Coastal LA/OC | Long Beach, Santa Monica, Manhattan Beach, Newport Beach, Huntington Beach, Torrance, Laguna Beach, Dana Point |
| **7** | Coastal San Diego | San Diego, La Jolla, Coronado, Chula Vista, Oceanside, Carlsbad, National City |
| **8** | Inland LA/OC basin | Anaheim, Orange, Tustin, Irvine, Fullerton, Yorba Linda, Cerritos |
| **10** | Inland IE + Temecula | Riverside, San Bernardino, Corona, Temecula, Redlands, Fontana, Lake Elsinore |

Differences matter for: PV sizing factors (A, B), prescriptive insulation R-values, prescriptive water-heater rules (HPWH vs solar-thermal), and HVAC/CZ-specific heat-pump requirements.

**Tool:** CEC Climate Zone Tool at **energy.ca.gov/maps/building-climate-zone-search-tool** — enter address or APN to confirm.

## 11. Nonresidential Highlights (§140)

- **PV + battery storage** for most new buildings ≥2,000 sf (Nonres Occupancies — offices, retail, hotels, schools, warehouses). Triggered in §140.10.
- **Lighting power density (LPD)** per space function, with mandatory occupant sensor + time-switch + daylighting (in daylit zones).
- **Receptacle controls** — 50% of plug loads must be controlled in offices, conference rooms, classrooms.
- **Outdoor lighting** — zone-based power allowances; curfew/shutoff required.

## 12. What Changes in 2025 (effective Jan 1, 2026)

Key measures in the **2025 Energy Code**:
1. **Heat pump space heating** prescriptive in more zones and more occupancies (including nonres).
2. **Heat pump water heater** standardized for single-family prescriptive in all 16 zones.
3. **Battery storage** expansion to more residential/non-residential occupancies.
4. **Tighter envelope** in several zones; improved ventilation (capture efficiency approach strengthened).
5. **EV charging** — stricter capacity/outlet ratios (coordinates with CALGreen 4.106 and 5.106).

Projects with permits applied **before Jan 1, 2026** generally remain under 2022 Energy Code — verify with local jurisdiction transition rules.

## 13. Data Registries & Submittal

All HERS-verified projects must be registered on an approved **HERS Provider / Data Registry**:
- **CHEERS** (California Home Energy Efficiency Rating Services)
- **CalCERTS**

The registry issues a document ID; plans and CF-forms must bear the registration ID. Title 24 §10-103(a).

## References

- [CEC — Building Energy Efficiency Standards (2022)](https://www.energy.ca.gov/programs-and-topics/programs/building-energy-efficiency-standards/2022-building-energy-efficiency)
- [CEC — Single-Family Compliance Manual 2022](https://www.energy.ca.gov/filebrowser/download/5124)
- [CEC — Climate Zone Tool & Maps](https://www.energy.ca.gov/programs-and-topics/programs/building-energy-efficiency-standards/climate-zone-tool-maps-and)
- [CompuCalc — When is PV Required (2022)](https://title24energyreports.com/articles/when-is-pv-solar-required-2022.php)
- [CompuCalc — New HERS Verification for Heat Pumps](https://title24energyreports.com/articles/electric-heat-pump.php)
- [Energy Code Ace — CF1R/CF2R/CF3R Roles](https://energycodeace.com/site/custom/public/reference-ace-2019/Documents/24rolesandresponsibilities.htm)
- [Energy Code Ace — Building IAQ/Ventilation](https://energycodeace.com/content/114-building-indoor-air-quality-and-ventilation-requirements)
- [Milrose — 2025 Title 24 Biggest Changes](https://www.milrose.com/insights/californias-2025-title-24-code-the-5-biggest-changes-impacting-construction-in-2026-and-beyond)
- [Title24 Express — California Climate Zones](https://www.title24express.com/what-is-title-24/title-24-california-climate-zones/)
