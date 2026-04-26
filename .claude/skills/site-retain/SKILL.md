---
name: site-retain
description: How each site's saved state is retained, restored on switch, and reverted on reset. Use when site data doesn't load, reset jumps to wrong site, or adding a new site.
---

How site data survives across page loads, site switches, and resets. The single most common bug class in this project.

## Arguments

- `$ARGUMENTS` -- what's happening (e.g., "site switch loses buildings", "reset jumps to wrong site", "new site has no saved data", "field missing after reload")

## The Retention Chain (4 Layers)

```
Layer 1: JSON on disk         data/sites/ca-4335_Euclid.json  (.saved key)
    |
Layer 2: Build injection      __SITE_DEFAULTS__  (active site, merged .site + .saved)
    |                         __ALL_SITE_DATA__  (every site, for offline switching)
    |
Layer 3: ConfigEngine.init()  Loads state from:
    |                           1st: localStorage.site_state  (if siteId matches)
    |                           2nd: __SITE_DEFAULTS__        (fallback)
    |                         Then snapshots → ConfigEngine.siteDefaults
    |
Layer 4: Runtime              ConfigEngine.state  (live, mutated by user actions)
                              ConfigEngine.siteDefaults  (frozen at init, used by reset)
```

## Site Switching Flow

### Online (localhost dev server)

1. User selects site from dropdown
2. `switchSite(siteId)` in bootstrap.js:
   - Sets `localStorage.selected_site = siteId`
   - **Clears** `localStorage.site_state` (prevents cross-site bleed)
   - POST `/api/sites/{siteId}/activate` -- server updates pointer + rebuilds
   - `location.reload()` -- fresh page with new `__SITE_DEFAULTS__`
3. On reload: `ConfigEngine.init()` reads new `__SITE_DEFAULTS__` (no localStorage)
4. All state fields loaded from the new site's `.saved` data

### Offline (file://)

1. Same dropdown selection
2. `switchSite(siteId)`:
   - Sets `localStorage.selected_site = siteId`
   - Clears `localStorage.site_state`
   - `location.reload()` (no server POST)
3. On reload: bootstrap.js IIFE (lines 45-53) checks `selected_site`:
   - If it differs from `__SITE_DEFAULTS__.siteId`, swaps:
     `window.__SITE_DEFAULTS__ = window.__ALL_SITE_DATA__[selectedId]`
   - This runs BEFORE `ConfigEngine.init()`
4. `ConfigEngine.init()` reads the swapped `__SITE_DEFAULTS__` -- sees new site data

### Cross-site bleed guard

`ConfigEngine.init()` line 86-92: if localStorage `site_state` has a different `siteId` than the current site, it's **deleted**. This prevents stale data from a previously visited site from contaminating the current one.

## Reset Flow

`ConfigEngine.reset()` reverts state to `ConfigEngine.siteDefaults` -- a deep-copy snapshot taken at the end of `init()`.

**What siteDefaults contains:**
```
lat, lng, rotation, locked, setbacks, buildings, activeBuilding,
commFront, showBldgDims, hiddenDimKeys, chainWOffset, chainDOffset,
mapOpacity, setbacksApplied, freeDrag, snapEdge, siteNorthDeg,
vehicles, activeVehicle
```

**NOT in siteDefaults (session-only, survive resets in MapEngine memory):**
```
mergedDimKeys   — merged dim segments (MapEngine.mergedDimKeys Set)
propDimOffsets   — per-dim drag offsets (MapEngine._propDimOffsets object)
parcelPolygon    — lives in ConfigEngine.data, not .state
```

These are saved to disk via `_payload()` but intentionally not snapshotted or reset — they accumulate during a session and persist across resets.

**Why siteDefaults exists:** Without it, reset() used hardcoded generic values (lat/lng from source code, generic setbacks, empty buildings). This caused reset to jump to a different location and lose the site's building layout.

**Reset does NOT:**
- Change the active site
- Clear siteDefaults itself
- Reload from the server

**After reset, MapEngine syncs UI from the restored state:**
- Lock button reflects `state.locked`
- CommFront checkbox reflects `state.commFront`
- Dim button reflects `state.showBldgDims`
- Setback inputs reflect `state.setbacks`
- Building selector rebuilt from `state.buildings`

## Recenter Flow

The recenter button (compass icon, top-left) pans the map to the current lot position:
- If `lotPoly` exists and has valid bounds: `map.fitBounds(lotPoly.getBounds())`
- Otherwise: `map.setView([state.lat, state.lng], 19)`

Recenter reads from `ConfigEngine.state`, which always reflects the current site after init or reset. No special handling needed.

## ConfigEngine.init() -- Full Field Loading

Both load paths (localStorage and __SITE_DEFAULTS__ fallback) MUST load the same fields. This is the canonical list:

