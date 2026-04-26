# Waste Management & CALGreen — City of San Diego

Authority: **DSD Green Building / CALGreen desk** (permit-side review) +
**Environmental Services Department (ESD) Recycling Specialist** (receipt
reconciliation and deposit refund).

- Phone (CALGreen): (619) 446-5003
- ESD C&D receipts: physical mail to ESD C&D Diversion Coordinator,
  9601 Ridgehaven Court Suite 320, San Diego CA 92123
  (**[email protected]** — unconfirmed by live city sources; verify before use)
- Live WMF: https://sandiego.seamlessdocs.com/f/wmf_acknowledgements

Mandate: **65% minimum diversion** of construction + demolition debris from
landfill (CALGreen mandatory + SDMC §66.0702 C&D Ordinance). Applies to
virtually all permitted construction.

## Key ordinances & bulletins

| Reference | Title |
|-----------|-------|
| **SDMC §66.0702 et seq.** | Construction & Demolition Debris Deposit & Diversion Ordinance |
| **CALGreen Part 11** | State green building code — mandatory diversion, reuse, waste mgmt |
| **IB-501** | Fee schedule — includes C&D deposit fee structure |
| **IB** (CALGreen checklist) | Residential + non-residential CALGreen verification checklists |
| Local CAP amendments | All-electric / reach-code additions (see `energy-and-title24.md`) |

## WMF (Waste Management Form) — what the agent fills

SeamlessDocs form includes these sections:

1. **Project identification** — address, PRJ, PMT (if issued), applicant +
   contractor info.
2. **Project type** — new construction / addition / tenant improvement /
   demolition; residential/commercial; new stand-alone or reroof.
