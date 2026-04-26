"""
Plan Check Agent — master orchestrator for permit plan check review.

Takes a correction letter PDF and a drawing set PDF, cross-references them,
and outputs a structured correction matrix.

Usage:
  # Full plan check: parse letter + read drawings + cross-reference
  py src/agents/plan_check_agent.py \\
      --letter path/to/correction_letter.pdf \\
      --drawings path/to/drawing_set.pdf

  # Use pre-parsed JSON if you already ran correction_parser or drawing_reader
  py src/agents/plan_check_agent.py \\
      --corrections output/corrections.json \\
      --drawing-info output/drawing_info.json

  # Drawing review only (no correction letter)
  py src/agents/plan_check_agent.py --drawings path/to/drawing_set.pdf --review-only

  # Just parse the letter
  py src/agents/plan_check_agent.py --letter path/to/letter.pdf --letter-only
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import anthropic

AGENTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = AGENTS_DIR.parent.parent
OUTPUT_DIR = REPO_ROOT / "output"
DATA_DIR = REPO_ROOT / "data"

sys.path.insert(0, str(AGENTS_DIR))
from correction_parser import parse_corrections, save_corrections, print_corrections_table
from drawing_reader import read_drawings, print_drawing_summary
from knowledge_loader import detect_topics, load_knowledge

MODEL = "claude-opus-4-6"

_CROSS_REF_PROMPT = """\
You are a plan check specialist reviewing a building permit application.

I will give you:
1. Relevant code and regulatory knowledge for this jurisdiction
2. A list of plan check corrections from the city's correction letter (JSON)
3. A list of drawing sheet data extracted from the applicant's drawing set (JSON)

Your task:
For each correction, determine:
- Which drawing sheet(s) are most relevant
- Whether the correction appears to be ADDRESSED in the current drawings,
  PARTIALLY ADDRESSED, NOT ADDRESSED, or CANNOT DETERMINE from the available data
- What specific action the applicant must take to respond
- Cite the specific code section (e.g. SDMC §141.0302, CBC 705.8) when the
  knowledge context confirms the requirement

Return a JSON array, one entry per correction, with:
{
  "number": "correction number",
  "category": "correction category",
  "priority": "critical | high | medium | low",
  "relevant_sheets": ["sheet numbers most relevant to this correction"],
  "status": "addressed | partial | not_addressed | cannot_determine",
  "status_reason": "brief explanation of why you assigned this status",
  "required_action": "specific action needed in the drawings or documents",
  "code_citation": "code section(s) that govern this correction, if found in knowledge context",
  "sheet_evidence": "what you found (or didn't find) in the drawing data"
}

Rules:
- Be conservative: if you cannot confirm a correction is addressed, mark cannot_determine
- Do NOT fabricate drawing content that isn't in the sheet data
- If a correction references a sheet not in the drawing data, note it as missing
- Only cite code sections that appear in the KNOWLEDGE CONTEXT below — never invent citations
- Return ONLY valid JSON array — no markdown fences, no explanation

KNOWLEDGE CONTEXT:
{knowledge_context}

CORRECTIONS:
{corrections}

