# 2921-2923 El Cajon Blvd — Design Notes
APN 446-232-04-00 | CC-3-9 | North Park, San Diego CA 92104

---

## Building Layout

### Cross-Section (side view, El Cajon Blvd → Alley)

```
         El Cajon Blvd side                          Alley side
         ──────────────────                          ──────────
  22ft                                         ┌──────────────────┐ ← flat roof (existing, retained)
                                               │   2nd floor      │   10-ft ceiling
                                               │   Unit A | Unit B│ ← CBC 1030 escape windows
  11ft                                         │──────────────────│ ← new floor deck (10-ft ground + 1-ft slab)
  12ft   ┌──────────────────┐ ← front roof     │                  │
         │                  │   (flat, ~12ft)   │   Ground floor   │   10-ft ceiling
         │   Digital Gym    │                   │   Unit A | Unit B│ ← private door → alley
         │   Group B        │                   │                  │
         │   ~12-ft tall    │___6-ft gap________│                  │
   0ft   └──────────────────┘  (underpass)      └──────────────────┘
                                                  46-ft wide total
```

### Floor Plan (each floor, identical 1st and 2nd)

```
← 46 ft wide →
┌─────────────┬─┬─────────────┐
│             │ │             │
│   Unit A    │F│   Unit B    │
│  ~20' wide  │W│  ~20' wide  │
│   40' deep  │ │   40' deep  │  FW = CBC 706 fire wall
│   ~800 SF   │ │   ~800 SF   │
│  own stair  │ │  own stair  │
│  own door   │ │  own door   │
└─────────────┴─┴─────────────┘
      ↓ alley          ↓ alley
```

### Key Dimensions

| Element | Dimension | Note |
|---|---|---|
| Rear shell width | ~46 ft | Existing exterior walls retained |
| Rear shell depth | ~40 ft | From back of front building to alley |
| Rear shell height | ~22 ft | Existing flat roof retained, no change |
| Front building height | ~12 ft | Digital Gym, Group B, single story + mezzanine |
| New floor deck (AFF) | ~11 ft | 10-ft ground floor + 1-ft slab assembly |
| Height delta front/rear | ~1 ft | Front roof at 12 ft, rear 2nd floor at 11 ft — near-flush |
| Ground-level gap | 6 ft | Covered underpass at junction (overhang belongs to front B) |
| Unit width | ~20 ft each | Split by center fire wall |
| Unit depth | 40 ft | Full shell depth |
| Unit GBA | ~800 SF/floor, ~1,600 SF total (2-story townhouse) | Each unit |
| Total converted GBA | ~3,680 SF | 1,840 SF/floor × 2 floors |

---

## Design Strategy — Sprinkler Avoidance

### The Problem
A shared central corridor (original layout concept) forces **R-2 multifamily** classification.
CBC 903.2.8 requires NFPA 13R sprinklers for R-2 with 4+ units. Cost and scope impact: major.

### The Solution: R-3 Townhouse Path
Eliminate the shared corridor entirely. Each unit is a **2-story townhouse (Group R-3, CBC 310.5)**
with its own private internal staircase and its own private ground-floor exit to the alley.

**Code chain:**
- No shared corridor → each unit has independent exterior egress → R-3 (CBC 310.5)
- R-3 classification → CBC 903.2.8 does not apply (that section covers R-2 only)
- **Result: no NFPA 13R required**

### What the R-3 Path Requires

| Requirement | Code | What It Means Here |
|---|---|---|
| Fire wall between units | CBC 706 | Structurally independent wall, continuous from footing through floor deck to roof plane |
| CBC 706.4 structural independence | CBC 706.4 | New wall cannot rely on existing exterior walls for lateral support — own footing, own lateral bracing |
| Private exit to grade | CBC 1006 | Each unit ground-floor door opens directly to alley — no shared path |
| Emergency escape (sleeping rooms) | CBC 1030 | Windows in upper-floor sleeping rooms — toward alley preferred; front roof acceptable per DSD Q5 confirmation |
| Path-of-travel upgrades (COO) | IEBC 705 / CBC 11B-202.4 | 20% valuation cap may limit scope — ask DSD Q7 |

### Trade-Off Accepted
| | Original (shared hallway) | Revised (R-3 townhouse) |
|---|---|---|
| Units | 4 (2 per floor) | 2 (each 2-story) |
| Sprinklers | NFPA 13R required | Not required |
| Shared corridor | Yes (6-ft × 40-ft) | No — eliminated |
| Unit size | ~800 SF each | ~1,600 SF each (2-story) |
| Egress | Shared corridor to alley | Private stair + private door to alley |

---

## Interface Conditions

### Ground Level — The Underpass
At the rear wall of the front building, an existing overhead overhang (belonging to the
Digital Gym Group B structure) creates a covered underpass with ~6 ft of clear headroom.
This is the ground-level junction between the Group B front and Group R-3 rear.

**Fire concern:** This underpass is the spatial gap at the B/R-3 interface.
DS-375 Q4 asks DSD to specify the required separation assembly (fire wall, fire barrier,
or fire partition) at this junction — both at ground level (underpass zone) and at
upper level (where front roof meets rear wall).

### Upper Level — Front Roof as Emergency Escape Platform
The front building's flat roof sits at ~12 ft AFF. The rear warehouse 2nd floor deck
is at ~11 ft AFF — approximately flush (~1 ft step up to front roof).

The front Group B building has an existing interior roof-access stair/hatch from
its ground floor, providing a path from the front roof back to grade.

**Design use:** CBC 1030 emergency escape windows on the 2nd floor of each R-3 unit
can open toward the front building's flat roof. Occupants escape: window → front roof
(~1 ft step up) → existing roof access stair inside Digital Gym → grade.

**DS-375 Q5** asks DSD to confirm this path is an acceptable CBC 1030 discharge
location, or whether windows must face the alley directly.

---

## DS-375 Strategy

10 questions, IB-513 compliant (1 question per entry, code citation, assigned discipline).

**Fire-focused questions (highest priority):**
- Q1 — R-3 classification via CBC 706 fire wall → sprinkler exemption confirmation
- Q2 — CBC 706.4 structural independence detail acceptable in existing shell
- Q4 — Occupancy separation at the unusual B/R-3 interface (underpass + roof junction)
- Q5 — CBC 1030 escape windows: front roof acceptable, or alley-facing required?

**Remaining questions:**
- Q3 — IEBC compliance path for the COO
- Q6 — Structural analysis of existing walls for new floor deck loads
- Q7 — Accessibility path-of-travel and 20% cap
- Q8 — CCHS/TAOZ density for COO with no new footprint
- Q9 — IHO threshold for 2 R-3 units
- Q10 — Right-of-way triggers for interior-only COO

---

## Two-Repo Agreement

| Field | ProjectBook (`ca-2921_ElCajon.json`) | PlanCheck (`site_data.json`) |
|---|---|---|
| Scope | ✓ Interior COO, R-3 townhouses, CBC 706 FW, no sprinklers | ✓ Same |
| fire_sprinklers | — (not a PB field) | `false` |
| proposed stories | `saved.buildings[0].stories = 2` | `project.proposed.stories = "2"` |
| Occupancy | `occupancyGroup: "B"` (existing) | `proposed.occupancy: "B (front) + R-3 (rear)"` |
| DS375 questions | — (PlanCheck owns) | 10 questions, R-3/fire-wall path |
