"""NotesheetAI — FastAPI backend with Ollama / Gemini support."""

import asyncio
import json
import logging
import os
import re
import uuid
import traceback
from datetime import datetime

import faiss
import numpy as np
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from typing import Optional, List

from .config import settings
from .database import get_db, SessionLocal, User, Notesheet, NotesheetDocument, _utcnow, StageApprover
from .auth import get_current_user, require_roles
from .approval_api import router as approval_router
from .documents_api import router as documents_router
from .auth_api import router as auth_router
from .admin_api import router as admin_router
from .llm import get_llm_provider, switch_provider

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="NotesheetAI", version="1.0.0")

# CORS — allow the frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include sub-routers (once!)
app.include_router(approval_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

# ---------------------------------------------------------------------------
# Startup: embeddings, FAISS, category metadata
# ---------------------------------------------------------------------------

categories = [
    "lab_equipment_purchase",
    "event_expenditure",
    "guest_faculty_honorarium",
    "student_travel",
    "club_budget",
]

# Embedding model + FAISS index (populated at import time)
embedding_model = SentenceTransformer(settings.embedding_model)
faiss_index = faiss.IndexFlatL2(embedding_model.get_sentence_embedding_dimension())

all_embeddings: list = []
note_texts: list = []  # list of (category, note_dict)

for _cat in categories:
    _cat_dir = os.path.join(settings.data_dir, _cat)
    _notes_file = os.path.join(_cat_dir, "notesheets.json")
    if not os.path.exists(_notes_file):
        continue
    with open(_notes_file) as f:
        _notes = json.load(f)
    for _note in _notes:
        _text = _note.get("content", "")
        note_texts.append((_cat, _note))
        all_embeddings.append(embedding_model.encode(_text))

if all_embeddings:
    _stacked = np.stack(all_embeddings)
    faiss_index.add(_stacked)

# Category metadata (rules, checklists, thresholds)
category_meta: dict = {}
for _cat in categories:
    _cat_dir = os.path.join(settings.data_dir, _cat)
    category_meta[_cat] = {}
    for _key, _fname in [
        ("rules", "gfr_rules.json"),
        ("checklist", "completeness_checklist.json"),
        ("thresholds", "approval_thresholds.json"),
    ]:
        _path = os.path.join(_cat_dir, _fname)
        if os.path.exists(_path):
            with open(_path) as f:
                category_meta[_cat][_key] = json.load(f)

# Also try loading from root data/ directory
def _normalise_checklist(data) -> list:
    """Accept either a flat list or nested dict checklists and return a flat item list."""
    if isinstance(data, list):
        return [str(item) for item in data]
    if isinstance(data, dict):
        items: list = []
        for value in data.values():
            if isinstance(value, list):
                items.extend(str(item) for item in value)
            elif isinstance(value, str):
                items.append(value)
        return items
    return []


_root_data = os.path.join(os.path.dirname(__file__), "..", "..", "data")
for _key, _fname in [
    ("rules", "gfr_rules.json"),
    ("checklist", "completeness_checklist.json"),
    ("thresholds", "approval_thresholds.json"),
]:
    _path = os.path.join(_root_data, _fname)
    if os.path.exists(_path):
        # Apply as default for categories that don't have their own
        with open(_path) as f:
            _data = json.load(f)
        if _key == "checklist":
            _data = _normalise_checklist(_data)
        elif _key == "rules" and isinstance(_data, dict) and "rules" in _data:
            _data = _data["rules"]
        for _cat in categories:
            if _key not in category_meta.get(_cat, {}):
                category_meta.setdefault(_cat, {})[_key] = _data


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class NotesheetRequest(BaseModel):
    request_text: str
    category: str
    requester_name: Optional[str] = None
    department: Optional[str] = None
    amount: Optional[float] = None
    documents: Optional[List[str]] = None
    # Text extracted from uploaded reference PDFs; feeds retrieval + prompt.
    extra_context: Optional[str] = None


class LLMSettingsRequest(BaseModel):
    provider: str  # "ollama" | "gemini"
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    ollama_base_url: Optional[str] = None
    ollama_model: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_AMOUNT_RE = re.compile(
    r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)((?:\s*lakhs?)|(?:\s*crores?))?"
    r"|([\d,]+(?:\.\d+)?)\s*(lakhs?|crores?)",
    re.IGNORECASE,
)


