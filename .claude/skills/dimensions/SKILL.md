---
name: dimensions
description: How dimension lines work — chain dims, witness lines, perpendicular measurements, hiding segments, repositioning chains. Use when dims look wrong or when modifying dimension behavior.
---

Complete reference for the dimension system — how measurements are drawn, hidden, and repositioned.

## Arguments

- `$ARGUMENTS` — what's happening (e.g., "dims at wrong angle", "witness line crosses boundary", "chain missing segment", "how to add new dim type")

## Owner

**ALL dimension drawing is SetbackEngine** (`engine-setback.js`).
- Lot perimeter dims: `updateBldgDimLabels()`
- Building chain dims: `updateBldgDimLabels()`
- Witness lines: `drawChain()` inside `updateBldgDimLabels()`

MapEngine does NOT draw dimension lines. It only provides the map object for Leaflet layer placement.

## The Chain Concept

Instead of individual per-building dimensions, the system draws **continuous chains** across the full lot:

- **Depth chain** — runs along the lot depth axis (front-to-rear). Shows: lot front edge, each building front/rear edge, lot rear edge.
- **Width chain** — runs along the lot width axis (left-to-right). Shows: lot left edge, each building left/right edge, lot right edge.

Each chain is an ordered list of boundary points. The distance between consecutive points = one labeled segment. Shared boundaries between buildings create one witness line serving both adjacent segments.

## How It Works (Step by Step)

### 1. Collect boundary points

Two arrays built before drawing:
- `dPts` (depth): starts with rear lot edge (`-lotHalfDepth`) and front lot edge (`+lotHalfDepth`), then adds front/rear of every building copy
- `wPts` (width): starts with left/right lot edges, then adds left/right of every building

Building edges come from `_buildingExtents()`: `cx +/- halfDepth`, `cy +/- halfWidth`

Both arrays: deduplicated, sorted. The sorted array IS the chain.

### 2. Draw each chain segment

`drawChain(chain, refCoord, isX, perpX, perpY, rotDeg, prefix)`:
- `refCoord` — perpendicular position where the dim line runs (offset from building edge)
- `perpX, perpY` — unit vector pointing away from lot (which side to draw on)
- For each adjacent pair of points: draw dim line split around label, two 45-degree tick marks, text label with distance in feet

### 3. Witness lines

At every boundary position: a short line perpendicular to the chain, extending from the building/lot edge out to the dim line + 2ft overshoot.
- `EXT = 5 ft` — offset from building edge to dim line
- `EX2 = 2 ft` — overshoot beyond dim line
- Total witness length: 7 ft from boundary

### 4. Perpendicular measurement guarantee

ALL geometry is in the rotated local frame (Frame B). +X = rear, +Y = right side. Because everything is in the same frame, every distance between chain points is an exact perpendicular measurement — regardless of lot rotation on the map.

**18.0 ft** in the depth chain means exactly 18.0 feet between those two surfaces, measured at a right angle.

## Coordinate Frame & Rotation

**Frame B (Lot-Aligned Feet)** — SetbackEngine only.
- Origin: (0,0) = lot center
- +X = toward rear, +Y = toward right side
- All chain math happens here

### The single control variable: `frontBearing`

**`state.frontBearing`** (degrees, 0=N, 90=E, 180=S, 270=W) is the ONE value that
controls chain dim orientation. Everything else is derived:

```
frontBearing → lRad → lCos/lSin → toLatLng, polygon conversion, building positions, label angles
```

The rotation used for chain dims:
```javascript
const fb   = (state.frontBearing ?? 270) * Math.PI / 180;
const lRad = -(Math.PI / 2 + fb);
```

- **FB=270° (default):** lRad=0 → chain bars along geographic east/north (rectangular lots)
- **FB=240° (Palmyra):** lRad=30° → chain bars rotated 30° to match polygon edges
- **FB=any value:** chain bars perpendicular to the lot edge that faces that bearing

### Why not `state.rotation` or `effectiveRotation()`?

| Value | Perpendicular? | Tumbles on rotate? | Why |
|---|---|---|---|
| `state.rotation` | Yes at calibrated angle | **YES** — stays fixed on screen | Changes with slider; setBearing cancels it |
| `effectiveRotation()=0` | **NO** — follows geographic axes | No | Doesn't match polygon lot edges |
| `frontBearing`-derived | **YES at ALL angles** | **No** | Fixed per-site; rotates with canvas under setBearing |

