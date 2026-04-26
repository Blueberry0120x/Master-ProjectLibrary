---
name: folder_structure
description: Complete folder structure of repo (local) and Dropbox (cloud/legacy) as of 2026-04-26. Dropbox is read-only — never touch without explicit user confirmation.
type: reference
---

# Folder Structure — 2026-04-26

## Rule
Dropbox = cloud. Read-only. Never create, delete, or modify anything there without explicit user confirmation.
Repo = local. Only place Claude writes to.

---

## REPO — Master-ProjectLibrary/ (Local — writable)

```
Master-ProjectLibrary/
├── CLAUDE.md / README.md / RemoteController.cmd
├── .claude/
│   ├── commands/     check-pings, cleanup, done, repo-check, scaffold
│   ├── hooks/        17 hook scripts
│   ├── memory/       this file
│   ├── skills/       arc-polygon, data-parse, debug-symptom, dim-merge,
│   │                 dimensions, engine-contract, engine-lookup, gis-intake,
│   │                 lisp-export, lot-boundary, map-sync, pr-merge,
│   │                 public-sync, save-flow, setback-dims, site-retain, site-scout
│   └── settings.json
├── .github/workflows/
│   mirror-public, notify-controller, post-merge, push-notify
├── app/
│   ├── src/
│   │   ├── html/     index.html, checklist.html, siteinfo.html
│   │   └── js/       engine-config, engine-ui, engine-map, engine-elevation,
│   │                 engine-setback, engine-export, engine-vertex,
│   │                 engine-resize, bootstrap
│   ├── docs/         built HTML (InteractiveMap, PreApp_Checklist, SiteInfoSheet,
│   │                 SiteInfoSheet-Rohn, architecture, index)
│   └── UserPref.json
├── Output/
│   ├── InteractiveMap.html
│   ├── PreApp_Checklist.html
│   ├── SiteInfoSheet.html
│   ├── SiteInfoSheet-Rohn.html
│   ├── CostBreakdown-ElCajon.html
│   ├── CostBreakdown-Euclid.html
│   ├── architecture.html
│   └── permits/
│       ├── ElCajon_2921/   01-app_DS-375.pdf
│       └── Euclid_4335/    01-app_DS-375.pdf
├── data/sites/
│   ├── ca-2921-el-cajon/       site_data.json
│   ├── ca-3063-cabrillo-mesa/  site_data.json
│   ├── ca-4335-euclid/         site_data.json
│   │                           Survey_c26006tha_TOPO_04-06-26.pdf   ← survey PDF
│   │                           Survey_c26006tha_TOPO_04-06-26A.dwg  ← survey CAD
│   ├── ca-4876-cannington/     site_data.json
│   ├── ca-5251-palmyra/        site_data.json
│   ├── ca-9362-angwin/         site_data.json
│   ├── ca-11001-westminster/   site_data.json
│   ├── ca-12652-laux/          site_data.json
│   ├── ca-1905-rohn/           site_data.json
│   │                           1905 Rohn Rd.dwg       ← survey CAD
│   │                           1905_ROHN_SV-01.dwg    ← survey CAD
│   ├── wa-10404-kirkland/      site_data.json
│   ├── wa-12843-175th/         site_data.json
│   └── wa-405-126th/           site_data.json
└── tools/
    └── build.py
```

---

## DROPBOX — ADEC - PROJECT FOLDER/ (Cloud — READ ONLY)

### Active site folders (match repo sites)
| Folder | Key files |
|--------|-----------|
| `2921–2923 El Cajon Blvd/` | 22367-7-D.pdf, 323-5-D.pdf, 35291-D.pdf, CA-ElCajon.rvt, archive/ |
| `4335 Euclid Ave San Diego, CA  92115/` | Survey PDF+DWG, 4x RVT, CAD/, FROM ACONS/, Reference/, archive/ |
| `1905 Rohn Rd Escondido, CA  92025/` | Plans PDFs, Survey/ (2x DWG), Pictures/, FROM ACONS/, archive/ |
| `12652  Laux Ave, Garden Grove, CA 92840/` | RVT, prelim title PDF, photos, archive/ |
| `5251 Palmyra Ave, San Diego CA 92117/` | Site visit MOVs only |
| `9362 Angwin Pl San Diego, CA  92123 United States/` | Site visit MOVs only |
| `405 SW 126th St Seattle, WA  98146/` | Empty |

### No Dropbox folder (repo only)
- ca-3063-cabrillo-mesa
- ca-4876-cannington
- ca-11001-westminster
- wa-10404-kirkland
- wa-12843-175th

### Other Dropbox folders (not in repo — separate projects)
- `23175 Palomar St Murrieta, CA 92562/`
- `3933-41 Utah St/`
- `5552 Redwood St/`
- `907 Orchid Way/`
- `In Progess Project/`
- `Project Archived - Need Review - NP/` (Cannington_CAD, old Euclid, Redwood, 907 Orchid, National City ADU)