def _parse_amount(raw: str, unit: str) -> int | None:
    value = raw.replace(",", "")
    try:
        amount = float(value)
    except ValueError:
        return None
    unit = (unit or "").strip().lower()
    if unit.startswith("lakh"):
        amount *= 100_000
    elif unit.startswith("crore"):
        amount *= 10_000_000
    return int(amount) if amount else None


def extract_request_details(request_text: str, category: str) -> dict:
    """Pull structured fields (amount, item) out of the free-text request."""
    details: dict = {}

    for match in _AMOUNT_RE.finditer(request_text):
        symbol_amount, symbol_unit, bare_amount, bare_unit = match.groups()
        if symbol_amount:
            parsed = _parse_amount(symbol_amount, symbol_unit)
        else:
            parsed = _parse_amount(bare_amount, bare_unit)
        if parsed:
            details["amount"] = parsed
            break

    item_match = re.search(
        r"\bfor\s+([A-Za-z0-9][A-Za-z0-9&\- ]{2,60}?)(?:[,.]|$|\sin\b|\sfor\b|\sat\b|\sbefore\b|\sof\s?(?:Rs|₹|INR))",
        request_text,
        re.IGNORECASE,
    )
    if item_match:
        item = re.sub(r"\s+", " ", item_match.group(1)).strip(" -")
        # Keep at most 6 words of the captured phrase.
        words = item.split()
        if len(words) > 6:
            item = " ".join(words[:6])
        details["item"] = item

    dept_match = re.search(r"\b(?:in|by)\s+(?:the\s+)?([A-Z][A-Za-z&]+(?:\s+[A-Z][A-Za-z&]+){0,3})\s*(?:Lab|lab|Department)?", request_text)
    if dept_match:
        details["department"] = dept_match.group(1).strip()

    return details


def get_approval_chain(amount: float, category: str) -> list:
    if category not in category_meta or "thresholds" not in category_meta[category]:
        return []
    thresholds = category_meta[category]["thresholds"].get("thresholds", [])
    for tier in thresholds:
        if "max_amount" in tier and amount <= tier["max_amount"]:
            return tier.get("approval_chain", [])
    return []


def draft_notesheet(request_details: dict, top_precedents: list, category: str,
                    extra_context: str = "", request_text: str = "") -> dict:
    """Generate named note-sheet sections using the active LLM provider."""
    applicable_rules = category_meta.get(category, {}).get("rules", [])
    try:
        prompt = f"Draft official note sheet for {category}. The user requested:\n'{request_text}'\n\nExtracted details: {request_details}.\n"
        prompt += f"Cite at least 2 most relevant precedents from: {top_precedents}.\n"
        if applicable_rules:
            prompt += (
                f"Cite applicable rules from this list: {applicable_rules}. "
                "End the note sheet with a line exactly formatted as 'Rules Cited: <comma-separated rule names>' "
                "using only rules from that list that genuinely apply.\n"
            )
        if extra_context.strip():
            excerpt = extra_context.strip()[:3000]
            prompt += (
                "The requester also uploaded a reference document. Use it as supporting context "
                f"where relevant:\n---BEGIN REFERENCE DOCUMENT---\n{excerpt}\n---END REFERENCE DOCUMENT---\n"
            )
        if "amount" in request_details:
            prompt += "Include a budget table with line items, GST, and total."

        prompt += """

Return exactly one valid JSON object. Do not use Markdown fences or add any text outside the JSON.
Use this exact shape:
{
  "draft_text": "The complete official note-sheet text only. Do not include approval-chain or routing text, nor headings named Justification, AI reasoning, budget data, or wording suggestions here.",
  "justification": "A concise standalone justification for this request.",
  "ai_reasoning": "A concise explanation of the precedents, rules, and approval routing used to prepare this request.",
  "approval_chain": ["First approval role", "Next approval role", "Final approval role"],
  "budget_items": [{"item": "item name", "quantity": 1, "unit_cost": 0, "gst_percent": 0}],
  "wording_suggestions": [{"before": "optional original wording", "after": "optional improved wording", "reason": "why the change helps"}]
}
Return the approval_chain as an ordered array of approval roles or offices. It is displayed separately by the application, so do not mention approvers, approval levels, approval routing, or an approval chain in draft_text. Use an empty approval_chain array only when no routing can be determined. Use empty arrays when there are no budget items or wording suggestions. Do not invent facts, amounts, rules, precedents, or quotations that are not supported by the request or supplied context.
"""

        provider = get_llm_provider()
        sections = parse_generated_sections(provider.generate(prompt))
        return {
            **sections,
            "draft_source": provider.provider_name(),
        }
    except Exception as e:
        log.exception("LLM call failed, falling back to template")
        template = _generate_template(request_details, category)
        return {
            "draft_text": template,
            "justification": request_text.strip(),
            "ai_reasoning": "The LLM was unavailable, so this static fallback was prepared from the request details.",
            "approval_chain": [],
            "budget_items": [],
            "wording_suggestions": [],
            "draft_source": "template",
            "error": str(e),
        }


