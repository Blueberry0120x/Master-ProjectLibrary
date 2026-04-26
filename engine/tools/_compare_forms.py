"""Render all pages of filled and blank DS-375 for side-by-side comparison."""
from __future__ import annotations
import fitz
from pathlib import Path

OUT = Path(r"C:\Users\NathanPham\DevOps\PlanCheck-Planner\tools\_ib513_pages")
OUT.mkdir(exist_ok=True)

forms = {
    "blank":  Path(r"C:\Users\NathanPham\DevOps\PlanCheck-Planner\knowledge\san-diego-city\Reference\Form\ds375-blank.pdf"),
    "filled": Path(r"C:\Users\NathanPham\DevOps\PlanCheck-Planner\knowledge\san-diego-city\ProjectBook\4335-euclid\ds375-preliminary-review.pdf"),
}

for label, src in forms.items():
    doc = fitz.open(str(src))
    for i, page in enumerate(doc, start=1):
        pix = page.get_pixmap(dpi=130)
        p = OUT / f"{label}_p{i:02d}.png"
        pix.save(str(p))
        print(p)
