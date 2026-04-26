"""Inspect fillable fields in city PDF forms."""
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
    fields = []
    for page in doc:
        for widget in page.widgets():
            fields.append({
                "name": widget.field_name,
                "type": widget.field_type_string,
                "value": widget.field_value,
            })
    print(f"\n{'='*60}")
    print(f"{label}: {len(fields)} fields, {doc.page_count} pages")
    for f in fields[:30]:
        print(f"  [{f['type']:10s}] {f['name']} = {repr(f['value'])}")
    if len(fields) > 30:
        print(f"  ... +{len(fields)-30} more fields")
