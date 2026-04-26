# Factual Sweep — San Diego City Knowledge Files

**Date:** 2026-04-23 (ADU/CALGreen) | 2026-04-24 (Zoning/Permits)
**Scope:** All four `knowledge/san-diego-city/` content files
**Method:** Manual claim-by-claim review against SDMC, Gov Code, DSD IBs, and state law sources.
**Status:** ADU ✓ fixed | CALGreen/WMF ✓ fixed | Zoning ✓ fixed | Permits ✓ fixed

---

## ADU File (`adu-and-sb9.md`)

### Findings

| # | Claim | Status | Action taken |
|---|-------|--------|--------------|
| 1 | Detached ADU max 1,200 sf under §65852.2(c) | PARTIALLY CORRECT | Size confirmed; subdivision (c) is wrong — rule is in (a)(1)(D)(v). Citation note left in file. |
| 2 | JADU min 150 sf per §65852.22(b) | **INCORRECT** | No state minimum for JADU floor area. 150 sf is ADU ingress/egress expansion allowance. Fixed: removed minimum from JADU table row. |
| 3 | Detached ADU default height: 16 ft | VERIFIED | No change needed. |
| 4 | Detached ADU near transit: 18 ft | VERIFIED | Note: additional 20 ft tier exists for matching roof pitch — not yet added. |
| 5 | Detached ADU ≤16 ft = 4 ft side/rear setback | **INCORRECT** | San Diego local code (Ordinance O-21989, Aug 22 2025) requires 0 ft for ≤16 ft ADUs. 4 ft applies to ADUs >16 ft. Fixed: table corrected, pre-amendment note added. Active project (2-story) correctly gets 4 ft under the new rule. |
| 6 | Conversion ADU can keep nonconforming setbacks (even 0 ft) | VERIFIED | No change needed. |
| 7 | No sprinklers if primary is unsprinklered | VERIFIED | Rule is tied to primary dwelling status. Bonus ADU program is an exception — already noted in file. |
| 8 | SB 9 lot split ≥1,200 sf and ≥40% of original | VERIFIED | No change needed. |
| 9 | SDMC §141.0302 = ADU/JADU; §143.1303 = SB 9 | VERIFIED | No change needed. |
| 10 | IB-400 November 2024 is current edition | **INCORRECT** | Current edition is August 2025 (incorporates Ordinance O-21989). Fixed: updated header, URL, and reference section. |

### Open items
- The 20 ft height tier (ADU matching roof pitch, near transit) is confirmed by state law but not yet in the file — low priority.
- Gov Code subdivision for 1,200 sf cap should read (a)(1)(D)(v) not (c) — cosmetic fix, not done yet.

---

## CALGreen/WMF File (`waste-and-calgreen.md`)

### Findings

| # | Claim | Status | Action taken |
|---|-------|--------|--------------|
| 1 | 65% diversion (CALGreen §4.408 + SDMC §66.0702) | VERIFIED | No change needed. |
| 2 | 4.0 lbs/sf base factor (CalRecycle) | **UNVERIFIABLE** | CalRecycle does not publish this specific factor. Attribution removed. Warning block added to file. |
| 3 | ×1.04 modifier for 2-story/stucco (CalRecycle) | **UNVERIFIABLE** | Same issue. Attribution removed. Warning block added. |
| 4 | Deposit refundable within 180 days of final inspection | VERIFIED | Note: below 65% gets pro-rated refund (not full forfeiture). File's "partial refunds possible" line is correct. |
| 5 | WMF URL: seamlessdocs.com/f/wmf_acknowledgements | VERIFIED | No change needed. |
| 6 | ESD email: cdreceipts@sandiego.gov | **UNVERIFIABLE / LIKELY INCORRECT** | No city source confirms this email. Official method is physical mail to 9601 Ridgehaven Ct Suite 320. Fixed: flagged in both knowledge file and CLAUDE.md. |
| 7 | Four CALGreen §4.408 compliance paths | VERIFIED | No change needed. |
| 8 | 3.4 lbs/sf = 65% proxy for residential §4.408.4 | VERIFIED | No change needed. |

### Open items
- **Debris factors source (HIGH PRIORITY):** The 4.0 lbs/sf and ×1.04 modifier are used in `calgreen_calc.py` for every WMF estimate. The original source needs to be identified before these figures are cited on submitted WMF forms. Candidates: SWRCB, local county guide, ICC/USGBC publication, or prior DSD guidance. Check with DSD CALGreen desk at (619) 446-5003.
- **cdreceipts@sandiego.gov:** Needs direct confirmation with ESD before using. Call (619) 235-1000 or check the C&D completion page at sandiego.gov/environmental-services/recycling/cd/cdcompletion.

---

## Zoning File (`zoning-development-standards.md`)

### Findings