DRAWING SHEET DATA:
{drawing_info}
"""


def cross_reference(
    corrections: list[dict],
    drawing_info: list[dict],
    *,
    jurisdiction: str = "san-diego-city",
    verbose: bool = False,
) -> list[dict]:
    """
    Cross-reference corrections against drawing sheet data using Claude.
    Injects relevant knowledge context based on topics detected in the corrections.
    Returns a list of cross-reference result dicts.
    """
    topics = detect_topics(corrections)
    knowledge_context = load_knowledge(jurisdiction, topics)

    if verbose:
        print(f"[plan_check] Jurisdiction: {jurisdiction}")
        print(f"[plan_check] Detected topics: {', '.join(topics)}")
        print(f"[plan_check] Knowledge context: {len(knowledge_context):,} chars")
        print(f"[plan_check] Cross-referencing {len(corrections)} corrections "
              f"against {len(drawing_info)} sheets...")

    from claude_auth import make_client
    client = make_client()
    prompt = (
        _CROSS_REF_PROMPT
        .replace("{knowledge_context}", knowledge_context or "(none available)")
        .replace("{corrections}", json.dumps(corrections, indent=2))
        .replace("{drawing_info}", json.dumps(drawing_info, indent=2))
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(line for line in lines if not line.startswith("```"))

    return json.loads(raw)


def build_correction_matrix(
    cross_ref: list[dict],
    project_name: str = "",
    *,
    timestamp: str | None = None,
) -> str:
    """
    Render the correction matrix as a markdown document.
    """
    ts = timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines: list[str] = []

    lines.append(f"# Plan Check Correction Matrix")
    if project_name:
        lines.append(f"**Project:** {project_name}")
    lines.append(f"**Generated:** {ts}")
    lines.append("")

    # Summary counts
    status_counts: dict[str, int] = {}
    priority_counts: dict[str, int] = {}
    for item in cross_ref:
        status_counts[item.get("status", "?")] = status_counts.get(item.get("status", "?"), 0) + 1
        priority_counts[item.get("priority", "?")] = (
            priority_counts.get(item.get("priority", "?"), 0) + 1
        )

    lines.append("## Summary")
    lines.append("")
    lines.append("| Status | Count |")
    lines.append("|--------|-------|")
    for status, count in sorted(status_counts.items()):
        lines.append(f"| {status} | {count} |")
    lines.append("")
    lines.append("| Priority | Count |")
    lines.append("|----------|-------|")
    for priority in ["critical", "high", "medium", "low"]:
        count = priority_counts.get(priority, 0)
        if count:
            lines.append(f"| {priority} | {count} |")
    lines.append("")

    # Detailed matrix
    lines.append("## Correction Matrix")
    lines.append("")
    lines.append(
        "| # | Priority | Category | Sheets | Status | Required Action |"
    )
    lines.append("|---|----------|----------|--------|--------|-----------------|")

    # Sort: critical first, then high, then by number
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    sorted_items = sorted(
        cross_ref,
        key=lambda x: (priority_order.get(x.get("priority", "low"), 4), x.get("number", ""))
    )

    for item in sorted_items:
        sheets = ", ".join(item.get("relevant_sheets") or []) or "—"
        lines.append(
            f"| {item.get('number', '?')} "
            f"| {item.get('priority', '?')} "
            f"| {item.get('category', '?')} "
            f"| {sheets} "
            f"| {item.get('status', '?')} "
            f"| {item.get('required_action', '')} |"
        )

    lines.append("")
    lines.append("## Correction Details")
    lines.append("")

    for item in sorted_items:
        num = item.get("number", "?")
        status = item.get("status", "?")
        icon = {"addressed": "✓", "partial": "~", "not_addressed": "✗",
                "cannot_determine": "?"}.get(status, "?")
        lines.append(f"### [{icon}] Correction {num} — {item.get('category', '?').upper()}")
        lines.append(f"**Priority:** {item.get('priority', '?')}  ")
        lines.append(f"**Status:** {status}  ")
        lines.append(f"**Relevant Sheets:** {', '.join(item.get('relevant_sheets') or ['—'])}")
        lines.append("")
        lines.append(f"**Status Reason:** {item.get('status_reason', '')}")
        lines.append("")
        lines.append(f"**Required Action:** {item.get('required_action', '')}")
        lines.append("")
        citation = item.get("code_citation", "")
        if citation:
            lines.append(f"**Code Citation:** {citation}")
            lines.append("")
        evidence = item.get("sheet_evidence", "")
        if evidence:
            lines.append(f"**Drawing Evidence:** {evidence}")
            lines.append("")
        lines.append("---")
        lines.append("")

    return "\n".join(lines)


def load_project_name() -> str:
    """Load project name from project_info.json if available."""
    try:
        data = json.loads((DATA_DIR / "project_info.json").read_text(encoding="utf-8"))
        p = data.get("project", {})
        return p.get("name") or p.get("address") or ""
    except Exception:
        return ""


def main() -> None:
    parser = argparse.ArgumentParser(description="Plan check master orchestrator")
    parser.add_argument("--letter", default=None, help="Path to correction letter PDF")
    parser.add_argument("--drawings", default=None, help="Path to drawing set PDF")
    parser.add_argument("--corrections", default=None,
                        help="Pre-parsed corrections JSON (skip letter parsing)")
    parser.add_argument("--drawing-info", default=None,
                        help="Pre-parsed drawing info JSON (skip drawing analysis)")
    parser.add_argument("--pages", default=None,
                        help="Drawing pages to analyze (1-based, comma-separated)")
    parser.add_argument("--dpi", type=int, default=200,
                        help="Drawing rasterization DPI (default 200)")
    parser.add_argument("--output", default=None, help="Output matrix markdown path")
    parser.add_argument("--letter-only", action="store_true",
                        help="Parse letter only — skip drawing analysis")
    parser.add_argument("--review-only", action="store_true",
                        help="Analyze drawings only — skip letter parsing")
    parser.add_argument("--jurisdiction", default="san-diego-city",
                        help="Jurisdiction for knowledge context "
                             "(san-diego-city | san-diego-county | chula-vista | orange-county)")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    project_name = load_project_name()
    corrections: list[dict] = []
    drawing_info: list[dict] = []

    # ── Step 1: Get corrections ────────────────────────────────────────────
    if not args.review_only:
        if args.corrections:
            print(f"[plan_check] Loading corrections from: {args.corrections}")
            corrections = json.loads(Path(args.corrections).read_text(encoding="utf-8"))
        elif args.letter:
            print(f"[plan_check] Parsing correction letter: {Path(args.letter).name}")
            corrections = parse_corrections(Path(args.letter), verbose=args.verbose)
            save_corrections(corrections, OUTPUT_DIR / "corrections.json")
            print(f"[plan_check] Parsed {len(corrections)} corrections")
            if args.verbose:
                print_corrections_table(corrections)
        elif not args.letter_only:
            parser.error("Provide --letter or --corrections (or --review-only to skip)")

    if args.letter_only:
        if corrections:
            print_corrections_table(corrections)
        return

    # ── Step 2: Get drawing info ──────────────────────────────────────────
    if not args.letter_only:
        if args.drawing_info:
            print(f"[plan_check] Loading drawing info from: {args.drawing_info}")
            drawing_info = json.loads(Path(args.drawing_info).read_text(encoding="utf-8"))
        elif args.drawings:
            pages_0based: list[int] | None = None
            if args.pages:
                pages_0based = [int(p.strip()) - 1 for p in args.pages.split(",")]
            print(f"[plan_check] Analyzing drawings: {Path(args.drawings).name}")
            drawing_info = read_drawings(
                Path(args.drawings),
                dpi=args.dpi,
                pages=pages_0based,
                verbose=args.verbose,
            )
            di_path = OUTPUT_DIR / "drawing_info.json"
            di_path.parent.mkdir(parents=True, exist_ok=True)
            di_path.write_text(
                json.dumps(drawing_info, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            print(f"[plan_check] Analyzed {len(drawing_info)} sheets")
            if args.verbose:
                print_drawing_summary(drawing_info)
        else:
            parser.error("Provide --drawings or --drawing-info (or --letter-only to skip)")

    if args.review_only:
        if drawing_info:
            print_drawing_summary(drawing_info)
        return

    # ── Step 3: Cross-reference ───────────────────────────────────────────
    if corrections and drawing_info:
        print("[plan_check] Cross-referencing corrections against drawings...")
        cross_ref = cross_reference(
            corrections, drawing_info,
            jurisdiction=args.jurisdiction,
            verbose=args.verbose,
        )

        out_path = Path(args.output) if args.output else OUTPUT_DIR / "correction_matrix.md"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        matrix_md = build_correction_matrix(cross_ref, project_name=project_name)
        out_path.write_text(matrix_md, encoding="utf-8")
        print(f"[plan_check] Correction matrix saved to: {out_path}")

        # Also save raw cross-ref JSON
        xref_path = OUTPUT_DIR / "cross_reference.json"
        xref_path.write_text(
            json.dumps(cross_ref, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print(f"[plan_check] Cross-reference JSON saved to: {xref_path}")
    elif corrections and not drawing_info:
        print("[plan_check] No drawing info — outputting corrections only")
        print_corrections_table(corrections)
    elif drawing_info and not corrections:
        print("[plan_check] No corrections — outputting drawing summary only")
        print_drawing_summary(drawing_info)


if __name__ == "__main__":
    main()
