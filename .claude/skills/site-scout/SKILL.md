---
name: site-scout
description: Web-research a site's missing TBD fields — inspector contacts, permit fees, FEMA flood zone, wildfire risk, seismic zone, airport influence, planning area designation, and transit priority. Use when filling in partial or skeleton site JSON from public sources.
---

Scout all TBD fields for a site using web research only (no GIS polygon ingestion).

## Arguments

- `$ARGUMENTS` — site ID (e.g. `WA-405_126TH`) or address, or jurisdiction name to batch-fill

## What This Skill Researches

### A. Inspector Contacts
Each jurisdiction has one permit center. Contact info is shared by building,
structural, electrical, mechanical, grading inspectors — they all route through
the same front desk number.

| Jurisdiction | Primary Source |
|---|---|
| San Diego | DSD (Development Services Dept) — 619-446-5000, dsd.sandiego.gov |
| Escondido | City of Escondido Planning/Building — 760-839-4648 |
| Garden Grove | Community Dev Dept — 714-741-5185 |
| Burien / King County | KC Permitting Division — 206-296-6600 |
| Kirkland | City of Kirkland Permit Center — 425-587-3600 |
| Renton | City of Renton Development Services — 425-430-7200 |

### B. FEMA Flood Zone
- Source: FEMA Flood Map Service Center (msc.fema.gov)
- Search by address → read FIRM panel → get flood zone designation
  (Zone X = minimal, Zone AE = 100-yr floodplain, Zone A = approximate)
- Record: flood zone letter + FIRM panel number

### C. Wildfire / Fire Hazard Severity Zone (FHSZ)
- California: CAL FIRE FHSZ viewer (osfm.fire.ca.gov or gis.data.ca.gov)
  Zones: Moderate, High, Very High (SRA), High/VH (LRA)
- Washington: WA DNR Wildfire Risk (dnr.wa.gov/wildfire-risk)
  Zones: Low, Moderate, High, Very High (Community Wildfire Risk)

### D. Seismic / Fault Zone
- USGS National Seismic Hazard Map (earthquake.usgs.gov)
  Report: expected PGA at 2% in 50 years
- CA: Alquist-Priolo Fault Zone map (maps.conservation.ca.gov)
  If in AP zone → active fault within ~50 ft
- WA: Seattle Fault Zone — sites within Snohomish/King County south of ~47.50°N are within
  moderate-high hazard; check distance from Seattle Fault trace

### E. Airport Influence Area (AIA)
- CA airports: each County Airport Land Use Commission (ALUC) has an ALUCP
  - San Diego County: SANDAG airport land use compatibility plan
    Airports: SAN (Lindbergh), CRQ (McClellan-Palomar), MYF (Montgomery), SDM (Brown)
  - Check if parcel falls within safety zones, noise contours, or height limits
- WA airports:
  - King County: Boeing Field/King County Intl (BFI) ALUCP by Port of Seattle
  - Renton Municipal (RNT) influence area — smaller GA airport, ~5 mi radius
  - Kirkland: near BFI and Paine Field — check PSRC aviation layers

### F. Planning Area / Land Use Designation
- City comp plan map — search "[City] comprehensive plan land use map GIS"
- Key designations: Residential Low Density (RLD), Medium Density (RMD),
  Mixed Use, Commercial, etc.
- Record: comp plan area name + land use designation + document/year

### G. Transit Priority Area (TPA)
- CA: check HCD TPA map (hcd.ca.gov/planning-and-community-development/housing-elements/tpa)
  Site within 0.5 mi of high-frequency transit stop = TPA
  TPAs unlock additional density bonuses under Density Bonus Law
- WA: PSRC Regional Growth Strategy GIS + Sound Transit network map

### H. Permit Fees (summary level)
- Each city publishes an annual fee schedule PDF
  - San Diego: dsd.sandiego.gov/permits/fee-schedules
  - Escondido: escondido.org/building/fee-schedule
  - Garden Grove: Garden Grove Building Div fee schedule
  - Kirkland: kirklandwa.gov/building
  - Renton: rentonwa.gov/permits
- Record: document title + year + URL; do not transcribe full fee tables
  (DIF rates, utility connection fees, ADU fee waivers are most relevant)

## Output Format

For each TBD field researched, produce a JSON patch in this format:
```json
{
  "siteId": "CA-2921_ELCAJON",
  "field": "overlay:FEMA FLOOD ZONE",
  "value": "Zone X — outside 100-yr + 500-yr floodplain. FIRM Panel 06073C1652G (2012).",
  "source": "FEMA MSC msc.fema.gov, accessed 2026-04-15",
  "confidence": "confirmed"
}
```

Confidence levels:
- `confirmed` — direct lookup on official source
- `likely` — inferred from geography + general rules, verify before permit
- `TBD` — could not find on web; needs in-person or portal lookup

## Rules

- NEVER update `site.apn`, `site.legalDescription`, or `site.lotSF` from web search (assessor only)
- NEVER ingest parcel polygon data from this skill (use gis-intake for that)
- Overlay zone results are advisory — always note the source and year
- For contacts: record phone number + department name; individual inspector names change often
- Fees: record fee schedule URL/year only; do not hardcode dollar amounts (they change annually)
- WA has no NEF (Neighborhood Equivalency Fee) — `nefRatePerSF` stays 0
- CA has no state DIF — local DIF varies; record per-city rate if found

## Common Patterns

### San Diego RS-1-7 sites (Angwin, CabrilloMesa, Palmyra, Cannington)
All share the same inspectors (DSD), same comp plan framework (community plan areas),
and likely same flood zone (Zone X — inland San Diego suburban).
Research once; apply to all RS-1-7 sites in same ZIP cluster.

### King County WA sites (Kirkland, Renton, Burien)
All share King County GIS layers for flood, seismic, wildfire.
Overlay zone lookups can be batched via KC iMap.

## Integration

After scouting, apply findings by editing the site JSON directly:
- Replace `"-- TBD: ..."` string with researched value
- Add `" | Source: [url] ([year])"` suffix for non-obvious values
- Update `data/sites/index.json` status if all major TBDs resolved
- Run `py tools/build.py` after each site update