| # | Claim | Status | Action taken |
|---|-------|--------|--------------|
| 1 | RS zone min lot sizes (Table 131-04B/C) | UNVERIFIED — sourced to SDMC | File already cites SDMC; no change; reader directed to verify in current supplement |
| 2 | FAR 0.60 for RS-1-7 on 4,001–5,000 sf lot | PLAUSIBLE — consistent with SDMC structure | No change; flagged "verify in March 2026 supplement" already in file |
| 3 | 30 ft structural height for all RS zones | VERIFIED per SDMC 113.0270 + 131.0461 | No change needed |
| 4 | ADU FAR exclusion cited to Gov Code 65852.2(e)(1) | **INCORRECT** — wrong subdivision | Fixed: updated to (a)(1)(D) + SDMC 141.0302 |
| 5 | AHDB: "up to 50% for 15%+ low-income" | **INCORRECT** — 15% LI yields ~22.5%, not 50%; 50% requires 24%+ VLI (AB 2345/2020) | Fixed: replaced with accurate tiered table; added common-misstatement warning |
| 6 | AHDB: "80% for 100% affordable" | VERIFIED — AB 2334 (2022) | No change needed |
| 7 | Parking reform Ord O-21057 / O-21041 | UNVERIFIED — ordinance numbers not confirmed | Flagged as "verify number" in future review; content consistent with known reform |
| 8 | Coastal height 26 ft for roof pitch < 3:12 | UNVERIFIED — Prop D interpretation; check SDMC 132.0462 | No change; file already says "verify at maps.sandiego.gov" |
| 9 | BMZ Zone 1 = 0–35 ft, Zone 2 = 35–100 ft | VERIFIED per SDMC 142.0412 | No change needed |

### Open items
- Ordinance numbers (O-21057, O-21041) should be verified against the SDMC amendment history.
- Coastal Prop D 26/28 ft interpretation: confirm exact SDMC 132.0462 language before citing on submittals.

---

## Permits File (`permits-and-submittals.md`)

### Findings

| # | Claim | Status | Action taken |
|---|-------|--------|--------------|
| 1 | IB-400 listed as "Nov 2024 edition" | **INCORRECT** — current edition is Aug 2025 (Ord. O-21989) | Fixed: updated to Aug 2025 edition with ordinance note |
| 2 | School fees "~$5.17/sf residential 2026" | **UNVERIFIABLE** — OPSC updates annually | Fixed: removed hardcoded figure; reader directed to opsc.ca.gov |
| 3 | Cycle 1 review "20–40 biz days SFD" | PLAUSIBLE — consistent with DSD published targets | No change; DSD's current timeline page should be checked at submittal |
| 4 | Intake screening "1–3 biz days" | PLAUSIBLE | No change |
| 5 | Accela URL aca-prod.accela.com/SANDIEGO | UNVERIFIED — DSD has been transitioning portals | Flag: verify URL at sandiego.gov/development-services before submitting |
| 6 | IB numbers (IB-101, IB-122, IB-141, etc.) | PLAUSIBLE — consistent with DSD IB index structure | No change; full index at DSD website |

### Open items
- **Accela URL (HIGH):** DSD may have migrated to a new portal. Verify current intake URL at sandiego.gov/development-services before client-facing use.
- IB-501/IB-502 fee schedule IBs: confirm these are current IB numbers for the 2026 fee schedule.

---

## Sources Used

- [Gov Code §65852.2 — FindHOALaw](https://findhoalaw.com/government-code-section-65852-2-accessory-dwelling-units/)
- [Gov Code §65852.22 — FindHOALaw](https://findhoalaw.com/government-code-section-65852-22-junior-accessory-dwelling-units/)
- [HCD ADU Handbook March 2026](https://www.hcd.ca.gov/sites/default/files/docs/policy-and-research/adu-handbook-update.pdf)
- [San Diego IB-400 (Aug 2025 current)](https://www.sandiego.gov/sites/default/files/2025-08/dsd_ib400_adu.pdf)
- [San Diego IB-400 page](https://www.sandiego.gov/development-services/forms-publications/information-bulletins/400)
- [SnapADU San Diego ADU Regulations](https://snapadu.com/california-adu-regulations-zoning/san-diego/)
- [City of San Diego C&D Recycling](https://www.sandiego.gov/environmental-services/recycling/cd)
- [City of San Diego C&D Completion page](https://www.sandiego.gov/environmental-services/recycling/cd/cdcompletion)
- [CALGreen §4.408.4 — ICC Digital Codes](https://codes.iccsafe.org/s/CAGBC2022P3/chapter-4-residential-mandatory-measures/CAGBC2022P3-Ch04-SubCh4.4-Sec4.408.4)
- [CalRecycle Estimated Solid Waste Generation Rates](https://www2.calrecycle.ca.gov/wastecharacterization/general/rates)
- [WMF Live Form](https://sandiego.seamlessdocs.com/f/wmf_acknowledgements)