### Set Front Edge → frontBearing (sub-degree precision)

The "Set Front Edge" button picks a polygon edge and computes the outward normal bearing
to 2 decimal places. This gives pixel-perfect chain dim alignment with the polygon edge.
Bearing is stored in `saved.frontBearing` and persisted via `_payload()`.

### Conversion (in updateBldgDimLabels):
```
rx = px * cos(lRad) - py * sin(lRad)
ry = px * sin(lRad) + py * cos(lRad)
lat = state.lat + ry / F_LAT
lng = state.lng + rx / F_LNG
```

### Building positions in chain dims

Building positions are computed geographic-first (matching drawBuilding), then
rotated to the lot frame for axis-aligned measurements:
```javascript
const geoX = (front - rear) / 2 + offsetX;  // geographic, same as drawBuilding
const geoY = (sideR - sideL) / 2 + offsetY;
const baseCx = geoX * lCos + geoY * lSin;   // rotate to lot frame
const cy     = -geoX * lSin + geoY * lCos;
```

### Label angles

Derived from lotDeg so text stays parallel to chain bars at any map rotation:
```javascript
const lotDeg = lRad * 180 / Math.PI;
const clrDepthAngle = -lotDeg;          // depth chain along lot depth axis
const clrWidthAngle = -(90 + lotDeg);   // width chain along lot width axis
```
CSS formula `normAngle(rotDeg - state.rotation)` handles the screen angle.

## User Interactions

### Click-to-hide
- Click any dim segment label → adds key to `hiddenDimKeys` Set
- Key format: `chain_w_3` (width chain, segment 3) or `chain_d_1` (depth chain, segment 1)
- Hidden segments skipped on next redraw
- Persisted in `_payload().saved.hiddenDimKeys` as array
- Restored as `new Set()` in MapEngine on load

### Chain repositioning (drag)
- Enable dim drag mode via toggle button (or click any chain line to get a handle)
- Drag chain dim line perpendicular to its direction
- Updates `chainWOffset` or `chainDOffset` in real time
- **Threshold snap (4 ft):** snaps to lot edges and building boundaries only when within 4 ft — freely draggable between anchors
- **Hard clamped to lot bounds:** `wRef` and `dRef` cannot go outside `[-lotHD, lotHD]` / `[-lotHW, lotHW]`; stale offsets auto-correct on first render
- `snapTo(val, anchors, minBound, maxBound)` — always returns a value within `[minBound, maxBound]`
- Saved in `_payload()` → persists across reloads

## Constants

| Name | Value | Purpose |
|---|---|---|
| EXT | 5 ft | Perpendicular offset from building edge to dim line |
| EX2 | 2 ft | Witness line overshoot beyond dim line |
| TK | 1.2 ft | Half-length of 45-degree tick marks |
| F_LAT | 364,566 | ft per degree latitude |
| F_LNG | 365,228 * cos(lat) | ft per degree longitude |

## Known Bugs

### KB-1: Fixed (2026-04-08)
- Chain dim coordinate bounds (`wPts/dPts`, clamp, anchors, perp direction) used `±lotHD/lotHW`
  centered at 0, but polygon lot extent in lot-frame may be far from 0 (e.g. Cannington X=97–151 ft)
- Fix: define `dMin/dMax/wMin/wMax/dCtr/wCtr` from actual cMin/cMax values, use throughout

### KB-2: Witness lines cross property boundary
- Witness lines extend 7ft with no boundary clipping
- On irregular polygons or buildings near lot edges, lines cross the property line
- Fix: clamp witness endpoint to polygon boundary via `polyExtentAt()` (needs KB-1 fixed first)

## Common Debug Scenarios

| Symptom | Check |
|---|---|
| Dim line at wrong angle | Is `frontBearing` correct? Re-pick via "Set Front Edge" button |
| Dims don't appear | Is `showBldgDims` true? Check the toggle state |
| Segment missing | Is it in `hiddenDimKeys`? Check Set contents |
| Wrong distance shown | Check `_buildingExtents()` — is the bounding box correct for the building orientation? |
| Chain on wrong side of lot | Check `perpX/perpY` direction and `refCoord` offset |
| Dims overlap each other | Check `chainWOffset/chainDOffset` — may need repositioning |
| Witness line crosses boundary | KB-2 — no fix yet, cosmetic issue |
| Polygon lot dims wrong | KB-1 — centroid vs pin origin mismatch |
