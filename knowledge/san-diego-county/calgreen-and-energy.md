# CALGreen & Energy — County of San Diego (Unincorporated)

**Authority:** PDS Building Division (CALGreen, Title 24 Part 6 Energy enforcement); DPW (C&D diversion program); CEC (state-level T24 oversight).
**Codes:** 2022 CALGreen (CCR Title 24 Part 11) + County amendments; 2022 Title 24 Part 6 Energy Code; 2022 CBC/CRC.
**Cycle:** 2022 code cycle applies until **Jan 1, 2026**, when the 2025 cycle takes effect.

> **Differs from City of San Diego:** City adopted a **Climate Action Plan (CAP)** reach code that pushed CALGreen beyond state mandatory (electrification of new construction, enhanced ventilation, etc.). **The County has NOT adopted a comparable reach code** — it follows state mandatory measures, with local C&D and building material amendments. County does operate an administrative **Construction & Demolition (C&D) Debris Management Program** separately.

---

## 1. CALGreen Tier Adoption

- California CALGreen (Part 11) has **Mandatory** measures plus optional **Tier 1** and **Tier 2**.
- **County of San Diego applies only MANDATORY measures** for residential and non-residential. No adopted Tier 1/Tier 2 overlay.
- Certain state laws layered on top are enforced anyway (e.g., EV-ready, solar PV mandate, low-flow fixtures, recycling, indoor air quality).

## 2. Mandatory CALGreen Measures — Residential (CRC + Part 11 Ch 4)

| Topic | Measure |
|-------|---------|
| **Planning & Design** | Storm water pollution prevention; site design for infiltration (coord with WPO) |
| **Water Efficiency (§4.303)** | Max fixture flow: WC 1.28 gpf, lav 1.2 gpm, shower 1.8 gpm, kitchen sink 1.8 gpm |
| **Irrigation Controllers** | Weather- or soil-moisture-based (MAWA, ET-tied) |
| **Construction Waste (§4.408)** | **65% diversion** of non-hazardous C&D debris (standard); documentation required |
| **Operation & Maintenance Manual (§4.410)** | Provided to owner at occupancy |
| **Pollutant Control (§4.504)** | Low-VOC adhesives, sealants, paints, carpet, composite wood per tables; ducts covered during construction |
| **Moisture Content (§4.505)** | Wood framing ≤ 19% at enclosure |
| **Bathroom Exhaust (§4.506)** | ENERGY STAR fans, ducted to outside, humidity control |
| **EV-Ready (§4.106.4)** | 1-SFD: one EV Ready space (40A/208-240V circuit with receptacle or listed charger). Multifamily: % ratios per total spaces |
| **Solar PV (§150.1(c))** | Mandatory PV sized per T24 formula; exempt small roofs, shading, or alternative community shared array |
| **Battery Ready** (new in 2022) | Conduit and backed-up panel provisions for residential battery |
| **Heat Pump Ready** (2022) | Wire + condensate + space provisions for heat-pump conversions from gas (not mandatory heat-pump in County) |

## 3. C&D Debris Diversion — County Program

### Requirement
- **CALGreen §4.408:** Divert at least **65% by weight** of construction & demolition debris via reuse, recycling, salvage.
- **County Construction & Demolition Debris Management** enforced by PDS Building + DPW Recycling.

