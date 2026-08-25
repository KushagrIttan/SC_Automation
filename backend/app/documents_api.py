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
from base64 import b64decode
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import ApprovalStage, Notesheet, NotesheetDocument, StageApprover, User, get_db, _utcnow

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


def _signature_image(data_url: str):
    """Turn a stored signup signature into a re-openable PNG stream for
    ReportLab's platypus Image, if valid."""
    if not data_url.startswith("data:image/") or "," not in data_url:
        return None
    try:
        png = b64decode(data_url.split(",", 1)[1])
        if not png.startswith(b"\x89PNG"):
            raise ValueError("not a PNG")
        return BytesIO(png)
    except Exception:
        log.warning("Could not embed an approver signature in the final PDF")
        return None


def _build_notesheet_pdf(notesheet: Notesheet, approvals: list) -> BytesIO:
    """Build the green, print-ready approval copy that precedes attachments.

    `approvals` holds (stage, signer_row, user) triples for every recorded
    approval, in stage order.
    """
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    output = BytesIO()
    page_width, page_height = A4
    green = colors.HexColor("#176B43")
    pale_green = colors.HexColor("#E9F4EC")

    def hardcopy_header(canvas, document):
        canvas.saveState()
        canvas.setFillColor(green)
        canvas.rect(0, page_height - 20 * mm, page_width, 20 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawString(18 * mm, page_height - 12 * mm, "SANCTION DESK - APPROVED NOTE SHEET")
        canvas.setStrokeColor(green)
        canvas.setLineWidth(1)
        canvas.line(18 * mm, 15 * mm, page_width - 18 * mm, 15 * mm)
        canvas.setFillColor(colors.HexColor("#4D6657"))
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(page_width - 18 * mm, 9 * mm, f"Page {document.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(output, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=27 * mm, bottomMargin=22 * mm)
    styles = getSampleStyleSheet()
    title = ParagraphStyle("notesheet-title", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=16, leading=19, alignment=TA_CENTER, textColor=green, spaceAfter=9)
    heading = ParagraphStyle("notesheet-heading", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=green, spaceBefore=10, spaceAfter=4)
    body = ParagraphStyle("notesheet-body", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.5, leading=14, textColor=colors.HexColor("#17251C"))
    small = ParagraphStyle("notesheet-small", parent=body, fontSize=8.5, leading=11)

    def escaped(value: object) -> str:
        from xml.sax.saxutils import escape
        return escape(str(value or "-")).replace("\n", "<br/>")

    from xml.sax.saxutils import escape as _xml_escape

    story = [
        Paragraph("APPROVED NOTE SHEET", title),
        Table(
            [
                [Paragraph("<b>Reference</b>", small), Paragraph(escaped(notesheet.id), small), Paragraph("<b>Date</b>", small), Paragraph(escaped(notesheet.updated_at.strftime("%d %b %Y") if notesheet.updated_at else ""), small)],
                [Paragraph("<b>Category</b>", small), Paragraph(escaped(notesheet.category.replace("_", " ").title()), small), Paragraph("<b>Amount</b>", small), Paragraph(escaped(f"INR {notesheet.amount:,.2f}" if notesheet.amount else "Not stated"), small)],
                [Paragraph("<b>Requester</b>", small), Paragraph(escaped(notesheet.requester_name), small), Paragraph("<b>Department</b>", small), Paragraph(escaped(notesheet.department), small)],
            ],
            colWidths=[27 * mm, 60 * mm, 27 * mm, 50 * mm],
            style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), pale_green), ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#9BC7AA")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]),
        ),
        Spacer(1, 6 * mm),
        Paragraph("Note sheet", heading),
        Paragraph(escaped(notesheet.draft_text), body),
        Paragraph("Justification", heading),
        Paragraph(escaped(notesheet.justification or notesheet.request_text), body),
        Paragraph("Approval record", heading),
    ]

    approval_rows = [[Paragraph("Stage", small), Paragraph("Approver", small), Paragraph("Signature", small), Paragraph("Signed on", small)]]
    for stage, signer, approver in approvals:
        signature = _signature_image(approver.signature_png or "")
        signature_cell = Image(signature, width=28 * mm, height=9 * mm, kind="proportional") if signature else Paragraph("Signature on file", small)
        approver_line = _xml_escape(str(approver.name or "-"))
        if getattr(approver, "position", None):
            approver_line += f'<br/><font size="7" color="#4D6657">{_xml_escape(str(approver.position))}</font>'
        signed_on = signer.approved_at.strftime("%d %b %Y, %H:%M UTC") if signer.approved_at else ""
        approval_rows.append([
            Paragraph(escaped(stage.name), small),
            Paragraph(approver_line, small),
            signature_cell,
            Paragraph(escaped(signed_on), small),
        ])
    story.append(Table(approval_rows, colWidths=[45 * mm, 42 * mm, 35 * mm, 42 * mm], style=TableStyle([("BACKGROUND", (0, 0), (-1, 0), green), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#9BC7AA")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)])))
    story += [Spacer(1, 7 * mm), Paragraph("Supporting documents follow this approved note sheet.", small)]
    doc.build(story, onFirstPage=hardcopy_header, onLaterPages=hardcopy_header)
    output.seek(0)
    return output


@router.get("/notesheets/{notesheet_id}/final-pdf")
def download_final_notesheet_pdf(
    notesheet_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Download the final signed note sheet and its supporting PDFs.

    Only the owning student/club lead can download it, and only after final
    approval. Supporting PDFs are appended unchanged after the signed sheet.
    """
    notesheet = db.query(Notesheet).filter(Notesheet.id == notesheet_id).first()
    if not notesheet:
        raise HTTPException(404, "Note sheet not found")
    if notesheet.requester_id != user.id:
        raise HTTPException(403, "Only the requester can download this final note sheet")
    if notesheet.status != "approved":
        raise HTTPException(409, "The final PDF is available only after all approvals are complete")

    approved_rows = (
        db.query(ApprovalStage, StageApprover, User)
        .join(StageApprover, StageApprover.stage_id == ApprovalStage.id)
        .join(User, User.id == StageApprover.prof_id)
        .filter(ApprovalStage.notesheet_id == notesheet.id, StageApprover.status == "approved")
        .order_by(ApprovalStage.stage_order)
        .all()
    )
    if not approved_rows:
        raise HTTPException(409, "No signed approvals are recorded for this note sheet")

    from pypdf import PdfReader, PdfWriter

    writer = PdfWriter()
    writer.append(PdfReader(_build_notesheet_pdf(notesheet, list(approved_rows))))
    attachments = db.query(NotesheetDocument).filter(NotesheetDocument.notesheet_id == notesheet.id).order_by(NotesheetDocument.created_at).all()
    for attachment in attachments:
        try:
            writer.append(PdfReader(BytesIO(attachment.file_data)))
        except Exception:
            log.exception("Skipping unreadable stored attachment %s", attachment.id)

    final_pdf = BytesIO()
    writer.write(final_pdf)
    final_pdf.seek(0)
    filename = f"{notesheet.id}-approved-notesheet.pdf"
    return StreamingResponse(final_pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})
