---
name: arc-polygon
description: How GIS arc detection works — grouping tiny polygon segments into arc runs for clean dim labels and setback offsets. Use when curved parcel boundaries show garbled/stacked dims, wild setback lines, or when adding a new site with many short polygon segments.
---

GIS-approximated curved lot lines (road curves, rounded corners) are stored as many
tiny polygon vertices. Without grouping, each segment gets its own dim label and its
own setback offset edge — producing stacked text and wild-shooting intersection lines.

## Arguments

- `$ARGUMENTS` — symptom or task (e.g. "dims garbled on curved site", "setback fans out at arc",
  "new site has 50+ short polygon segments", "tune threshold for this site")

## Where the algorithm lives

**Two copies** (intentional — engines may not call each other):

| File | Function | Purpose |
|---|---|---|
| `src/js/engine-map.js` | `updateDimLabels()` | Groups arc segs → one dim label per arc |
| `src/js/engine-setback.js` | `drawSetbacks()` | Groups arc segs → one chord edge per arc for offset polygon |

## The algorithm (4 passes)

### Constants (same in both places)
```javascript
var ARC_DEGEN     = 0.1;  // ft — skip truly degenerate/zero-length segments
var ARC_MAX_SEG   = 6;    // ft — segment shorter than this is an arc candidate
var ARC_MIN_RUN   = 4;    // minimum consecutive short segs to call it an arc
var ARC_LEN_RATIO = 2.0;  // max length ratio between adjacent segs in same arc
```

### Pass 1 — raw segments
Build `rawSegs[]` from `lotVerts` with `{ p1, p2, dx, dy, len }` per segment.

### Pass 2 — group into straight + arc runs
```
while si < rawSegs.length:
    s = rawSegs[si]
    if s.len < ARC_DEGEN: skip (degenerate)
    if s.len < ARC_MAX_SEG:
        collect run while next seg is:
            - len >= ARC_DEGEN (not degenerate)
            - len < ARC_MAX_SEG (still short)
            - len / prev_len within [1/ARC_LEN_RATIO, ARC_LEN_RATIO]  ← SPLITS different-radius arcs
        if run.length >= ARC_MIN_RUN: push arc group
    else: push straight group
```

The **length-ratio check** is critical: a 1 ft/seg arc immediately followed by a 2 ft/seg
arc (ratio = 2.0) hits the boundary exactly and splits correctly into two separate arcs.

### Pass 3 — wrap-around merge
GIS polygons often start mid-arc. If `groups[0]` and `groups[last]` are both arcs
**and** their average segment lengths are compatible (ratio ≤ ARC_LEN_RATIO), merge them:
```javascript
groups[0].segs = groups.pop().segs.concat(groups[0].segs)
```
This handles the WA-405 case: the right-corner arc is split across polygon vertex 0.

### Pass 4 — build output
- **Straight group**: one dim edge / one offset edge, same as before.
- **Arc group (dims)**: one dim label at arc midpoint vertex, chord dim line, label = `arcLen.toFixed(1) + ' FT ⌒'`.
- **Arc group (setbacks)**: one chord edge `{ p1: run[0].p1, p2: run[last].p2 }` — treated as a straight edge for offset polygon.

## Real-world site: WA-405 (81 vertices)

```
Segs 0–11:   12 × 2.099 ft  → arc A (right-corner arc, start half)
Segs 12–15:  4 straight edges (70, 118, 89, 35 ft)
Segs 16–73:  57 × ~0.998 ft + seg 73-74 at 0.834 ft → arc B (big top curve, ~58 ft)
Segs 74–80:  7 × 2.097 ft  → arc C (right-corner arc, end half)
```

Result after grouping:
- Merged arc (C + A via wrap-around): `39.9 FT ⌒`  — right-corner round
- Arc B: `58.7 FT ⌒` — big top curve
- 4 straight edges: 70.1, 118.9, 89.5, 35.6 FT

**Why segs 16–73 were broken before**: lengths like 0.998 ft were rejected by the old
`>= 1` check (threshold was 1 ft, not 0.1 ft). Every arc segment showed as an individual
label → 58 stacked "1.0 FT" labels.

## Tuning for a new site

| Symptom | Likely cause | Adjustment |
|---|---|---|
| Arcs still stacked | Segment lengths < ARC_DEGEN (0.1 ft) | Lower ARC_DEGEN |
| Short jogs grouped as arcs | ARC_MIN_RUN too low | Raise ARC_MIN_RUN |
| Two separate arcs merged into one | ARC_LEN_RATIO too high | Lower ARC_LEN_RATIO |
| Arc split into two when it shouldn't | Length variation within one arc | Raise ARC_LEN_RATIO slightly |
| Wrap-around merge joins wrong arcs | Compatible lengths but different physical arcs | Lower ARC_LEN_RATIO for the merge check |

## Key invariant

Both copies of the algorithm MUST stay in sync. When tuning constants in one engine,
update the other engine too. The variable names are prefixed `_` in `drawSetbacks()`
to avoid collision with outer scope.