### Submittal at Permit (County process)
1. **Waste Management Plan (WMP)** at plan check — estimated tonnage by material, hauler(s), destination facilities.
2. **Materials covered:** concrete, asphalt, wood, metals, cardboard, drywall, roofing, soils. Exempt: hazmat.
3. **Hauler**: must be **franchised hauler** (or self-haul with approval, proof of facility tipping receipts).
4. **Franchised hauler list by ZIP:** franchisedhaulerlist.sandiegocounty.gov (**County** site; distinct from City's EDCO/Republic franchise map).

### Post-Construction Reconciliation
- Submit **actual tonnage receipts** before Certificate of Occupancy (or within 180 days).
- County form typically tracks:
  - Total tons generated
  - Tons recycled (by stream)
  - Tons to disposal
  - Computed diversion rate → must be ≥ 65%
- **Deposit / bond** may be required at permit (refunded on documented compliance).

### Estimation Factors (CalRecycle / County typical)
- New SFD wood-frame: ~**4.0 lbs / SF** baseline.
- 2-story modifier ~×1.04.
- Stucco exterior modifier ~×1.02–1.04.
- Tile roof modifier ~×1.10 vs asphalt shingle.
- Concrete foundation adds notably if slab-on-grade full footprint.
- Use `data/debris_factors.json` for distribution by material.

## 4. Title 24 Part 6 Energy — Climate Zones in Unincorporated County

The unincorporated County spans four Title 24 climate zones — **the largest climate-zone range in any California county**.

| CZ | Area (examples) | Winter Design Temp | Summer Design Temp | Heating Demand | Cooling Demand |
|----|-----------------|-------------------|-------------------|----------------|----------------|
| **7** | Coastal strip (Rancho Santa Fe coast, western Bonsall) | Mild | Mild | Low | Low |
| **10** | Inland valleys (Alpine, Ramona, Valley Center, Lakeside, Bonsall) | Moderate | Hot summer | Moderate | High |
| **14** | High desert / mountain fringe (Warner Springs, Pine Valley) | Cold winter | Hot summer | High | High |
| **15** | Low desert (Borrego Springs) | Warm winter | Extreme summer | Low | Extreme |

### Envelope / Mechanical implications
- **CZ 10** dominates the high-activity permit region (Ramona, Alpine, Valley Center) — design for **high cooling**, moderate heating.
- **CZ 14/15** — require enhanced glazing SHGC, higher envelope R-value, often heat-pump water heaters.
- **CZ 7** — milder, but still full prescriptive Title 24 compliance.

### 2022 T24 Part 6 Key Residential Rules
- **Heat-pump priority**: prescriptive path favors HP space heating + HP water heating (can use gas with tradeoffs in performance path).
- **PV + battery credit**: batteries (storage) can offset PV size in compliance calc.
- **Quality Insulation Installation (QII)** — required in some CZs or used for trade-offs.
- **HERS rater verification** required for: duct sealing/testing, refrigerant charge, QII, blower door, fan flow, compact HW distribution.
- **Forms**: CF1R (plan check), CF2R (install), CF3R (HERS verify) — all on CEC registry, not paper.

### Ventilation
- **ASHRAE 62.2** whole-house fan rates per occupancy/area.
- Balanced ventilation required on tight homes (ACH50 ≤ 5 typical).

## 5. Solar PV Mandate (§150.1(c))

- Required on all new low-rise residential (CA statewide since 2020).
- Sizing formula: CFA × A factor + # bedrooms × B factor, climate-zone-specific. Typical SFD result: 3–6 kW DC.
- **Exceptions:**
  - Not enough "solar access" — verify shading.
  - Small effective roof area.
  - Community/shared solar alternative (allowed per CEC approval).
- **Battery storage** encouraged but not mandatory for residential (partial credit).
- **Non-residential (2022)**: PV + battery mandatory for many occupancy types (office, retail, warehouse, etc.).

## 6. HERS Verification

HERS (Home Energy Rating System) providers operate statewide (CalCERTS, CHEERS). Mandatory verifications include:
- Envelope air leakage (blower door).
- Duct leakage (≤ 5% total or outside conditioned space, per path).
- Refrigerant charge (split AC).
- Mech vent airflow.
- Whole-house IAQ fan.
- PV system (CF2R + commissioning).

Registered via **Energy Code Ace / CEC registry** at CF1R → CF2R → CF3R. County Building Inspector confirms CF3R via registry lookup at final.

## 7. CALGreen Non-Residential (Part 11 Ch 5)

Applies to non-residential buildings including large additions/TI above thresholds.

| Area | Measure |
|------|---------|
| **Water** | 20% reduction from baseline fixture flow |
| **C&D** | 65% diversion |
| **Recycling** | Areas for recyclables/organics collection |
| **Commissioning (§5.410)** | Required on non-res >10,000 SF — Cx authority, design intent, systems manual |
| **Cool roof** | Ref 3-yr solar reflectance ≥ 0.55 (low slope), 0.20 (steep); T24 prescriptive |
| **EV charging** | 10% EVCS, 25% EV-Ready, 50% EV-Capable typical for new parking facilities |

## 8. OWTS Energy Considerations (rural-specific)

- Septic pumps (dosing ATU, drip distribution) add electrical load — spec into service calc.
- Some OWTS designs require continuous blower — factor into ventilation/utility calc.
- PV array may not be reduced for off-grid site — PV is roof-area based, not grid-dependent.

## 9. Applicant Responsibilities at Final Inspection

1. Upload **CF3R HERS verification** to CEC registry.
2. Submit **C&D diversion receipts** and reconciliation form (65% check).
3. Provide **Operation & Manual (§4.410)** to owner (sign-off required).
4. Commissioning report (non-res).
5. Solar PV interconnection approval (PTO from SDG&E) before final unless deferred.

## 10. Quick SFD Checklist — Unincorporated County

| Item | Req'd? | Note |
|------|--------|------|
| CF1R registered | Yes | Part 6 |
| CF2R / CF3R at field | Yes | HERS |
| CALGreen §4 (residential) checklist in plans | Yes | Mandatory only |
| 65% C&D diversion WMP at permit | Yes | County WMF equivalent |
| EV-ready 40A circuit | Yes | §4.106.4 |
| Solar PV per CEC formula | Yes | §150.1(c) |
| Battery ready conduit | Yes | 2022 new |
| Heat-pump ready (if gas HVAC) | Yes | 2022 new |
| NFPA 13D sprinklers | Yes | CRC R313 |
| Low-flow fixtures | Yes | §4.303 |
| Low-VOC finishes | Yes | §4.504 |

## 11. Differences from City of San Diego

| Topic | County | City |
|-------|--------|------|
| Reach code (CAP-driven) | **None (mandatory only)** | **Adopted electrification / bonus points** |
| C&D form | County WMP via PDS / DPW | City WMF (SeamlessDocs) at DEV Svcs |
| Franchised hauler directory | sandiegocounty.gov | sandiego.gov/edco map |
| Diversion rate floor | 65% (state mandatory) | 65% state + 75% City target for certain projects |
| CAP consistency checklist | Not required | Required at permit (City CAP Checklist) |
| Mandatory heat-pump water heater | No (unless T24 compliance drives) | City reach code pushes electric path |

## 12. 2025 Code Cycle (effective Jan 1, 2026)

Upcoming changes to monitor:
- Further **heat-pump space heating** prescriptive push.
- **Expanded battery storage** requirements.
- **Embodied carbon** disclosure for large non-res (2026 CALGreen).
- **Zone 0 ember-resistant** integration with CALGreen landscape sections.
- New **indoor air quality** monitoring requirements (CO2 sensors in higher-occupancy spaces).
- County intermediate code adoption typically follows ~3-6 months after state effective date — the 2022 code remains operative during any gap.

## References

- **CALGreen 2022 (Title 24 Part 11):** codes.iccsafe.org (or bsc.ca.gov)
- **Title 24 Part 6 Energy 2022:** energy.ca.gov/programs-and-topics/programs/building-energy-efficiency-standards
- **County Consolidated Building Code (Title 9 Div 1):** Municode
- **County C&D Debris Management:** sandiegocounty.gov/content/sdc/dpw/recycling.html
- **Franchised Hauler List (County):** franchisedhaulerlist.sandiegocounty.gov
- **CEC HERS Registries:** calcerts.com, cheers.org, energycodeace.com
- **CalRecycle C&D Factors:** calrecycle.ca.gov
- **SDG&E interconnection (PTO for PV):** sdge.com
