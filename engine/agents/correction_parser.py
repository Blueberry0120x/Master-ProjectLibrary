"""
Correction Parser — extract plan check corrections from a city correction letter PDF.

Usage:
  py src/agents/correction_parser.py --pdf path/to/correction_letter.pdf
  py src/agents/correction_parser.py --pdf path/to/letter.pdf --output output/corrections.json
  py src/agents/correction_parser.py --pdf path/to/letter.pdf --print
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import anthropic

AGENTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = AGENTS_DIR.parent.parent
OUTPUT_DIR = REPO_ROOT / "output"

sys.path.insert(0, str(AGENTS_DIR))
from pdf_reader import extract_text, page_count

MODEL = "claude-opus-4-6"

_EXTRACTION_PROMPT = """\
You are a plan check specialist. I will give you the raw text of a building permit \
plan check correction letter from a city building department.

Extract ALL corrections/comments as a structured JSON array.
For each correction item, extract:
  - "number": the item number or ID (e.g. "1", "2", "A-1", "PC-03")
  - "sheet_refs": list of drawing sheet references mentioned (e.g. ["A1.1", "S-1", "T24"])
  - "category": one of: structural | egress | energy | accessibility | fire | \
zoning | mechanical | electrical | plumbing | general | calgreen | other
  - "description": the full verbatim text of the correction
  - "action": brief plain-English summary of what must be done to resolve it
  - "priority": critical | high | medium | low \
(critical = life safety / structural; high = code compliance; medium = admin/docs; low = minor/clarification)

Rules:
- Do NOT invent corrections. Only extract what is explicitly in the text.
- If a correction has sub-items (e.g. 1a, 1b), list each as a separate entry.
- If the sheet reference is not mentioned, set sheet_refs to [].
- Return ONLY valid JSON — no markdown fences, no explanation.

Format:
[
  {
    "number": "1",
    "sheet_refs": ["A1.1"],
    "category": "egress",
    "description": "...",
    "action": "...",
    "priority": "high"
  }
]

CORRECTION LETTER TEXT:
{text}
"""


def parse_corrections(pdf_path: Path | str, *, verbose: bool = False) -> list[dict]:
    """
    Read a plan check correction letter PDF and return structured corrections.

    Returns a list of correction dicts. Each dict has:
      number, sheet_refs, category, description, action, priority
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    if verbose:
        print(f"[correction_parser] Reading PDF: {pdf_path.name}")
        print(f"[correction_parser] Pages: {page_count(pdf_path)}")

    text = extract_text(pdf_path)
    if not text.strip():
        raise ValueError(
            f"No text extracted from {pdf_path.name}. "
            "The PDF may be image-only — try running through drawing_reader.py instead."
        )

    if verbose:
        print(f"[correction_parser] Extracted {len(text)} chars of text")
        print("[correction_parser] Sending to Claude for structured extraction...")

    from claude_auth import make_client
    client = make_client()
    prompt = _EXTRACTION_PROMPT.replace("{text}", text)

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()

    # Strip markdown fences if Claude added them despite the prompt
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(
            line for line in lines
            if not line.startswith("```")
        )

    corrections: list[dict] = json.loads(raw)

    if verbose:
        print(f"[correction_parser] Extracted {len(corrections)} corrections")

    return corrections


def save_corrections(corrections: list[dict], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(corrections, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def print_corrections_table(corrections: list[dict]) -> None:
    print(f"\n{'#':<8} {'Priority':<10} {'Category':<14} {'Sheets':<20} Action")
    print("-" * 90)
    for c in corrections:
        sheets = ", ".join(c.get("sheet_refs") or []) or "—"
        print(
            f"{c.get('number', '?'):<8} "
            f"{c.get('priority', '?'):<10} "
            f"{c.get('category', '?'):<14} "
            f"{sheets:<20} "
            f"{c.get('action', '')}"
        )
    print(f"\nTotal: {len(corrections)} corrections")


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse plan check correction letter")
    parser.add_argument("--pdf", required=True, help="Path to correction letter PDF")
    parser.add_argument("--output", default=None, help="Output JSON path")
    parser.add_argument("--print", action="store_true", dest="print_table",
                        help="Print corrections table to stdout")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    corrections = parse_corrections(Path(args.pdf), verbose=args.verbose)

    out_path = Path(args.output) if args.output else OUTPUT_DIR / "corrections.json"
    save_corrections(corrections, out_path)
    print(f"[correction_parser] Saved {len(corrections)} corrections to: {out_path}")

    if args.print_table:
        print_corrections_table(corrections)


if __name__ == "__main__":
    main()
