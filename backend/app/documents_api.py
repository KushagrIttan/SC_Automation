"""PDF reference-document ingestion: text-layer extraction with OCR fallback.

Text-layer PDFs are read directly. Scanned/image PDFs (no usable text layer)
are rasterised and routed through Tesseract OCR. The detection is per
document: if direct extraction yields fewer characters than a small
per-page threshold, the document is treated as scanned.
"""

import logging
import os
import shutil
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import Notesheet, NotesheetDocument, User, get_db, _utcnow

router = APIRouter()
log = logging.getLogger(__name__)

# Below this many chars per page we assume there is no real text layer.
MIN_CHARS_PER_PAGE = 32
MAX_PDF_BYTES = 25 * 1024 * 1024


def _locate_tesseract() -> str | None:
    """Find the Tesseract binary: PATH first, then common Windows installs."""
    from pathlib import Path

    exe = shutil.which("tesseract")
    if exe:
        return exe
    candidates = [
        os.environ.get("TESSERACT_CMD", ""),
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        str(Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Tesseract-OCR" / "tesseract.exe"),
        "/usr/bin/tesseract",
        "/opt/homebrew/bin/tesseract",
    ]
    for cand in candidates:
        if cand and Path(cand).exists():
            return cand
    return None


class OcrStatus(BaseModel):
    available: bool
    path: str | None = None
    version: str | None = None


@router.get("/documents/ocr-status", response_model=OcrStatus)
def ocr_status() -> OcrStatus:
    exe = _locate_tesseract()
    version = None
    if exe:
        try:
            import subprocess

            proc = subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=15)
            first = (proc.stderr or proc.stdout or "").strip().splitlines()
            if first:
                version = first[0].strip()
        except Exception:
            log.exception("Could not query tesseract version")
    return OcrStatus(available=bool(exe), path=exe, version=version)


@router.post("/documents/extract")
async def extract_pdf(file: UploadFile = File(...)) -> dict:
    """Extract text from an uploaded PDF.

    Returns which method was used so the UI can show it honestly:
    - "text_layer": direct embedded-text extraction (no OCR needed)
    - "ocr": pages rasterised and run through Tesseract
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")

    data = await file.read()
    if not data:
        raise HTTPException(400, "Uploaded file is empty")
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(413, "PDF larger than 25 MB")

    try:
        try:
            import pymupdf as fitz  # PyMuPDF >= 1.24
        except ImportError:
            import fitz  # legacy alias
    except ImportError:
        raise HTTPException(500, "PyMuPDF is not installed on the server")

    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as e:
        raise HTTPException(400, f"Could not open PDF: {e}")

    page_count = doc.page_count
    direct_text = "\n".join(page.get_text("text") or "" for page in doc)

    if len(direct_text.strip()) >= MIN_CHARS_PER_PAGE * max(page_count, 1):
        doc.close()
        return {
            "filename": file.filename,
            "pages": page_count,
            "method": "text_layer",
            "chars": len(direct_text.strip()),
            "text": direct_text.strip(),
            "ocr_available": True,
        }

    # No usable text layer -> OCR route.
    exe = _locate_tesseract()
    status = ocr_status()
    if not exe:
        doc.close()
        return {
            "filename": file.filename,
            "pages": page_count,
            "method": "ocr_unavailable",
            "chars": 0,
            "text": "",
            "ocr_available": False,
            "detail": (
                "This PDF has no text layer (it looks scanned), but Tesseract OCR "
                "is not installed on the server. Install Tesseract to process scanned "
                "documents."
            ),
        }

    try:
        import io

        import pytesseract
        from PIL import Image

        pytesseract.pytesseract.tesseract_cmd = exe

        texts: list[str] = []
        for page in doc:
            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            texts.append(pytesseract.image_to_string(img))
        ocr_text = "\n".join(texts).strip()
    except Exception as e:
        log.exception("OCR failed")
        doc.close()
        raise HTTPException(500, f"OCR failed: {e}")
    finally:
        try:
            doc.close()
        except Exception:
            pass

    return {
        "filename": file.filename,
        "pages": page_count,
        "method": "ocr",
        "chars": len(ocr_text),
        "text": ocr_text,
        "ocr_available": True,
    }


def _document_payload(document: NotesheetDocument) -> dict:
    """Metadata only — PDF bytes are retained in the database."""
    return {
        "id": document.id,
        "filename": document.filename,
        "content_type": document.content_type,
        "size": len(document.file_data),
        "created_at": document.created_at.isoformat() if document.created_at else None,
    }


@router.post("/notesheets/{notesheet_id}/documents")
async def upload_notesheet_document(
    notesheet_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Store one supporting PDF against a note sheet for later workflow steps."""
    notesheet = db.query(Notesheet).filter(Notesheet.id == notesheet_id).first()
    if not notesheet:
        raise HTTPException(404, "Note sheet not found")
    if user.role != "admin" and notesheet.requester_id != user.id:
        raise HTTPException(403, "You can upload documents only to your own note sheets")
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")

    data = await file.read()
    if not data:
        raise HTTPException(400, "Uploaded file is empty")
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(413, "PDF larger than 25 MB")
    if not data.lstrip().startswith(b"%PDF-"):
        raise HTTPException(400, "The uploaded file is not a valid PDF")

    document = NotesheetDocument(
        id=f"DOC-{uuid.uuid4().hex[:12]}",
        notesheet_id=notesheet.id,
        filename=os.path.basename(file.filename),
        content_type="application/pdf",
        file_data=data,
        uploaded_by=user.id,
        created_at=_utcnow(),
    )
    db.add(document)
    db.commit()
    return _document_payload(document)