_APPROVAL_CHAIN_SECTION_RE = re.compile(
    r"\n\s*(?:#{1,6}\s*)?(?:approval\s*(?:chain|route|routing)|recommended\s*approvals?)\s*:?\s*(?:\n|$).*",
    re.IGNORECASE | re.DOTALL,
)


def _without_approval_chain(draft_text: str) -> str:
    """Remove a labelled routing appendix; routing belongs in its own panel."""
    return _APPROVAL_CHAIN_SECTION_RE.sub("", draft_text).strip()


def parse_generated_sections(response_text: str) -> dict:
    """Parse the LLM's sectioned JSON, with a safe fallback for older replies."""
    raw = (response_text or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.IGNORECASE).strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = None

    # Be tolerant of a short preamble despite the contract above. Gemini can
    # occasionally wrap otherwise valid JSON in one explanatory sentence.
    if data is None:
        start, end = raw.find("{"), raw.rfind("}")
        if start != -1 and end > start:
            try:
                data = json.loads(raw[start : end + 1])
            except json.JSONDecodeError:
                pass

    if isinstance(data, dict):
        draft_text = _without_approval_chain(str(data.get("draft_text") or data.get("draft") or ""))
        justification = str(data.get("justification") or "").strip()
        ai_reasoning = str(data.get("ai_reasoning") or data.get("reasoning") or "").strip()
        approval_chain = data.get("approval_chain") if isinstance(data.get("approval_chain"), list) else []
        budget_items = data.get("budget_items") if isinstance(data.get("budget_items"), list) else []
        wording_suggestions = data.get("wording_suggestions") if isinstance(data.get("wording_suggestions"), list) else []
        if draft_text:
            return {
                "draft_text": draft_text,
                "justification": justification,
                "ai_reasoning": ai_reasoning,
                "approval_chain": [str(role).strip() for role in approval_chain if str(role).strip()],
                "budget_items": budget_items,
                "wording_suggestions": wording_suggestions,
            }

    # Older models occasionally return labelled prose. Keep labelled content
    # out of the note-sheet body instead of displaying their entire reply there.
    parts = re.split(r"^\s*(?:#{1,6}\s*)?(justification|ai reasoning|reasoning)\s*:?\s*$", raw, flags=re.IGNORECASE | re.MULTILINE)
    draft_text = _without_approval_chain(parts[0])
    extracted = {"justification": "", "ai_reasoning": ""}
    for index in range(1, len(parts), 2):
        label, value = parts[index].lower(), parts[index + 1].strip()
        if label == "justification":
            extracted["justification"] = value
        else:
            extracted["ai_reasoning"] = value
    return {
        "draft_text": draft_text or raw,
        **extracted,
        "approval_chain": [],
        "budget_items": [],
        "wording_suggestions": [],
    }


_RULE_PATTERN = re.compile(r"(?:GFR|DFPR)\s+Rules?\s*\d+[A-Za-z]*(?:\s*\([a-zA-Z]\))?", re.IGNORECASE)


def extract_rules_cited(draft_text: str) -> list:
    """Pull explicit rule citations (e.g. 'GFR Rule 153') out of a generated draft."""
    seen: list = []
    for match in _RULE_PATTERN.findall(draft_text or ""):
        normalised = re.sub(r"\s+", " ", match).strip()
        if normalised not in seen:
            seen.append(normalised)
    return seen


def _generate_template(request_details: dict, category: str) -> str:
    chain = get_approval_chain(request_details.get("amount") or 0, category)
    item = request_details.get("item", "the requested items")
    template = f"TO: {chain[0] if chain else '[Approver]'}\nFROM: [Requester]\nSUBJECT: Sanction for {category.replace('_', ' ').title()} — {item}\n\n"
    amount = request_details.get("amount")
    if isinstance(amount, (int, float)):
        template += f"Amount: ₹{amount:,}\n"
    else:
        template += "Amount: not stated\n"
    template += f"Item: {item}\n"
    if request_details.get("department"):
        template += f"Department: {request_details['department']}\n"
    template += "\nNOTE: The LLM backend was unavailable, so this is a static fallback template — regenerate once the LLM service is running.\n"
    return template


