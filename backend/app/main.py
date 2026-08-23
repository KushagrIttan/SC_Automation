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
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from typing import Optional, List

from .config import settings
from .database import get_db, SessionLocal, Prof, Notesheet, _utcnow
from .approval_api import router as approval_router
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

# Include approval sub-router (once!)
app.include_router(approval_router, prefix="/api")

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


class LLMSettingsRequest(BaseModel):
    provider: str  # "ollama" | "gemini"
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    ollama_base_url: Optional[str] = None
    ollama_model: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def extract_request_details(request_text: str, category: str) -> dict:
    """Rudimentary keyword extraction from the request text."""
    details: dict = {}
    parts = request_text.split()
    for i, part in enumerate(parts):
        if part.lower() in ["₹", "rs", "rupees"] and i + 1 < len(parts):
            amount_str = "".join(filter(str.isdigit, parts[i + 1]))
            details["amount"] = int(amount_str) if amount_str else None
        if part.lower() == "for" and i + 1 < len(parts):
            details["item"] = parts[i + 1]
        if part.lower() == "in" and i + 1 < len(parts):
            details["department"] = parts[i + 1]
    return details


def get_approval_chain(amount: float, category: str) -> list:
    if category not in category_meta or "thresholds" not in category_meta[category]:
        return []
    thresholds = category_meta[category]["thresholds"].get("thresholds", [])
    for tier in thresholds:
        if "max_amount" in tier and amount <= tier["max_amount"]:
            return tier.get("approval_chain", [])
    return []


def draft_notesheet(request_details: dict, top_precedents: list, category: str) -> dict:
    """Generate a draft using the active LLM provider, with template fallback."""
    applicable_rules = category_meta.get(category, {}).get("rules", [])
    try:
        prompt = f"Draft official note sheet for {category} request: {request_details}.\n"
        prompt += f"Cite at least 2 most relevant precedents from: {top_precedents}.\n"
        if applicable_rules:
            prompt += (
                f"Cite applicable rules from this list: {applicable_rules}. "
                "End the note sheet with a line exactly formatted as 'Rules Cited: <comma-separated rule names>' "
                "using only rules from that list that genuinely apply.\n"
            )
        if "amount" in request_details:
            prompt += "Include a budget table with line items, GST, and total."

        provider = get_llm_provider()
        draft_text = provider.generate(prompt)
        return {
            "draft_text": draft_text,
            "draft_source": provider.provider_name(),
        }
    except Exception as e:
        log.exception("LLM call failed, falling back to template")
        template = _generate_template(request_details, category)
        return {"draft_text": template, "draft_source": "template", "error": str(e)}


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
    template = f"TO: [Approver]\nFROM: [Requester]\nSUBJECT: Sanction for {category.replace('_', ' ').title()}\n\n"
    template += f"Amount: ₹{request_details.get('amount', 'N/A')}\n"
    template += f"Details: {request_details}\n\n"
    template += "[Body citing precedents and rules]\n\n"
    template += f"APPROVAL CHAIN: {get_approval_chain(request_details.get('amount', 0), category)}\n"
    template += "SUPPORTING DOCS: [List required documents]"
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

@app.post("/api/notesheets/generate")
async def generate_notesheet(request: NotesheetRequest, db: Session = Depends(get_db)):
    try:
        if request.category not in categories:
            raise HTTPException(400, "Invalid category")

        request_details = extract_request_details(request.request_text, request.category)

        # Precedent retrieval via FAISS
        query_embedding = embedding_model.encode(f"{request.category}: {request.request_text}")
        try:
            distances, indices = faiss_index.search(np.array([query_embedding]), 3)
        except Exception:
            top_precedents = []
        else:
            top_precedents = [note_texts[i] for i in indices[0] if i < len(note_texts)]

        # Run the blocking LLM + retrieval work off the event loop so the
        # server stays responsive while the model generates.
        draft_result = await asyncio.to_thread(
            draft_notesheet, request_details, top_precedents, request.category
        )
        rules_cited = extract_rules_cited(draft_result.get("draft_text", ""))

        # Completeness check — required docs per category minus what was supplied.
        checklist = _normalise_checklist(category_meta.get(request.category, {}).get("checklist", []))
        provided = {d.strip().lower() for d in (request.documents or [])}
        documents_missing = [item for item in checklist if item.strip().lower() not in provided]

        # Approval chain
        amount = request.amount if request.amount else request_details.get("amount", 0)
        approval_chain = get_approval_chain(amount, request.category)

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
            draft_source=draft_result["draft_source"],
            status="draft",
            amount=amount if amount else None,
            requester_name=request.requester_name,
            department=request.department,
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

        return {
            "id": ns_id,
            "request_text": request.request_text,
            "category": request.category,
            "draft_text": draft_result["draft_text"],
            "draft_source": draft_result["draft_source"],
            "status": "draft",
            "amount": amount if amount else None,
            "requester_name": request.requester_name,
            "department": request.department,
            "precedents_used": precedents_serializable,
            "rules_cited": rules_cited,
            "documents_missing": documents_missing,
            "approval_chain": approval_chain,
            "error": draft_result.get("error"),
        }
    except HTTPException:
        raise
    except Exception as e:
        log.exception("Error in generate_notesheet")
        traceback.print_exc()
        raise HTTPException(500, f"Internal error: {str(e)}")


@app.get("/api/notesheets")
def list_notesheets(db: Session = Depends(get_db)):
    """Return all generated notesheets, newest first."""
    rows = db.query(Notesheet).order_by(Notesheet.created_at.desc()).all()
    return [
        {
            "id": ns.id,
            "category": ns.category,
            "request_text": ns.request_text,
            "draft_text": ns.draft_text,
            "draft_source": ns.draft_source,
            "status": ns.status,
            "amount": ns.amount,
            "requester_name": ns.requester_name,
            "department": ns.department,
            "precedents_used": json.loads(ns.precedents_json) if ns.precedents_json else [],
            "rules_cited": json.loads(ns.rules_json) if ns.rules_json else [],
            "approval_chain": json.loads(ns.approval_chain_json) if ns.approval_chain_json else [],
            "documents_missing": json.loads(ns.documents_missing_json) if ns.documents_missing_json else [],
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
        "draft_source": ns.draft_source,
        "status": ns.status,
        "amount": ns.amount,
        "requester_name": ns.requester_name,
        "department": ns.department,
        "precedents_used": json.loads(ns.precedents_json) if ns.precedents_json else [],
        "rules_cited": json.loads(ns.rules_json) if ns.rules_json else [],
        "approval_chain": json.loads(ns.approval_chain_json) if ns.approval_chain_json else [],
        "documents_missing": json.loads(ns.documents_missing_json) if ns.documents_missing_json else [],
        "error": ns.error,
        "created_at": ns.created_at.isoformat() if ns.created_at else None,
        "updated_at": ns.updated_at.isoformat() if ns.updated_at else None,
    }


# ---------------------------------------------------------------------------
# Routes: Precedents
# ---------------------------------------------------------------------------

@app.get("/api/precedents")
def list_precedents():
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
def get_precedent(precedent_id: str):
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
def get_analytics(db: Session = Depends(get_db)):
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
def get_knowledge_base(q: Optional[str] = None):
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
def knowledge_base_stats():
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
def get_llm_settings():
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
def update_llm_settings(req: LLMSettingsRequest):
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