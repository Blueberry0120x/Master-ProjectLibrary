"""Render IB-513 PDF pages as PNG images for visual reading."""
from __future__ import annotations
import fitz
from pathlib import Path

src = Path(r"C:\Users\natha\Downloads\2024-12-31_ib513.pdf")
out = Path(r"C:\Users\NathanPham\DevOps\PlanCheck-Planner\tools\_ib513_pages")
out.mkdir(exist_ok=True)
doc = fitz.open(str(src))
for i, page in enumerate(doc, start=1):
    pix = page.get_pixmap(dpi=180)
    p = out / f"p{i:02d}.png"
    pix.save(str(p))
    print(p, pix.width, "x", pix.height)
