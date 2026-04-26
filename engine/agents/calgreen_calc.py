"""
CALGreen Construction Waste Estimation Calculator
City of San Diego - WMF Debris Table Generator

Usage:
  python calgreen_calc.py
  python calgreen_calc.py --sf 1200 --stories 2 --finish stucco
"""
from __future__ import annotations

import json
import argparse
from pathlib import Path

AGENTS_DIR = Path(__file__).resolve().parent
DATA_DIR = AGENTS_DIR.parent.parent / "data"

# CalRecycle base factor: 4 lbs/SF for new residential wood-frame
BASE_LBS_PER_SF = 4.0
CALGREEN_DIVERSION_PCT = 65.0  # percent


def load_factors() -> tuple[dict, dict]:
    data = json.loads((DATA_DIR / "debris_factors.json").read_text(encoding="utf-8"))
    return data['new_construction_wood_frame'], data['_notes']


def load_project() -> dict:
    return json.loads((DATA_DIR / "project_info.json").read_text(encoding="utf-8"))


def estimate_total_tons(sf, stories, finish):
    """
    Estimate total debris tonnage.
    - Base: 4 lbs/SF
    - 2-story stucco modifier: +4% (more wall area, stucco weight)
    """
    base_lbs = sf * BASE_LBS_PER_SF
    modifier = 1.0
    if stories >= 2 and finish.lower() == 'stucco':
        modifier = 1.04
    elif stories >= 2:
        modifier = 1.02
    total_lbs = base_lbs * modifier
    total_tons = total_lbs / 2000.0
    return round(total_tons, 2), modifier


def build_debris_table(total_tons, factors):
    """
    Distribute total tonnage across material types.
    Returns list of dicts with A (recycle), B (trash), C (total).
    """
    rows = []
    for material, props in factors.items():
        pct = props['pct_of_total']
        recycle_frac = props['recycle_fraction']
        if pct == 0.0:
            rows.append({
                'material': material,
                'A': 0.0,
                'B': 0.0,
                'C': 0.0,
                'hauler': '',
                'destination': '',
                'note': props['notes']
            })
            continue
        c = round(total_tons * pct, 2)
        a = round(c * recycle_frac, 2)
        b = round(c - a, 2)
        hauler = ''
        dest = ''
        if c > 0:
            hauler = 'EDCO'
            dest = 'Miramar Landfill' if recycle_frac == 0.0 else 'Miramar Greenery'
            if material == 'Mixed C&D Debris':
                dest = 'Miramar Greenery / Miramar Landfill'
        rows.append({
            'material': material,
            'A': a,
            'B': b,
            'C': c,
            'hauler': hauler,
            'destination': dest,
            'note': props['notes']
        })
    return rows


def calc_diversion(rows):
    total_a = sum(r['A'] for r in rows)
    total_b = sum(r['B'] for r in rows)
    total_c = sum(r['C'] for r in rows)
    diversion = (total_a / total_c * 100) if total_c > 0 else 0
    return round(total_a, 2), round(total_b, 2), round(total_c, 2), round(diversion, 1)


def print_table(rows, total_a, total_b, total_c, diversion_pct):
    header = (
        f"{'Material Type':<35} {'A (Recycle)':>12} {'B (Trash)':>10} "
        f"{'C (Total)':>10} {'Hauler':<8} {'Facility/Destination'}"
    )
    print(header)
    print('-' * 100)
    for r in rows:
        a_str = f"{r['A']:.2f}" if r['C'] > 0 else ''
        b_str = f"{r['B']:.2f}" if r['B'] > 0 else ''
        c_str = f"{r['C']:.2f}" if r['C'] > 0 else '0'
        print(
            f"{r['material']:<35} {a_str:>12} {b_str:>10} "
            f"{c_str:>10} {r['hauler']:<8} {r['destination']}"
        )
    print('-' * 100)
    print(
        f"{'TOTAL':<35} {total_a:>12.2f} {total_b:>10.2f} {total_c:>10.2f}"
    )
    print()
    status = 'PASS' if diversion_pct >= CALGREEN_DIVERSION_PCT else 'FAIL'
    print(
        f"Recycling Rate: ({total_a:.2f} / {total_c:.2f}) x 100 = "
        f"{diversion_pct:.1f}%  [{status} - CALGreen requires {CALGREEN_DIVERSION_PCT:.0f}%]"
    )


def run(sf, stories, finish):
    factors, notes = load_factors()
    total_tons, modifier = estimate_total_tons(sf, stories, finish)

    print(f"\n=== CALGreen Debris Estimate ===")
    print(f"  SF: {sf}  Stories: {stories}  Finish: {finish}")
    print(f"  Base factor: {BASE_LBS_PER_SF} lbs/SF  Modifier: {modifier}x")
    print(f"  Total estimated debris: {total_tons} tons")
    print(f"  Diversion requirement: >= {CALGREEN_DIVERSION_PCT:.0f}%\n")

    rows = build_debris_table(total_tons, factors)
    total_a, total_b, total_c, diversion_pct = calc_diversion(rows)
    print_table(rows, total_a, total_b, total_c, diversion_pct)
    print()
    return rows, total_a, total_b, total_c, diversion_pct


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='CALGreen debris estimator')
    parser.add_argument('--sf', type=int, default=1200, help='Floor area in SF')
    parser.add_argument('--stories', type=int, default=2, help='Number of stories')
    parser.add_argument('--finish', type=str, default='stucco', help='Exterior finish (stucco, siding, etc.)')
    args = parser.parse_args()
    run(args.sf, args.stories, args.finish)