3. **Project metrics** — square feet (new + demo'd separately); number of
   stories; finish type (stucco, siding, CMU, etc.); construction type
   (wood-frame, steel, concrete, mixed).
4. **Estimated debris by material**, in **TONS** — concrete, asphalt,
   wood, drywall, metals, cardboard, green/landscape, mixed inert, mixed
   C&D, trash (not diverted).
5. **Hauler + facility designation** — franchised hauler for the ZIP, plus
   destination facility (MRF, transfer station, landfill).
6. **Diversion rate calculation** — must show ≥ 65% diverted. Form
   auto-calcs if weights are filled consistently.
7. **Refundable deposit amount** — sliding scale by valuation (see IB-501).
8. **Acknowledgements** — signatures, notice of 180-day receipt submittal
   window.

## Debris factors — new residential wood-frame (industry estimate — source unverified)

> **⚠ Attribution note:** The 4.0 lbs/sf base factor and ×1.04 story/stucco
> modifier have NOT been confirmed in any CalRecycle-published table. CalRecycle
> explicitly excludes construction debris from its residential waste generation
> rates. These figures likely originate from a local jurisdiction guide or
> industry rule of thumb. Do NOT cite as "CalRecycle figures" on the WMF or in
> plan check responses until the original source is identified.

| Parameter | Value |
|-----------|-------|
| Base generation factor (new res wood-frame) | **4.0 lbs/sf** (source: unconfirmed — verify) |
| 2-story modifier | ×1.02 – ×1.05 (repo uses 1.04 — source: unconfirmed) |
| Stucco exterior modifier | Combined with 2-story ≈ 5.0 lbs/sf effective |
| Demolition wood-frame res | ~110 lbs/sf (wide variance) |
| Demo concrete slab | ~160 lbs/cy |

Calculation form:
```
total_lbs = SF × base_factor × story_modifier
total_tons = total_lbs / 2000
```

**5552 Redwood example** — 1,200 sf, 2-story, stucco:
```
= 1,200 × 4.0 × 1.04 = 4,992 lbs ≈ 2.50 tons total generated
```
Distribution applied from `data/debris_factors.json` (see repo).

## Material distribution (typical new res wood-frame — industry estimate, not confirmed by CalRecycle)

| Material | Share | Diverted? |
|----------|-------|-----------|
| Wood (cut-offs, crates, pallets) | 30% | Yes — MRF |
| Drywall | 15% | Yes — MRF or wallboard recycler |
| Cardboard / paper | 8% | Yes |
| Metals (rebar, copper, banding) | 5% | Yes — scrap |
| Concrete / inerts | 20% | Yes — crushed aggregate |
| Stucco/cementitious | 5–8% | Yes — inert |
| Insulation | 2% | Marginal (fiberglass, batts) |
| Mixed/other | 10% | Mixed — via sorter |
| Trash (not divertible) | 5–10% | No — landfill |

Achievable diversion **typically 75–85%** when sent to a MRF (Materials
Recovery Facility) that reports certified weight + diversion percentages.

## Franchised haulers (SDMC §66.0133)

- The City's **Franchised Hauler Ordinance** restricts who may collect C&D
  materials within City limits. Only the franchised hauler for the
  originating ZIP may haul unless a self-haul permit is obtained.
- **92841 (Mid-City, City Heights, incl. 5552 Redwood)** — **EDCO** is the
  current franchised hauler (verify via the lookup below).
- **Self-haul by owner** is allowed with proof of weight tickets to a
  permitted facility + documentation on WMF.

Lookup: https://franchisedhaulerlist.sandiego.gov

## Accepted facilities (partial list)

| Facility | Use |
|----------|-----|
| **Miramar Recycling Center (Miramar Road MRF)** | Mixed C&D sorting |
| **EDCO Lemon Grove MRF** | EDCO-hauled mixed C&D |
| **Allan Company Otay Mesa** | Sorted recyclables |
| **Miramar Landfill** | Landfill destination (trash only) |
| **Sycamore Landfill (Santee)** | Alternative landfill (franchise dependent) |
| **Palomar Transfer Station** | Transfer / sorting |

## Deposit structure (refundable)

- Required at **permit issuance**.
- Sliding scale typically 2–3% of project valuation, with caps.
- **Refundable** if ≥ 65% diversion documented via submitted weight tickets
  + hauler reports.
- **180-day window** from **final building inspection** to submit receipts
  to ESD C&D Diversion Coordinator (verify current submission method with ESD —
  email `cdreceipts@sandiego.gov` is unconfirmed; physical mail is the
  documented official channel). After 180 days, the deposit is forfeited.
- Partial refunds for partial documentation are possible but reduced.

## CALGreen mandatory measures (residential 2022 edition — baseline)

Key provisions applied at plan-check:

| Section | Measure |
|---------|---------|
| **4.106** | Site development — SWPPP/WPCP, surface drainage |
| **4.106.4** | EV-ready raceway + receptacle at each dwelling (increased in 2025 code) |
| **4.303.1** | Plumbing fixture flow — water efficiency tables |
| **4.304** | Outdoor water use — MWELO compliance |
| **4.408** | **Construction waste — ≥ 65% diversion OR waste mgmt plan** |
| **4.410** | Operation & maintenance manual |
| **4.504** | Pollutant controls — VOC limits on adhesives/sealants/paint/carpet |
| **4.505** | Moisture control — concrete vapor retarder |
| **4.506** | Indoor air — bathroom exhaust, whole-house ventilation |

Local reach-code additions (City All-Electric) — see `energy-and-title24.md`.

## 2025 Code cycle (effective Jan 1, 2026)

- CALGreen 2025 Part 11 keeps 65% minimum; raises EV-ready to 50% Tier 1
  for MF; strengthens indoor air quality measures.
- City confirmed continued C&D deposit practice through 2026.

## WMF filing workflow (per agent)

1. Load `data/project_info.json` (address, PRJ, applicant, phone, email).
2. Run `src/agents/calgreen_calc.py` with SF, stories, finish.
3. Map output tons into WMF material rows (see `src/prompts/form_field_map.md`).
4. Verify **diversion % ≥ 65** — `wmf_agent.py` flags PASS/FAIL.
5. Emit `output/wmf_filled.md` field table for the applicant to transcribe
   into the live SeamlessDocs form.
6. Applicant signs + submits online; DSD auto-collects deposit at issuance.

## Common comment / correction drivers

- WMF diversion < 65% → reject.
- Trash (non-divertible) line overstated → re-balance material lines.
- Hauler named not franchised for the ZIP → correct to franchisee or add
  self-haul note.
- Signature missing → return form unsigned.
- Sq-ft entered doesn't match building permit → mismatch flag.

## References

- Live WMF: https://sandiego.seamlessdocs.com/f/wmf_acknowledgements
- SDMC Ch 66 C&D Ordinance: https://docs.sandiego.gov/municode/
- IB-501 fee schedule: https://www.sandiego.gov/development-services/forms-publications/information-bulletins/501
- IB-501 PDF (legacy): https://www.sdpermits.com/uploads/1/0/6/5/10651841/dsdib501.pdf
- Franchised hauler list: https://franchisedhaulerlist.sandiego.gov
- Information Bulletins index: https://www.sandiego.gov/development-services/forms-publications/information-bulletins
- CalRecycle C&D model ordinance: https://www.calrecycle.ca.gov/LGCentral/Library/CandDModel/About/
- Construction & Demolition recycling (SD County mirror): https://www.sandiegocounty.gov/content/sdc/dpw/recycling/newcdhome.html
