"""Test 5 strategies for making text visible in DS-375 AcroForm fields."""
from __future__ import annotations
import fitz
from pathlib import Path

BLANK = Path(r"C:\Users\NathanPham\DevOps\PlanCheck-Planner\knowledge\san-diego-city\Reference\Form\ds375-blank.pdf")
OUT   = Path(r"C:\Users\NathanPham\DevOps\PlanCheck-Planner\tools\_ib513_pages")
OUT.mkdir(exist_ok=True)

SAMPLE_TEXT = (
    "Q1 [Building Plan Review] TEST – this text should be visible.\n"
    "Per CBC §11B-206.2.3 Exception 1, is elevator required for R-2 on 2nd floor?\n\n"
    "Q2 [Building Plan Review] TEST – party wall R-3 reclassification test question.\n\n"
    "Q3 [Planning Review] By-right vs SDP/NDP/CUP for FAR 1.20, CUPD-CU-2-4 program?\n\n"
    "Q4 [Land Development] Current SDMC §142.1301 IHO in-lieu fee per unit?\n\n"
    "Q5 [Engineering ROW] DS-3037 required for utility trench only, no new driveway?\n\n"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 visibility check <<<END>>>"
)
SCOPE_TEXT = "Demolish existing 1,225 SF auto repair (1952, Group B) and construct 2-story mixed-use: 9 R-2 units (5,218 SF) + 640 SF Group B commercial. Footprint 3,422 SF, FAR 1.20, CUPD-CU-2-4 zone, APN 471-271-16-00."

# ── Strategy A: widget.field_value + explicit fontsize + update ──────────────
def strategy_a():
    doc = fitz.open(str(BLANK))
    for page in doc:
        for w in page.widgets():
            if w.field_name in ("Policy Questions", "Project Scope"):
                text = SAMPLE_TEXT if w.field_name == "Policy Questions" else SCOPE_TEXT
                w.field_flags = w.field_flags | (1 << 12)  # Multiline flag
                w.text_fontsize = 8
                w.text_color = (0, 0, 0)
                w.field_value = text
                w.update()
    doc.save(str(OUT / "test_A.pdf"), garbage=4, deflate=True, clean=True)
    print("Strategy A saved.")

# ── Strategy B: Set NeedAppearances in AcroForm + field value ─────────────────
def strategy_b():
    doc = fitz.open(str(BLANK))
    # Set NeedAppearances = true in AcroForm dict
    catalog = doc.pdf_catalog()
    acroform = doc.xref_get_key(catalog, "AcroForm")
    if acroform[0] == "xref":
        af_xref = int(acroform[1].split()[0])
        doc.xref_set_key(af_xref, "NeedAppearances", "true")
    for page in doc:
        for w in page.widgets():
            if w.field_name in ("Policy Questions", "Project Scope"):
                text = SAMPLE_TEXT if w.field_name == "Policy Questions" else SCOPE_TEXT
                w.field_flags = w.field_flags | (1 << 12)
                w.text_fontsize = 8
                w.field_value = text
                w.update()
    doc.save(str(OUT / "test_B.pdf"), garbage=4, deflate=True, clean=True)
    print("Strategy B saved.")

# ── Strategy C: Delete widget via xref, then insert_textbox ──────────────────
def strategy_c():
    doc = fitz.open(str(BLANK))
    to_delete = {}
    for page in doc:
        for w in page.widgets():
            if w.field_name in ("Policy Questions", "Project Scope"):
                to_delete.setdefault(page.number, []).append(
                    (fitz.Rect(w.rect), w.field_name)
                )
    # Iterate annots to delete by xref
    for page in doc:
        entries = to_delete.get(page.number, [])
        if not entries:
            continue
        target_names = {e[1] for e in entries}
        annots_to_delete = [a for a in page.annots()
                            if hasattr(a, "get_text") and
                            page.parent.xref_get_key(a.xref, "T") in
                            {(1, f"({n})") for n in target_names}]
        for w in page.widgets():
            if w.field_name in target_names:
                try:
                    page.delete_annot(w)
                except Exception as e:
                    print(f"  delete_annot failed: {e}")
        for rect, name in entries:
            text = SAMPLE_TEXT if name == "Policy Questions" else SCOPE_TEXT
            for fs in (8, 7, 6.5, 6, 5.5):
                rc = page.insert_textbox(rect + (2, 2, -2, -2), text,
                                         fontsize=fs, fontname="helv",
                                         color=(0, 0, 0))
                if rc >= 0:
                    break
    doc.save(str(OUT / "test_C.pdf"), garbage=4, deflate=True, clean=True)
    print("Strategy C saved.")

# ── Strategy D: FreeText annotation on top ───────────────────────────────────
def strategy_d():
    doc = fitz.open(str(BLANK))
    for page in doc:
        for w in page.widgets():
            if w.field_name in ("Policy Questions", "Project Scope"):
                rect = fitz.Rect(w.rect)
                text = SAMPLE_TEXT if w.field_name == "Policy Questions" else SCOPE_TEXT
                # Clear existing value
                w.field_value = ""
                w.update()
                # Add FreeText annot — renders above everything
                annot = page.add_freetext_annot(
                    rect + (1, 1, -1, -1), text,
                    fontsize=7.5, fontname="helv",
                    text_color=(0, 0, 0),
                    fill_color=(1, 1, 1),
                    rotate=0,
                )
                annot.update()
    doc.save(str(OUT / "test_D.pdf"), garbage=4, deflate=True, clean=True)
    print("Strategy D saved.")

# ── Strategy E: page content text (below widgets, but with white shape) ──────
def strategy_e():
    doc = fitz.open(str(BLANK))
    for page in doc:
        shapes = page.new_shape()
        for w in page.widgets():
            if w.field_name in ("Policy Questions", "Project Scope"):
                rect = fitz.Rect(w.rect)
                text = SAMPLE_TEXT if w.field_name == "Policy Questions" else SCOPE_TEXT
                w.field_value = ""
                w.update()
                shapes.draw_rect(rect)
                shapes.finish(fill=(1, 1, 1), color=None, fill_opacity=1)
                rc = shapes.insert_textbox(
                    rect + (2, 2, -2, -2), text,
                    fontsize=7.5, fontname="helv", color=(0, 0, 0))
                print(f"  E: '{w.field_name}' insert_textbox rc={rc}")
        shapes.commit()
    doc.save(str(OUT / "test_E.pdf"), garbage=4, deflate=True, clean=True)
    print("Strategy E saved.")

strategy_a()
strategy_b()
strategy_c()
strategy_d()
strategy_e()
print("Done — check _ib513_pages/test_A.pdf through test_E.pdf")
