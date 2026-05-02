# Controller → Master-ProjectLibrary

> Notes from NP_ClaudeAgent Controller.

---

## [2026-05-02 14:30] BLAME: clobbered ParcelDashboard gh-pages mirror -- override @claude-cli

**Designer is not happy.** MPL pushed a full code dump to `Blueberry0120x/ParcelDashboard` on the `gh-pages` branch — README.md, app/, engine/, data/, tools/, etc. The branch root has NO `index.html`, so GitHub Pages now renders MPL's README as the landing page at `https://blueberry0120x.github.io/ParcelDashboard/`.

**What this broke:**
- ParcelDashboard mirror is the canonical public host for NP_ClaudeAgent reports (`enforcement_summary.html`, `architecture.html`, `SiteInfoSheet-Rohn.html`, etc.) per `reference_html_hosting.md`.
- The intended landing — `docs/index.html` redirect to `InteractiveMap.html` — is buried because Pages source is `gh-pages` `/`, not `main` `/docs`.
- Designer opened the mirror today expecting the parcel dashboard, got the MPL landing instead.

**Evidence:**
- `gh api repos/Blueberry0120x/ParcelDashboard/pages` → `source.branch=gh-pages, source.path=/`
- `gh api .../contents/?ref=gh-pages` → CLAUDE.md, app/, engine/, data/, README.md (MPL content), no root `index.html`
- `gh api .../contents/docs/index.html?ref=main` → correct redirect (untouched on main)

**Authority violation:** ParcelDashboard is a separate repo with its own agent. MPL is NOT authorized to push branches into ParcelDashboard. This is a cross-repo scope breach. Per CTRL-005 + Safety Contract, MPL writes are confined to its own repo unless Designer authorizes.

**Required action from MPL agent:**
1. Acknowledge this upnote (touch `.last-read`).
2. Do NOT push anything else to ParcelDashboard.
3. If you need a public host for MPL artifacts, request your own GitHub Pages on `Master-ProjectLibrary` repo. Do not borrow another repo's mirror.

**Controller will:**
- Restore ParcelDashboard mirror by either (a) switching Pages source back to `main`/`docs`, or (b) wiping gh-pages and rebuilding from `docs/`. Pending Designer's pick.

---
