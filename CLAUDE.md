# Master-ProjectLibrary (MPL)

**Aliases:** MPL | ProjectLibrary | ProjectBook | PlanCheck

Consolidated monorepo combining ProjectBook-Planner (site design) and
PlanCheck-Planner (permit engine) into a single authoritative source.

Legacy repos are archived read-only references. This is the active repo.

---

## Repo Layout

```
Master-ProjectLibrary/
├── app/              JS/HTML interactive site planner (Leaflet map, building config)
│   ├── src/          Source — js/, css/, html/
│   ├── tests/        Vitest JS test suite
│   ├── Output/       Built HTML outputs
│   └── docs/         GitHub Pages public mirror
├── engine/           Python permit engine (PDF form filler + Claude agents)
│   ├── agents/       Claude-powered agents (correction parser, drawing reader, WMF)
│   ├── prompts/      Agent prompt templates and field maps
│   ├── tools/        fill_pdf_forms.py, completion_gate, session_guard
│   └── tests/        pytest suite
├── data/
│   └── sites/        ONE canonical site_data.json + design_notes.md per project
├── knowledge/        Jurisdiction regulatory wiki (Markdown, shared read-only)
├── reference/        PDFs — assessor maps, pre-app packets, state regulations
├── tools/            Shared repo-level tools (build, hygiene, version)
├── controller-note/  CTRL-005 cross-repo messaging
└── .claude/          Hooks, memory, settings
```

---

## Active Sites

| Site ID | Address | Status |
|---|---|---|
| ca-2921-el-cajon | 2921-2923 El Cajon Blvd, SD 92104 | In progress — DS375 |
| ca-4335-euclid | 4335 Euclid Ave, SD 92105 | In progress — DS375 |

---

## Tech Stack

| Layer | Stack |
|---|---|
| Site planner (app/) | JavaScript, Leaflet.js, HTML/CSS, Vitest |
| Permit engine (engine/) | Python 3.12+, PyMuPDF (fitz), Anthropic SDK |
| Data | JSON (site_data.json per site) |
| Knowledge | Markdown (jurisdiction wikis) |

---

## Data Flow

```
data/sites/{site_id}/site_data.json   ← source of truth
         ↓
app/     reads geometry + zoning      → renders interactive map
         ↓
engine/  reads full site_data         → fills DS-375, DS-3032, DS-420 PDFs
         ↓
engine/  agents read knowledge/       → answers correction letters, plan check
```

---

## Site Data Schema

Each site lives at `data/sites/{site_id}/`:
- `site_data.json` — address, site, project, ds375, applicant, owner
- `design_notes.md` — building layout, design strategy, code rationale

Site ID format: `{state_abbr}-{street_number}-{street_name}` (e.g. `ca-2921-el-cajon`)

---

## Legacy Repos (archived — read-only reference)

| Repo | What it was | Archive location |
|---|---|---|
| ProjectBook-Planner | JS site planner | GitHub archived + local zip |
| PlanCheck-Planner | Python permit engine | GitHub archived + local zip |

Do NOT make changes to legacy repos. MPL is the active codebase.

---

## Controller Note Protocol (CTRL-005)

Standard protocol — see NP_ClaudeAgent global_rules.md.
Upnotes in `controller-note/Master-ProjectLibrary-upnote.md`.

---

## Knowledge Base — How to Use

**MANDATORY:** When answering any code, permit, fire, zoning, ADU, stormwater,
or CalGreen question — READ the relevant `knowledge/` file FIRST. Do not answer
from memory alone. The files are the authoritative source; your training data is not.

### Shared (statewide / CBC)

| Topic | File |
|---|---|
| California codes overview | `knowledge/_shared/california-codes-overview.md` |
| CBC occupancy & construction types | `knowledge/_shared/cbc-occupancy-and-construction-types.md` |
| CBC fire & materials | `knowledge/_shared/cbc-fire-and-materials.md` |
| Statewide ADU law (SB 9, AB 68…) | `knowledge/_shared/statewide-adu-law.md` |
| Title 24 energy | `knowledge/_shared/title24-energy.md` |
| CalGreen | `knowledge/_shared/calgreen.md` |
| Stormwater — construction | `knowledge/_shared/stormwater-construction.md` |
| Accessibility (CBC 11A/11B) | `knowledge/_shared/accessibility-cbc-11a-11b.md` |

