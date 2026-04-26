"""Split the tall IB-513 PNG into readable chunks."""
from __future__ import annotations
from pathlib import Path
import fitz

src = Path(r"C:\Users\natha\Downloads\2024-12-31_ib513.pdf")
out = Path(r"C:\Users\NathanPham\DevOps\PlanCheck-Planner\tools\_ib513_pages")
out.mkdir(exist_ok=True)
doc = fitz.open(str(src))
page = doc[0]
W, H = page.rect.width, page.rect.height
print(f"source pdf: {W} x {H} pts")
# Split into ~1100 pt vertical chunks
chunk = 1100
n = int((H + chunk - 1) // chunk)
for i in range(n):
    top = i * chunk
    bot = min((i + 1) * chunk, H)
    clip = fitz.Rect(0, top, W, bot)
    pix = page.get_pixmap(dpi=140, clip=clip)
    p = out / f"chunk_{i:02d}.png"
    pix.save(str(p))
    print(p, pix.width, "x", pix.height)
