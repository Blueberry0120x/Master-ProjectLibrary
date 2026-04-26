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