```javascript
// These fields MUST appear in BOTH the localStorage path AND the fallback path:
lat, lng, rotation, locked,
setbacks: { front, rear, sideL, sideR },
buildings: [...],
activeBuilding,
commFront, showBldgDims,
hiddenDimKeys: [...],
chainWOffset, chainDOffset,
mapOpacity,
setbacksApplied,
freeDrag, snapEdge, siteNorthDeg,
vehicles: [...],
activeVehicle,
parcelPolygon (conditional)
```

**Common bug:** Adding a field to the localStorage path but forgetting the fallback path (or vice versa). The field works after save+reload but not after site switch.

## Adding a New Site

When creating a new site JSON (`data/sites/{state}-{id}_{name}.json`):

### Minimum viable .saved block
```json
{
  "saved": {
    "lat": 0.0,
    "lng": 0.0,
    "rotation": 0,
    "locked": false,
    "setbacks": { "front": 10, "rear": 10, "sideL": 0, "sideR": 0 },
    "buildings": [{
      "orientation": 0, "W": 30, "D": 60,
      "offsetX": 0, "offsetY": 0,
      "count": 1, "stackSpacing": 0, "anchor": "center",
      "stories": 1, "floorHeight": 9
    }],
    "activeBuilding": 0,
    "commFront": false,
    "showBldgDims": false,
    "hiddenDimKeys": [],
    "chainWOffset": 0,
    "chainDOffset": 0,
    "mapOpacity": 60,
    "setbacksApplied": false,
    "freeDrag": true,
    "snapEdge": true,
    "siteNorthDeg": 0,
    "vehicles": [],
    "activeVehicle": -1
  }
}
```

**After creating:** Run `py tools/build.py` to inject into `__ALL_SITE_DATA__`. The site will appear in the dropdown. Select it, position the lot, save -- the saved block updates via POST /save.

## Adding a New Retained Field

This is the most error-prone operation. Follow ALL steps:

1. **ExportEngine._payload()** -- add the field to `.saved` (this is the spec)
2. **ConfigEngine.init() localStorage path** -- restore from `saved.newField`
3. **ConfigEngine.init() fallback path** -- restore from `sd.newField` (SAME logic)
4. **ConfigEngine.siteDefaults snapshot** -- add to the snapshot object at end of init()
5. **ConfigEngine.reset()** -- restore from `d.newField` with fallback
6. **MapEngine reset handler** -- if field has UI, sync the DOM element
7. **ExportEngine.save()** -- if field has a UI input, sync input to state before _payload()

**Verification checklist:**
- [ ] Save on site A, reload -- field persists (localStorage path)
- [ ] Switch to site B, switch back to A -- field persists (fallback path)
- [ ] Reset on site A -- field reverts to site A's saved value (siteDefaults path)
- [ ] Open fresh (no localStorage) -- field loads from __SITE_DEFAULTS__ (fallback path)

## Debugging Retention Issues

| Symptom | Root Cause | Fix |
|---|---|---|
| Site switch loses all saved data | Fallback path missing fields | Add missing fields to the `else` block in init() |
| Reset jumps to wrong location | reset() using hardcoded defaults | Ensure reset() reads from siteDefaults |
| Reset loses buildings | siteDefaults not deep-copied | Use JSON.parse(JSON.stringify()) for objects/arrays |
| Field works after reload but not after switch | Field in localStorage path but not fallback path | Add to fallback path |
| Field works after switch but not after reset | Field missing from siteDefaults snapshot or reset() | Add to both |
| New site shows blank map | .saved block missing lat/lng | Add coordinates via GIS intake |
| Wrong site loads on cold open | `site-data.json` pointer wrong OR localStorage `selected_site` stale | Check both; clear localStorage |
| Euclid data degraded | .saved was overwritten during migration | Restore from stable tag (v4.2-euclid-final) |

## Stable Tags

When a site's configuration is verified correct, tag it:
```bash
git tag -a v{X}.{Y}-{site}-stable -m "Description of stable state"
```

Known stable tags:
- `v4.1-euclid-stable` -- Euclid early baseline
- `v4.2-euclid-final` -- Euclid with all critical fixes (3 buildings, commFront, setbacks)
- `v5.0-multisite-stable` -- Multi-site infrastructure

If a site's saved data gets corrupted, restore from the nearest stable tag:
```bash
git show v4.2-euclid-final:data/site-data.json
```

## Rules

- **Both init paths must be symmetric.** Every field in the localStorage path MUST also be in the fallback path.
- **siteDefaults is the reset anchor.** Never reset to hardcoded values. Always reset to siteDefaults.
- **Deep-copy mutable state.** Arrays and objects in siteDefaults and reset() MUST use JSON.parse(JSON.stringify()) or .slice(). Shared references cause silent mutation.
- **switchSite() MUST clear site_state.** Otherwise stale data from the previous site bleeds through.
- **Test retention on 3 scenarios:** fresh open (no localStorage), save+reload, and site switch+switch back.
- **Tag stable configs.** Before any migration or restructure, tag the known-good state.