# ---------------------------------------------------------------------------
# Routes: Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health_check():
    provider = get_llm_provider()
    return {
        "status": "ok",
        "llm_provider": provider.provider_name(),
        "llm_model": provider.model_name(),
        "faiss_vectors": faiss_index.ntotal,
        "categories": len(categories),
    }


# ---------------------------------------------------------------------------
# Routes: Notesheet CRUD
# ---------------------------------------------------------------------------

async def _generation_pipeline(request: NotesheetRequest, db: Session, emit,
                               requester_id: Optional[int] = None) -> dict:
    """Run the full drafting pipeline, calling emit(stage, status, **extra)
    at each real transition so both the sync and streaming endpoints share
    identical logic."""
    try:
        if request.category not in categories:
            raise HTTPException(400, "Invalid category")

        await asyncio.to_thread(emit, "retrieve", "started")
        request_details = extract_request_details(request.request_text, request.category)

        # Precedent retrieval via FAISS — uploaded reference text is embedded
        # together with the prompt so it influences similarity matching.
        embedding_input = f"{request.category}: {request.request_text}"
        if request.extra_context:
            embedding_input += f"\n{request.extra_context[:4000]}"
        query_embedding = embedding_model.encode(embedding_input)
        try:
            distances, indices = faiss_index.search(np.array([query_embedding]), 3)
        except Exception:
            top_precedents = []
        else:
            top_precedents = [note_texts[i] for i in indices[0] if i < len(note_texts)]
        await asyncio.to_thread(emit, "retrieve", "done", precedents=len(top_precedents))

        await asyncio.to_thread(emit, "rules", "started")
        applicable_rules = category_meta.get(request.category, {}).get("rules", [])
        await asyncio.to_thread(emit, "rules", "done", count=len(applicable_rules))

        provider_name = get_llm_provider().provider_name()
        await asyncio.to_thread(emit, "draft", "started", provider=provider_name)
        # Run the blocking LLM call off the event loop so the server stays
        # responsive while the model generates.
        draft_result = await asyncio.to_thread(
            draft_notesheet, request_details, top_precedents, request.category,
            request.extra_context or "", request.request_text,
        )
        if draft_result.get("error"):
            await asyncio.to_thread(emit, "draft", "fallback", detail=str(draft_result["error"])[:200])
        else:
            await asyncio.to_thread(emit, "draft", "done")

        await asyncio.to_thread(emit, "review", "started")
        rules_cited = extract_rules_cited(draft_result.get("draft_text", ""))

        # Completeness check — required docs per category minus what was supplied.
        checklist = _normalise_checklist(category_meta.get(request.category, {}).get("checklist", []))
        provided = {d.strip().lower() for d in (request.documents or [])}
        documents_missing = [item for item in checklist if item.strip().lower() not in provided]

        # Use the LLM's routing in the dedicated Approval chain panel. The
        # category/amount policy chain remains a fallback for malformed or
        # incomplete LLM responses.
        amount = request.amount if request.amount else request_details.get("amount", 0)
        generated_chain = draft_result.get("approval_chain", [])
        approval_chain = generated_chain if generated_chain else get_approval_chain(amount, request.category)

        # Serialise precedents
        precedents_serializable = []
        for p in top_precedents:
            if isinstance(p, tuple) and len(p) >= 2:
                cat, note_dict = p[0], p[1]
                content = note_dict.get("content", "")
                precedents_serializable.append({
                    "category": cat,
                    "id": note_dict.get("id", "unknown"),
                    "excerpt": (content[:200] + "...") if len(content) > 200 else content,
                })

        ns_id = f"NS-{uuid.uuid4().hex[:12]}"

        # Persist to DB
        db_ns = Notesheet(
            id=ns_id,
            category=request.category,
            request_text=request.request_text,
            draft_text=draft_result["draft_text"],
            justification=draft_result.get("justification"),
            ai_reasoning=draft_result.get("ai_reasoning"),
            budget_items_json=json.dumps(draft_result.get("budget_items", [])),
            wording_suggestions_json=json.dumps(draft_result.get("wording_suggestions", [])),
            draft_source=draft_result["draft_source"],
            status="draft",
            amount=amount if amount else None,
            requester_name=request.requester_name,
            department=request.department,
            requester_id=requester_id,
            precedents_json=json.dumps(precedents_serializable),
            rules_json=json.dumps(rules_cited),
            approval_chain_json=json.dumps(approval_chain),
            documents_missing_json=json.dumps(documents_missing),
            error=draft_result.get("error"),
            created_at=_utcnow(),
            updated_at=_utcnow(),
        )
        db.add(db_ns)
        db.commit()
        await asyncio.to_thread(
            emit, "review", "done", missing=len(documents_missing), chain=len(approval_chain)
        )

        return {
            "id": ns_id,
            "request_text": request.request_text,
            "category": request.category,
            "draft_text": draft_result["draft_text"],
            "justification": draft_result.get("justification", ""),
            "ai_reasoning": draft_result.get("ai_reasoning", ""),
            "budget_items": draft_result.get("budget_items", []),
            "wording_suggestions": draft_result.get("wording_suggestions", []),
            "draft_source": draft_result["draft_source"],
            "status": "draft",
            "amount": amount if amount else None,
            "requester_name": request.requester_name,
            "department": request.department,
            "precedents_used": precedents_serializable,
            "rules_cited": rules_cited,
            "documents_missing": documents_missing,
            "uploaded_documents": [],
            "approval_chain": approval_chain,
            "error": draft_result.get("error"),
        }
    except HTTPException:
        raise
    except Exception as e:
        log.exception("Error in generation pipeline")
        traceback.print_exc()
        raise HTTPException(500, f"Internal error: {str(e)}")


