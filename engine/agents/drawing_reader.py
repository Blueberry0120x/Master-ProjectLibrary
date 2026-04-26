"""
Drawing Reader — read architectural/engineering drawing sheets using Claude vision.

Usage:
  # Read all pages
  py src/agents/drawing_reader.py --pdf path/to/drawings.pdf

  # Read specific pages (0-based)
  py src/agents/drawing_reader.py --pdf path/to/drawings.pdf --pages 0,1,4

  # Higher resolution for large format sheets
  py src/agents/drawing_reader.py --pdf path/to/drawings.pdf --dpi 250

  # Save extracted page images alongside JSON
  py src/agents/drawing_reader.py --pdf path/to/drawings.pdf --save-images
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
from pdf_reader import pages_as_b64, page_count, save_page_images

MODEL = "claude-opus-4-6"

_DRAWING_PROMPT = """\
You are reviewing an architectural or engineering drawing sheet for a City of San Diego \
building permit. Analyze this drawing image carefully and extract all available information.

Return a JSON object with these fields:

{
  "sheet_number": "e.g. A1.1, S-1, T24, SITE, COVER",
  "sheet_title": "e.g. Floor Plan, Site Plan, Foundation Plan, Title Sheet",
  "project_name": "project name or address from title block",
  "project_address": "street address if shown",
  "apn": "Assessor Parcel Number if shown",
  "date": "drawing date or revision date",
  "scale": "e.g. 1/4\"=1'-0\", 1:100, NTS",
  "architect_engineer": "firm name and/or license number if shown",
  "zoning": "zoning designation if shown (e.g. RM-1-1, RS-1-7)",
  "dimensions": {
    "description": "summary of key dimensions shown",
    "building_width_ft": null,
    "building_depth_ft": null,
    "lot_width_ft": null,
    "lot_depth_ft": null,
    "height_ft": null,
    "floor_area_sf": null,
    "front_setback_ft": null,
    "rear_setback_ft": null,
    "side_setback_ft": null
  },
  "notes": ["list of all general notes, code notes, or keynotes visible"],
  "plan_check_marks": [
    "list any red stamps, correction marks, checker initials, approval stamps, \
or handwritten notes from a plan reviewer"
  ],
  "sheet_type": "one of: site_plan | floor_plan | elevation | section | structural | \
electrical | mechanical | plumbing | title | energy | landscape | civil | other",
  "confidence": "high | medium | low — how clearly readable is this sheet",
  "notes_on_readability": "brief note if the image is blurry, low contrast, or hard to read"
}

Rules:
- Set numeric fields to null if not clearly visible or legible — do NOT guess dimensions.
- Only report plan_check_marks if you can actually see reviewer marks/stamps/notes.
- Return ONLY valid JSON — no markdown fences, no explanation.
"""


def read_sheet(
    image_b64: str,
    *,
    client: anthropic.Anthropic,
    page_number: int = 0,
    verbose: bool = False,
) -> dict:
    """
    Send one drawing page image to Claude vision and return extracted data.
    """
    if verbose:
        print(f"  [drawing_reader] Analyzing page {page_number + 1}...")

    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": image_b64,
                        },
                    },
                    {"type": "text", "text": _DRAWING_PROMPT},
                ],
            }
        ],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(line for line in lines if not line.startswith("```"))

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # If Claude couldn't parse a clean JSON, return a degraded result
        data = {
            "sheet_number": None,
            "sheet_title": None,
            "raw_response": raw,
            "confidence": "low",
            "notes_on_readability": "Claude returned non-JSON response — see raw_response",
        }

    data["_page_index"] = page_number  # 0-based
    return data


def read_drawings(
    pdf_path: Path | str,
    *,
    dpi: int = 200,
    pages: list[int] | None = None,
    verbose: bool = False,
) -> list[dict]:
    """
    Read all (or specified) pages from a drawing set PDF.

    Returns a list of sheet data dicts, one per page.
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    total = page_count(pdf_path)
    target = pages if pages is not None else list(range(total))

    if verbose:
        print(f"[drawing_reader] PDF: {pdf_path.name} | {total} pages total")
        print(f"[drawing_reader] Processing pages: {[p + 1 for p in target]} (1-based)")
        print(f"[drawing_reader] Rasterizing at {dpi} DPI...")

    images_b64 = pages_as_b64(pdf_path, dpi=dpi, pages=target)

    from claude_auth import make_client
    client = make_client()
    results: list[dict] = []

    for page_idx, img_b64 in zip(target, images_b64):
        sheet_data = read_sheet(img_b64, client=client, page_number=page_idx, verbose=verbose)
        results.append(sheet_data)
        if verbose:
            sn = sheet_data.get("sheet_number") or "?"
            st = sheet_data.get("sheet_title") or "?"
            conf = sheet_data.get("confidence", "?")
            print(f"    Sheet {page_idx + 1}: [{sn}] {st} (confidence: {conf})")

    return results


def print_drawing_summary(sheets: list[dict]) -> None:
    print(f"\n{'Page':<6} {'Sheet #':<10} {'Type':<14} {'Title':<30} {'Scale':<16} Confidence")
    print("-" * 95)
    for s in sheets:
        print(
            f"{s.get('_page_index', 0) + 1:<6} "
            f"{str(s.get('sheet_number') or '?'):<10} "
            f"{str(s.get('sheet_type') or '?'):<14} "
            f"{str(s.get('sheet_title') or '?')[:29]:<30} "
            f"{str(s.get('scale') or '?'):<16} "
            f"{s.get('confidence', '?')}"
        )
    # Flags
    marked = [s for s in sheets if s.get("plan_check_marks")]
    if marked:
        marked_labels = [
            s.get("sheet_number") or f"page {s.get('_page_index', 0) + 1}"
            for s in marked
        ]
        print(f"\n  Plan checker marks found on: {marked_labels}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Read drawing sheets with Claude vision")
    parser.add_argument("--pdf", required=True, help="Path to drawing set PDF")
    parser.add_argument("--pages", default=None,
                        help="Comma-separated 1-based page numbers, e.g. 1,2,5")
    parser.add_argument("--dpi", type=int, default=200, help="Rasterization DPI (default 200)")
    parser.add_argument("--output", default=None, help="Output JSON path")
    parser.add_argument("--save-images", action="store_true",
                        help="Save rasterized page images to output/pages/")
    parser.add_argument("--print", action="store_true", dest="print_summary",
                        help="Print sheet summary table to stdout")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    # Convert 1-based user input to 0-based internal indices
    pages_0based: list[int] | None = None
    if args.pages:
        pages_0based = [int(p.strip()) - 1 for p in args.pages.split(",")]

    if args.save_images:
        img_dir = OUTPUT_DIR / "pages"
        save_page_images(
            args.pdf, img_dir, dpi=args.dpi, pages=pages_0based,
            prefix=Path(args.pdf).stem
        )
        print(f"[drawing_reader] Images saved to: {img_dir}")

    sheets = read_drawings(
        Path(args.pdf),
        dpi=args.dpi,
        pages=pages_0based,
        verbose=args.verbose,
    )

    out_path = Path(args.output) if args.output else OUTPUT_DIR / "drawing_info.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(sheets, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[drawing_reader] Saved {len(sheets)} sheets to: {out_path}")

    if args.print_summary:
        print_drawing_summary(sheets)


if __name__ == "__main__":
    main()
