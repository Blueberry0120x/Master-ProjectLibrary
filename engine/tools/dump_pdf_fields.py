"""Dump all fillable field names from city PDFs."""
from __future__ import annotations
import fitz
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
forms = [
    ("ds375-blank.pdf", "DS-375"),
    ("ds420-blank.pdf", "DS-420"),
    ("ds3032-blank.pdf", "DS-3032"),
]

for fname, label in forms:
    path = ROOT / "knowledge/san-diego-city/Reference/Form" / fname
    doc = fitz.open(str(path))
    print(f"\n{'='*70}")
    print(f"{label} — {path.name}  ({doc.page_count} pages)")
    print(f"{'='*70}")
    for pg_idx, page in enumerate(doc):
        for widget in page.widgets():
            print(f"  p{pg_idx+1}  [{widget.field_type_string:10s}] {widget.field_name!r}")