### Checklists

| Checklist | File |
|---|---|
| ADU fast-track | `knowledge/_checklists/adu-fast-track-checklist.md` |
| CalGreen compliance | `knowledge/_checklists/calgreen-compliance-checklist.md` |
| Correction response | `knowledge/_checklists/correction-response-checklist.md` |
| Pre-submittal audit | `knowledge/_checklists/pre-submittal-audit.md` |

### Jurisdiction Files

| Jurisdiction | Fire | ADU/SB9 | Permits | Zoning | CalGreen/Energy | Stormwater | Forms |
|---|---|---|---|---|---|---|---|
| **Garden Grove** | `garden-grove/fire-ggfd.md` | `garden-grove/adu-and-sb9.md` | `garden-grove/permits-and-submittals.md` | `garden-grove/zoning-and-development-standards.md` | `garden-grove/calgreen-energy.md` | `garden-grove/stormwater-grading.md` | `garden-grove/forms-index.md` |
| **Santa Ana** | `santa-ana/fire-safd.md` | `santa-ana/adu-and-sb9.md` | `santa-ana/permits-and-submittals.md` | `santa-ana/zoning-and-development-standards.md` | `santa-ana/calgreen-energy.md` | `santa-ana/stormwater-grading.md` | `santa-ana/forms-index.md` |
| **Chula Vista** | `chula-vista/fire-cvfd.md` | `chula-vista/adu-and-sb9.md` | `chula-vista/permits-and-submittals.md` | `chula-vista/zoning-and-development-standards.md` | `chula-vista/calgreen-energy.md` | `chula-vista/stormwater-grading.md` | `chula-vista/forms-index.md` |
| **Escondido** | `escondido/fire-efd.md` | `escondido/adu-and-sb9.md` | `escondido/permits-and-submittals.md` | `escondido/zoning-and-development-standards.md` | `escondido/calgreen-energy.md` | `escondido/stormwater-grading.md` | `escondido/forms-index.md` |
| **Orange County** | `orange-county/fire-ocfa.md` | `orange-county/adu-and-sb9.md` | `orange-county/permits-and-submittals.md` | `orange-county/zoning-unincorporated.md` | `orange-county/calgreen-energy.md` | `orange-county/stormwater-wqmp.md` | `orange-county/forms-index.md` |
| **SD City** | `san-diego-city/Reference/Regulation/fire-code-local-amendments.md` | `san-diego-city/Reference/Regulation/adu-and-sb9.md` | `san-diego-city/Reference/Regulation/permits-and-submittals.md` | `san-diego-city/Reference/Regulation/zoning-development-standards.md` | `san-diego-city/Reference/Regulation/energy-and-title24.md` | `san-diego-city/Reference/Regulation/stormwater-and-grading.md` | `san-diego-city/Reference/Form/forms-index.md` |
| **SD County** | `san-diego-county/fire-and-wildfire.md` | `san-diego-county/adu-and-sb9.md` | `san-diego-county/permits-and-submittals.md` | `san-diego-county/zoning-and-land-use.md` | `san-diego-county/calgreen-and-energy.md` | `san-diego-county/grading-drainage-stormwater.md` | `san-diego-county/forms-index.md` |

All paths above are relative to `knowledge/`. Prefix with `knowledge/` when reading.

---

## Handoff Notes (last updated 2026-04-26)

### Knowledge base is the answer source
- The `knowledge/` folder contains jurisdiction-specific regulatory files covering
  fire code, ADU/SB9, permits, zoning, CalGreen, stormwater, and forms.
- These files were migrated from PlanCheck-Planner and ProjectBook-Planner when
  Master-ProjectLibrary was created as the consolidated monorepo.
- **Agent instruction:** Always read the relevant file before answering. The
  jurisdiction table above maps every topic to its file path.

### Prior fire code conversations (PlanCheck-Planner → Master)
- Fire sprinkler and fire code discussions happened in PlanCheck-Planner sessions
  before the Master consolidation. All fire knowledge files are now canonical here.
- Key fire files confirmed present and up-to-date as of 2026-04-26:
  `fire-ggfd.md`, `fire-safd.md`, `fire-cvfd.md`, `fire-efd.md`,
  `fire-ocfa.md`, `fire-code-local-amendments.md`, `fire-and-wildfire.md`,
  `cbc-fire-and-materials.md`
