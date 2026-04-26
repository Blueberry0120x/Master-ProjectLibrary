"""Render page 1 of each test PDF for visual inspection."""
from __future__ import annotations
import fitz
from pathlib import Path

OUT = Path(r"C:\Users\NathanPham\DevOps\PlanCheck-Planner\tools\_ib513_pages")
for letter in "ABCDE":
    src = OUT / f"test_{letter}.pdf"
    doc = fitz.open(str(src))
    pix = doc[0].get_pixmap(dpi=130)
    p = OUT / f"result_{letter}.png"
    pix.save(str(p))
    print(p)
