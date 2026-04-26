"""
PDF Reader — low-level PDF utilities for PlanCheck-Planner.

Provides:
  extract_text(pdf_path)           -> str   (text-based PDFs, e.g. correction letters)
  page_to_images(pdf_path, dpi)    -> list[bytes]  (PNG bytes per page, for vision)
  page_count(pdf_path)             -> int
"""
from __future__ import annotations

import base64
from pathlib import Path

import fitz  # PyMuPDF
import pdfplumber


def extract_text(pdf_path: Path | str, *, prefer_plumber: bool = True) -> str:
    """
    Extract all text from a text-based PDF (e.g. correction letters, code documents).
    Uses pdfplumber first (better table handling), falls back to PyMuPDF.
    Returns empty string if the PDF is image-only.
    """
    pdf_path = Path(pdf_path)
    if prefer_plumber:
        try:
            with pdfplumber.open(pdf_path) as pdf:
                parts: list[str] = []
                for page in pdf.pages:
                    text = page.extract_text() or ""
                    parts.append(text)
            combined = "\n\n".join(p for p in parts if p.strip())
            if combined.strip():
                return combined
        except Exception:
            pass  # fall through to PyMuPDF

    doc = fitz.open(str(pdf_path))
    parts = []
    for page in doc:
        parts.append(page.get_text())
    doc.close()
    return "\n\n".join(p for p in parts if p.strip())


def page_count(pdf_path: Path | str) -> int:
    """Return the number of pages in a PDF."""
    doc = fitz.open(str(pdf_path))
    n = len(doc)
    doc.close()
    return n


def page_to_images(
    pdf_path: Path | str,
    *,
    dpi: int = 200,
    pages: list[int] | None = None,
) -> list[bytes]:
    """
    Rasterize PDF pages to PNG bytes.

    Args:
        pdf_path: Path to the PDF file.
        dpi: Resolution. 150 = screen quality. 200-300 = good for drawings.
        pages: 0-based page indices to render. None = all pages.

    Returns:
        List of PNG bytes, one per requested page.
    """
    pdf_path = Path(pdf_path)
    doc = fitz.open(str(pdf_path))
    zoom = dpi / 72.0  # 72 DPI is PyMuPDF's default
    mat = fitz.Matrix(zoom, zoom)

    target_pages = pages if pages is not None else list(range(len(doc)))
    results: list[bytes] = []

    for idx in target_pages:
        if idx < 0 or idx >= len(doc):
            raise IndexError(f"Page index {idx} out of range (PDF has {len(doc)} pages)")
        pix = doc[idx].get_pixmap(matrix=mat)
        results.append(pix.tobytes("png"))

    doc.close()
    return results


def pages_as_b64(
    pdf_path: Path | str,
    *,
    dpi: int = 200,
    pages: list[int] | None = None,
) -> list[str]:
    """Return base64-encoded PNG strings (ready for Anthropic API image blocks)."""
    return [
        base64.standard_b64encode(img).decode()
        for img in page_to_images(pdf_path, dpi=dpi, pages=pages)
    ]


def save_page_images(
    pdf_path: Path | str,
    output_dir: Path | str,
    *,
    dpi: int = 200,
    pages: list[int] | None = None,
    prefix: str = "page",
) -> list[Path]:
    """
    Rasterize pages and save as PNG files.
    Returns list of saved file paths.
    """
    pdf_path = Path(pdf_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    images = page_to_images(pdf_path, dpi=dpi, pages=pages)
    target_pages = pages if pages is not None else list(range(page_count(pdf_path)))

    saved: list[Path] = []
    for page_idx, img_bytes in zip(target_pages, images):
        out_file = output_dir / f"{prefix}_{page_idx + 1:03d}.png"
        out_file.write_bytes(img_bytes)
        saved.append(out_file)
    return saved
