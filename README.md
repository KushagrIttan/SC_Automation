# NotesheetAI — Policy-Driven Approval & Note-Sheet Automation

NotesheetAI drafts formal administrative note-sheets from a plain-language request, grounds
them in retrieved precedents (FAISS + SentenceTransformers), cites applicable financial rules,
suggests the correct approval chain by amount, checks required documents, and tracks real
multi-stage approvals.

## Architecture

| Component | Stack | Location | Port |
|---|---|---|---|
| Backend | FastAPI, SQLAlchemy, FAISS, Ollama/Gemini | `backend/` | 8001 |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind | `frontend/` | 3000 |

One frontend, one backend. The backend serves the API under `/api/*` and `/docs`.

Key features: RAG-grounded drafting with precedent citations, rule extraction (`GFR Rule N`),
per-category approval thresholds & checklists, submit → approve/reject workflow persisted in
SQLite, computed analytics, LLM provider switch (Ollama local / Gemini) that persists across
restarts, and honest `draft_source` labeling in the UI.

## Quick start

Prerequisites: Python 3.11+, Node 18+, [Ollama](https://ollama.com) with a model such as
`qwen2.5-coder:3b` (`ollama pull qwen2.5-coder:3b`).

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows (source .venv/bin/activate on Unix)
pip install -r ../requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001

# Terminal 2 — frontend
cd frontend
npm install
npm run dev                     # http://localhost:3000
```

Health check: `curl http://127.0.0.1:8001/health`
(expected: provider name/model + `faiss_vectors: 75`).

Seed approvers once (needed for approvals):

```bash
curl -X POST http://127.0.0.1:8001/api/profs -H "Content-Type: application/json" ^
  -d "{\"name\":\"Dr. A. Sharma\",\"email\":\"sharma@univ.edu\",\"position\":\"Head of Department\"}"
```

Switch to Gemini at runtime via `PUT /api/settings/llm` (or the Settings page); the choice is
persisted to `backend/.env` and survives restarts. API keys stay in `.env` (gitignored) and are
never returned by the API.

## Data & provenance

- Precedent corpus: `backend/data/<category>/notesheets.json` — 75 entries, 15 per category.
  Four categories were generated from the original `data/<cat>/*.docx` records by
  `backend/scripts/build_precedents.py` (USD→INR ×83; each entry cites its source file).
  Lab-equipment entries combine 3 original rich records plus authored entries in the same format.
- Per-category rules / checklists / approval-threshold JSONs live alongside the corpus.
- Generated note-sheets persist to `backend/notesheet.db` (SQLite; gitignored).

## Verification

```bash
npm --prefix frontend run build        # production build (10 routes)
curl http://127.0.0.1:8001/health
```

See `CONSOLIDATION_AND_FIX_SUMMARY.md` for the full fix log with evidence, known gaps, and
start/stop instructions.
