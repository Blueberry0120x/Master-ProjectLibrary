"""Verify exactly what value appears in each DS-375 field after filling."""
from __future__ import annotations
import fitz
from pathlib import Path

filled = Path(r"C:\Users\NathanPham\DevOps\PlanCheck-Planner\knowledge\san-diego-city\ProjectBook\4335-euclid\ds375-preliminary-review.pdf")
doc = fitz.open(str(filled))
print("=" * 70)
for page in doc:
    print(f"\n--- Page {page.number + 1} ---")
    for w in page.widgets():
        val = w.field_value
        if val and val not in ("Off", "", None):
            safe = str(val)[:80].encode("ascii", errors="replace").decode("ascii")
            print(f"  [{w.field_type_string:10s}] {w.field_name!r:45s} = {safe!r}")
