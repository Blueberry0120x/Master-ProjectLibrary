"""completion_gate.py — Regression check against last stable tag.

Compares Output/InteractiveMap.html at HEAD vs the most recent vX.Y-stable tag.
Exits 0 if clean, 1 if regressions detected.

Usage:
    py tools/completion_gate.py            # run standalone
    py tools/completion_gate.py --json     # machine-readable output for hooks
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_HTML = REPO_ROOT / "Output" / "InteractiveMap.html"

# Features that MUST be present in HEAD (added progressively — never removed)
MUST_HAVE: dict[str, str] = {
    "save_config_btn":          "Save Config",
    "setbacks_panel":           "Save Setbacks",
    "FAR_calc":                 "updateFAR",
    "building_dim_labels":      "bldgDimLabels",
    "site_defaults_global":     "__SITE_DEFAULTS__",
    "anchor_buttons":           "anchorFront",
    "site_switcher":            "__SITE_LIST__",
    "free_drag_btn":            "freeDragBtn",
    "snap_edge_btn":            "snapEdgeBtn",
    "lock_position_btn":        "lockPositionBtn",
    "export_save":              "ExportEngine.save",
    "chain_W_offset":           "chainWOffset",
    "story_height_calc":        "floorHeight",
    "density_calc":             "densityPerSF",
    "effectiveRotation":        "effectiveRotation: function()",
    "polygon_clamp":            "clampToLot",
    "CDN_geoman_pinned":        "leaflet-geoman-free@2.16.0",
    "dim_text_counter_rot":     "ConfigEngine.state.rotation",
    "compass_SN_rotation":      "const snDeg = ConfigEngine.state.siteNorthDeg",
}

# Features must NOT regress from v5.0 (the baseline stable)
BASELINE_TAG = "v5.0-multisite-stable"


def _get_last_stable_tag() -> str:
    """Return the most recent vX.Y-stable tag reachable from HEAD."""
    r = subprocess.run(
        ["git", "tag", "--merged", "HEAD", "--sort=-version:refname"],
        capture_output=True, text=True, cwd=REPO_ROOT
    )
    for line in r.stdout.splitlines():
        if line.strip().endswith("-stable"):
            return line.strip()
    return BASELINE_TAG


def _html_at_tag(tag: str) -> str:
    r = subprocess.run(
        ["git", "show", f"{tag}:Output/InteractiveMap.html"],
        capture_output=True, text=True, encoding="utf-8", errors="ignore",
        cwd=REPO_ROOT
    )
    return r.stdout


def run_gate(json_out: bool = False) -> int:
    issues: list[str] = []

    # 1. Built artifact must exist
    if not OUTPUT_HTML.exists():
        issues.append("MISSING: Output/InteractiveMap.html — run py tools/build.py first")
        _report(issues, json_out)
        return 1

    head_html = OUTPUT_HTML.read_text(encoding="utf-8", errors="ignore")

    # 2. MUST-HAVE features check
    for feat, needle in MUST_HAVE.items():
        if needle not in head_html:
            issues.append(f"MISSING feature in HEAD: {feat} (needle: {needle!r})")

    # 3. Regression check against last stable tag
    stable_tag = _get_last_stable_tag()
    stable_html = _html_at_tag(stable_tag)
    if stable_html:
        for feat, needle in MUST_HAVE.items():
            was_in_stable = needle in stable_html
            in_head = needle in head_html
            if was_in_stable and not in_head:
                issues.append(f"REGRESSION vs {stable_tag}: {feat} was present, now missing")

    _report(issues, json_out, stable_tag)
    return 1 if issues else 0


def _report(issues: list[str], json_out: bool, stable_tag: str = "") -> None:
    if json_out:
        print(json.dumps({"ok": len(issues) == 0, "issues": issues, "baseline": stable_tag}))
        return
    if not issues:
        print(f"[GATE] OK — no regressions vs {stable_tag}, all required features present")
    else:
        print(f"[GATE] FAIL — {len(issues)} issue(s) found:")
        for iss in issues:
            print(f"  - {iss}")


if __name__ == "__main__":
    json_mode = "--json" in sys.argv
    sys.exit(run_gate(json_mode))