def _noop_emit(*args, **kwargs) -> None:
    pass


def _uploaded_document_payloads(db: Session, notesheet_id: str) -> list:
    """Return upload metadata; the original PDF bytes stay in the database."""
    documents = (
        db.query(NotesheetDocument)
        .filter(NotesheetDocument.notesheet_id == notesheet_id)
        .order_by(NotesheetDocument.created_at.asc())
        .all()
    )
    return [
        {
            "id": document.id,
            "filename": document.filename,
            "content_type": document.content_type,
            "size": len(document.file_data),
            "created_at": document.created_at.isoformat() if document.created_at else None,
        }
        for document in documents
    ]


@app.post("/api/notesheets/generate")
async def generate_notesheet(request: NotesheetRequest, db: Session = Depends(get_db),
                             user: User = Depends(get_current_user)):
    request.requester_name = request.requester_name or user.name
    return await _generation_pipeline(request, db, _noop_emit, requester_id=user.id)


@app.post("/api/notesheets/generate/stream")
async def generate_notesheet_stream(request: NotesheetRequest, db: Session = Depends(get_db),
                                    user: User = Depends(get_current_user)):
    """Same pipeline as /generate but emits newline-delimited JSON progress
    events as each real stage completes. Final line carries stage=complete
    with the full result payload (or stage=error)."""
    request.requester_name = request.requester_name or user.name

    async def event_stream():
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue = asyncio.Queue()

        def emit(stage: str, status: str, **extra) -> None:
            payload = {"stage": stage, "status": status, **extra}
            loop.call_soon_threadsafe(queue.put_nowait, json.dumps(payload))

        async def runner():
            try:
                result = await _generation_pipeline(request, db, emit, requester_id=user.id)
                await queue.put(json.dumps({"stage": "complete", "result": result}))
            except HTTPException as e:
                await queue.put(json.dumps({"stage": "error", "detail": e.detail}))
            except Exception as e:
                log.exception("Streamed generation failed")
                await queue.put(json.dumps({"stage": "error", "detail": str(e)}))
            finally:
                await queue.put(None)  # sentinel

        task = asyncio.create_task(runner())
        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                yield item + "\n"
        finally:
            task.cancel()

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/notesheets")
def list_notesheets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Role-scoped listing: requesters see their own; profs add sheets routed
    to them; dean/admin see everything."""
    rows = db.query(Notesheet).order_by(Notesheet.created_at.desc()).all()
    if user.role in ("student", "club_lead"):
        rows = [r for r in rows if r.requester_id == user.id]
    elif user.role == "prof":
        routed = {
            sa.stage.notesheet_id
            for sa in db.query(StageApprover).filter(StageApprover.prof_id == user.id).all()
        }
        rows = [r for r in rows if r.requester_id == user.id or r.id in routed]
    return [
        {
            "id": ns.id,
            "category": ns.category,
            "request_text": ns.request_text,
            "draft_text": ns.draft_text,
            "justification": ns.justification,
            "ai_reasoning": ns.ai_reasoning,
            "budget_items": json.loads(ns.budget_items_json) if ns.budget_items_json else [],
            "wording_suggestions": json.loads(ns.wording_suggestions_json) if ns.wording_suggestions_json else [],
            "draft_source": ns.draft_source,
            "status": ns.status,
            "amount": ns.amount,
            "requester_name": ns.requester_name,
            "department": ns.department,
            "precedents_used": json.loads(ns.precedents_json) if ns.precedents_json else [],
            "rules_cited": json.loads(ns.rules_json) if ns.rules_json else [],
            "approval_chain": json.loads(ns.approval_chain_json) if ns.approval_chain_json else [],
            "documents_missing": json.loads(ns.documents_missing_json) if ns.documents_missing_json else [],
            "uploaded_documents": _uploaded_document_payloads(db, ns.id),
            "error": ns.error,
            "created_at": ns.created_at.isoformat() if ns.created_at else None,
            "updated_at": ns.updated_at.isoformat() if ns.updated_at else None,
        }
        for ns in rows
    ]


@app.get("/api/notesheets/{ns_id}")
def get_notesheet(ns_id: str, db: Session = Depends(get_db)):
    """Return a single notesheet by ID."""
    ns = db.query(Notesheet).filter(Notesheet.id == ns_id).first()
    if not ns:
        raise HTTPException(404, "Notesheet not found")
    return {
        "id": ns.id,
        "category": ns.category,
        "request_text": ns.request_text,
        "draft_text": ns.draft_text,
        "justification": ns.justification,
        "ai_reasoning": ns.ai_reasoning,
        "budget_items": json.loads(ns.budget_items_json) if ns.budget_items_json else [],
        "wording_suggestions": json.loads(ns.wording_suggestions_json) if ns.wording_suggestions_json else [],
        "draft_source": ns.draft_source,
        "status": ns.status,
        "amount": ns.amount,
        "requester_name": ns.requester_name,
        "department": ns.department,
        "precedents_used": json.loads(ns.precedents_json) if ns.precedents_json else [],
        "rules_cited": json.loads(ns.rules_json) if ns.rules_json else [],
        "approval_chain": json.loads(ns.approval_chain_json) if ns.approval_chain_json else [],
        "documents_missing": json.loads(ns.documents_missing_json) if ns.documents_missing_json else [],
        "uploaded_documents": _uploaded_document_payloads(db, ns.id),
        "error": ns.error,
        "created_at": ns.created_at.isoformat() if ns.created_at else None,
        "updated_at": ns.updated_at.isoformat() if ns.updated_at else None,
    }


# ---------------------------------------------------------------------------
# Routes: Precedents
# ---------------------------------------------------------------------------

@app.get("/api/precedents")
def list_precedents(user: User = Depends(require_roles("prof", "dean"))):
    """Return all precedents currently indexed in FAISS."""
    counts = _precedent_citation_counts()
    results = []
    for cat, note in note_texts:
        content = note.get("content", "")
        pid = note.get("id", "unknown")
        results.append({
            "id": pid,
            "category": cat,
            "title": note.get("subject", note.get("id", "Untitled")),
            "excerpt": (content[:300] + "...") if len(content) > 300 else content,
            "full_text": content,
            "cited_count": counts.get(pid, 0),
        })
    return results


@app.get("/api/precedents/{precedent_id}")
def get_precedent(precedent_id: str, user: User = Depends(require_roles("prof", "dean"))):
    """Return a single indexed precedent by its corpus id."""
    for cat, note in note_texts:
        if note.get("id") == precedent_id:
            return {
                "id": precedent_id,
                "category": cat,
                "title": note.get("subject", precedent_id),
                "excerpt": note.get("content", "")[:300],
                "full_text": note.get("content", ""),
                "cited_count": _precedent_citation_counts().get(precedent_id, 0),
            }
    raise HTTPException(404, "Precedent not found")


def _precedent_citation_counts() -> dict:
    """How many stored note sheets cite each precedent id (from the DB)."""
    db = SessionLocal()
    try:
        counts: dict = {}
        for (raw,) in db.query(Notesheet.precedents_json).all():
            if not raw:
                continue
            try:
                for p in json.loads(raw):
                    pid = p.get("id")
                    if pid:
                        counts[pid] = counts.get(pid, 0) + 1
            except json.JSONDecodeError:
                continue
        return counts
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Routes: Analytics
# ---------------------------------------------------------------------------

@app.get("/api/analytics")
def get_analytics(db: Session = Depends(get_db),
                  user: User = Depends(require_roles("dean"))):
    """Real analytics computed from the notesheets table."""
    all_ns = db.query(Notesheet).all()
    total = len(all_ns)

    # Breakdown by category / status
    by_category: dict = {}
    by_status: dict = {}
    for ns in all_ns:
        by_category[ns.category] = by_category.get(ns.category, 0) + 1
        by_status[ns.status] = by_status.get(ns.status, 0) + 1

    # Turnaround (created -> last updated) in days
    turnaround_days: list = []
    by_cat_days: dict = {}
    for ns in all_ns:
        if ns.created_at and ns.updated_at:
            days = (ns.updated_at - ns.created_at).total_seconds() / 86400
            if days < 0:
                continue
            turnaround_days.append(days)
            by_cat_days.setdefault(ns.category, []).append(days)

    turnaround_by_category = [
        {"category": cat, "days": round(sum(vals) / len(vals), 2)}
        for cat, vals in sorted(by_cat_days.items())
    ]
    avg_turnaround = round(sum(turnaround_days) / len(turnaround_days), 2) if turnaround_days else 0

    # Most-cited rules and precedents across stored note sheets
    rule_counts: dict = {}
    precedent_counts: dict = {}
    precedent_titles: dict = {}
    for ns in all_ns:
        try:
            for r in json.loads(ns.rules_json or "[]"):
                if isinstance(r, str):
                    rule_counts[r] = rule_counts.get(r, 0) + 1
        except json.JSONDecodeError:
            pass
        try:
            for p in json.loads(ns.precedents_json or "[]"):
                pid = p.get("id")
                if isinstance(p, dict) and pid:
                    precedent_counts[pid] = precedent_counts.get(pid, 0) + 1
                    precedent_titles.setdefault(pid, p.get("excerpt", "")[:60])
        except json.JSONDecodeError:
            pass

    most_cited_rules = [
        {"code": code, "count": count}
        for code, count in sorted(rule_counts.items(), key=lambda kv: -kv[1])[:5]
    ]
    most_cited_precedents = [
        {"title": f"{pid} — {precedent_titles.get(pid, '')}".strip(" —"), "count": count}
        for pid, count in sorted(precedent_counts.items(), key=lambda kv: -kv[1])[:5]
    ]

    return {
        "totalRequests": total,
        "requestsByCategory": [{"category": k, "count": v} for k, v in by_category.items()],
        "approvalOutcome": [{"name": k, "value": v} for k, v in by_status.items()],
        "turnaroundByCategory": turnaround_by_category,
        "mostCitedRules": most_cited_rules,
        "mostCitedPrecedents": most_cited_precedents,
        "avgTurnaroundDays": avg_turnaround,
        "approvalRate": (by_status.get("approved", 0) / total * 100) if total else 0,
    }


# ---------------------------------------------------------------------------
# Routes: Knowledge Base
# ---------------------------------------------------------------------------

@app.get("/api/knowledge-base")
def get_knowledge_base(q: Optional[str] = None, user: User = Depends(require_roles())):
    """FAISS index stats + list of indexed documents (optionally filtered)."""
    counts = _precedent_citation_counts()

    documents = []
    for cat in categories:
        cat_dir = os.path.join(settings.data_dir, cat)
        for key, fname in [
            ("Precedent Note Sheet", "notesheets.json"),
            ("GFR Rule", "gfr_rules.json"),
            ("Completeness Checklist", "completeness_checklist.json"),
            ("Approval Thresholds", "approval_thresholds.json"),
        ]:
            path = os.path.join(cat_dir, fname)
            if not os.path.exists(path):
                continue
            stat = os.stat(path)
            tags = [cat]
            cited = 0
            if fname == "notesheets.json":
                try:
                    with open(path, encoding="utf-8") as fh:
                        entries = json.load(fh)
                    for e in entries:
                        pid = e.get("id")
                        if pid:
                            cited += counts.get(pid, 0)
                            if e.get("id"):
                                tags.append(e["id"])
                except (json.JSONDecodeError, OSError):
                    pass

            title = f"{cat.replace('_', ' ').title()} — {fname}"
            haystack = " ".join([title, *tags, key]).lower()
            if q and q.strip().lower() not in haystack:
                continue

            documents.append({
                "id": f"{cat}/{fname}",
                "title": title,
                "type": key,
                "indexedAt": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "sizeKb": round(stat.st_size / 1024, 1),
                "tags": sorted(set(tags)),
                "citedCount": cited,
            })

    return {
        "totalDocuments": len(documents),
        "totalVectors": faiss_index.ntotal,
        "embeddingModel": settings.embedding_model,
        "documents": documents,
    }


# ---------------------------------------------------------------------------
# Routes: Categories
# ---------------------------------------------------------------------------

@app.get("/api/knowledge-base/stats")
def knowledge_base_stats(user: User = Depends(require_roles())):
    """Corpus statistics for the Knowledge Base dashboard."""
    counts = _precedent_citation_counts()

    doc_count = 0
    mtimes: list = []
    title_by_id: dict = {}
    for cat in categories:
        cat_dir = os.path.join(settings.data_dir, cat)
        for fname in [
            "notesheets.json",
            "gfr_rules.json",
            "completeness_checklist.json",
            "approval_thresholds.json",
        ]:
            path = os.path.join(cat_dir, fname)
            if not os.path.exists(path):
                continue
            doc_count += 1
            mtimes.append(os.stat(path).st_mtime)
            if fname == "notesheets.json":
                try:
                    with open(path, encoding="utf-8") as fh:
                        entries = json.load(fh)
                    for e in entries:
                        pid = e.get("id")
                        if not pid:
                            continue
                        subject = next(
                            (
                                line[len("SUBJECT:"):].strip()
                                for line in e.get("content", "").splitlines()
                                if line.startswith("SUBJECT:")
                            ),
                            None,
                        )
                        title_by_id[pid] = subject or pid
                except (json.JSONDecodeError, OSError):
                    pass

    most_cited = sorted(counts.items(), key=lambda kv: -kv[1])[:5]
    return {
        "totalDocuments": doc_count,
        "totalChunksIndexed": int(faiss_index.ntotal),
        # Index is rebuilt at boot from these files, so newest corpus file
        # mtime is the honest proxy for the last re-index time.
        "lastReindexedAt": (
            datetime.fromtimestamp(max(mtimes)).isoformat() if mtimes else None
        ),
        "mostCitedDocuments": [
            {"id": pid, "title": title_by_id.get(pid, pid), "citedCount": n}
            for pid, n in most_cited
        ],
    }


@app.get("/api/categories")
def list_categories():
    """Return all available categories with their metadata."""
    return [
        {
            "id": cat,
            "label": cat.replace("_", " ").title(),
            "rules": category_meta.get(cat, {}).get("rules", []),
            "checklist": category_meta.get(cat, {}).get("checklist", []),
            "thresholds": category_meta.get(cat, {}).get("thresholds", {}),
        }
        for cat in categories
    ]


# ---------------------------------------------------------------------------
# Routes: Professors (list)
# ---------------------------------------------------------------------------

@app.get("/api/profs")
def list_profs(db: Session = Depends(get_db)):
    rows = db.query(Prof).all()
    return [
        {"id": p.id, "name": p.name, "email": p.email, "position": p.position}
        for p in rows
    ]


# ---------------------------------------------------------------------------
# Routes: LLM Settings
# ---------------------------------------------------------------------------

@app.get("/api/settings/llm")
def get_llm_settings(user: User = Depends(require_roles())):
    """Return current LLM provider configuration."""
    provider = get_llm_provider()
    return {
        "provider": provider.provider_name(),
        "model": provider.model_name(),
        "ollama_base_url": settings.ollama_base_url,
        "ollama_model": settings.ollama_model,
        "gemini_model": settings.gemini_model,
        "gemini_api_key_set": bool(settings.gemini_api_key),
    }


@app.put("/api/settings/llm")
def update_llm_settings(req: LLMSettingsRequest, user: User = Depends(require_roles())):
    """Switch LLM provider at runtime."""
    try:
        provider = switch_provider(
            req.provider,
            gemini_api_key=req.gemini_api_key or "",
            gemini_model=req.gemini_model or "",
            ollama_base_url=req.ollama_base_url or "",
            ollama_model=req.ollama_model or "",
        )
        return {
            "status": "ok",
            "provider": provider.provider_name(),
            "model": provider.model_name(),
        }
    except Exception as e:
        raise HTTPException(400, str(e))
