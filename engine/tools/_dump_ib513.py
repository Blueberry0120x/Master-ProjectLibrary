"""_dump_ib513.py — One-off utility to extract IB-513 PDF text for knowledge ingest."""
from __future__ import annotations
import fitz
from pathlib import Path

src = Path(r"C:\Users\natha\Downloads\2024-12-31_ib513.pdf")
doc = fitz.open(str(src))
for i, page in enumerate(doc, start=1):
    print(f"\n========== PAGE {i} ==========")
    print(page.get_text())
