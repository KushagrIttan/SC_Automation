# NotesheetAI — Consolidation & Fix Summary

Date: 2026-08-23
Scope: full frontend consolidation + P0/P1 fixes based on the external audit.

## Single source of truth

| Component | Location | Port |
|---|---|---|
| Frontend (Next.js 16) | `frontend/` | **3000** (`next dev -p 3000`, fails fast if busy) |
| Backend (FastAPI) | `backend/` | **8001** |
| CORS | `backend/app/config.py` | allows exactly `localhost:3000` / `127.0.0.1:3000` |

Deleted: `frontend/` (Streamlit), `frontend-react/` (CRA skeleton), `src/` (Flask stub),
the duplicate nested tree in `frontend-next/`, and stale status docs
(PROJECT_STATUS, SYSTEM_FULLY_WORKING, SYSTEM_STATUS_HONEST, FRONTEND_REBUILD_HONEST_STATUS,
FULL_BUILD_SUMMARY, ARCHITECTURE_PIVOT_SUMMARY, BACKEND_VERIFICATION_*, HARDCODED_DATA_AUDIT,
API_CONTRACT*, `nul` artifact).

Note on the Downloads copy: `C:\Users\Kushagr\Downloads\ai-notesheet-system (1)` is an OLDER
snapshot (Aug 21) than the in-repo copy (Aug 23) which already contained the rewritten
`lib/api/*`. The repo copy was canonicalised as `frontend/`; only the missing
`next.config.mjs` was taken from Downloads.

## P0 items

### 1. Fake "Generate Draft" button — FIXED
- `components/new-request-form.tsx` now imports `generateDraft` from `@/lib/api/notesheets`
  (real POST to `/api/notesheets/generate`). `lib/generate-draft.ts` deleted;
  entire `lib/mock/` folder deleted (zero remaining references, verified by grep).
- Evidence: live POST → `"draft_source":"ollama"`, 3 precedents retrieved, row persisted.

### 2. Detail page 404 on real IDs — FIXED
- `app/(dashboard)/notesheets/[id]/page.tsx` now calls `fetchNoteSheet(id)` (real API);
  mapper `mapBackendNoteSheet()` converts backend payload → frontend `NoteSheet` type.
- Evidence: production server render of `/notesheets/NS-1787501902` → HTTP 200,
  76 KB HTML containing the real ID (previously mock lookup → notFound()).

### 3. CORS port mismatch — FIXED
- Frontend pinned to 3000 (fail-fast `-p 3000`); backend CORS already/only allows 3000.
- One-port policy eliminates silent drift to 3001.

### 4. Missing SQLAlchemy + unversioned seed corpus — FIXED
- `sqlalchemy>=2.0.0` added to `requirements.txt`.
- `.gitignore` no longer excludes `backend/data/`; seed corpus committed (75 entries).
- Fresh-install simulation: brand-new venv from global Python 3.11 +
  `pip install -r requirements.txt` → all imports OK (fastapi, uvicorn, sqlalchemy,
  faiss, sentence_transformers, ollama). Server boots with `faiss_vectors: 75`.

### 5. Completeness check & rules_cited — FIXED
- Real per-category checklists committed to `backend/data/<cat>/completeness_checklist.json`
  (5 items each). Loader normalises list/dict shapes.
- `documents_missing` = required checklist minus documents supplied in the request
  (`documents` field added to `NotesheetRequest`).
- `rules_cited` extracted from draft text via regex `(GFR|DFPR) Rule(s?) \d+…`;
  prompt instructs the model to end with a "Rules Cited:" line.
- Evidence: generation returned `RULES_CITED: GFR Rule 153`;
  `DOCS_MISSING` = exactly the 3 items not supplied.

### 6. Precedent corpus depth — FIXED (with provenance)
- New script `backend/scripts/build_precedents.py` converts the 60 original
  `data/<cat>/note_sheet_N.docx` records into note-sheet prose (USD→INR at 83,
  rounding documented in-script; every entry cites its source file).
- Result: 15 precedents per category across event_expenditure, guest_faculty_honorarium,
  student_travel, club_budget (stubs removed). lab_equipment_purchase: 3 original rich
  entries + 12 authored entries in identical format = 15.
- Audit discrepancy flagged: the "~15-per-category standard" attributed to lab equipment
  was actually 3 entries; parity was achieved by authoring, not by discovering more sources.
- Evidence: `/health` → `faiss_vectors: 75`; club_budget query retrieves NS-CLUB-* precedents.

## P1 items

### 7. Approve/reject — FIXED (verified against DB)
- Schema migration: `ApprovalStage.notesheet_id` Integer→String(50) + `name` column +
  missing `stage_approvers` relationship added (that relationship bug was NOT in the audit —
  found during this pass; old endpoint would 500 on any call).
- Dev DB recreated (SQLite table rebuild; no Alembic in scope). Old rows discarded.
- New endpoints: `POST /api/notesheets/{id}/submit`, `/approve`, `/reject`,
  plus fixed `/approval_status` (string IDs, stage names, prof names).
- Frontend `approval-action-panel.tsx` calls the real endpoints (approver dropdown,
  rejection reason), then refreshes server components.
- Evidence (approve): draft → submit (`pending_approval`) → HOD approved → Dean approved →
  `sheet: approved`; both StageApprover rows `approved` with timestamps.
- Evidence (reject): second sheet draft → submit → reject with reason →
  `sheet: rejected`; row stores the reason text.

### 8. Async LLM, UUID IDs, provider persistence — FIXED
- Generation runs via `asyncio.to_thread(...)` (event loop no longer blocked).
- IDs now `NS-` + uuid4 hex[:12] (e.g. `NS-f7379e7bba50`) — same-second collision impossible.
- `PUT /api/settings/llm` persists to `backend/.env` via `persist_settings()`;
  verified file contents after switch.

## Hygiene batch — FIXED
- Analytics: turnaround per category + avg, most-cited rules, most-cited precedents,
  approval rate — all computed from the DB (verified response with non-zero values).
- Knowledge base: `citedCount` computed from precedent citations; `?q=` filter implemented.
- `GET /api/precedents/{id}` implemented (200 on hit, 404 on miss).
- Category thresholds converted from dead `.txt` (dollar ranges) to loadable JSON INR tiers
  under `backend/data/<cat>/`; verified ₹25k club request yields HoD-only chain.
- Requester identity: form has Requester name + Department inputs (labels above fields);
  persisted in new `requester_name`/`department` columns and returned everywhere.
- Dead code removed: `app/health.py`, unused imports (`Base`, `engine`, `time`, `JSON`),
  deprecated `datetime.utcnow()` → tz-aware `_utcnow()`, `.dict()` → `model_dump()`.
- `draft_source` surfaced in UI: header badge ("drafted by ollama" vs amber
  "template fallback") with tooltip carrying the stored error.

## Verification performed
- Fresh venv install from requirements.txt (see P0-4).
- Live API evidence pasted above for every numbered item.
- Production build `npm run build` passes (10 routes) after fixing two build blockers
  introduced en route (missing export, BOM in package.json from PowerShell round-trip).
- All 7 dashboard routes return HTTP 200 under `next start -p 3000`; detail page
  server-renders real generated IDs.
- Encoding incident: a PowerShell edit pass double-encoded non-ASCII chars in main.py
  (`—`, `₹`); detected and fully repaired programmatically (only U+2014/U+20B9 remain).

## Honest gaps / NOT DONE
- **No browser DOM/console inspection or screenshots** — browser tooling unavailable in this
  environment; verification relied on build output + SSR HTML + API responses.
- **No automated tests** added (out of scope this pass).
- **No authentication** anywhere (prototype stance unchanged).
- Budget line-item extraction from drafts still absent (UI shows an honest empty state).
- Wording-suggestions feature remains unbuilt (renders empty).
- `next.config.mjs` retains pre-existing `ignoreBuildErrors: true`.
- DB schema change was a dev-reset migration, not a versioned migration (Alembic suggested).
- Gemini path compiles and switches but was not exercised live (no API key configured).

## Start / stop (Windows CMD)

```bat
:: ---- Terminal 1: backend ----
cd C:\Users\Kushagr\Documents\NotesheetAI\backend
.venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001

:: ---- Ollama (usually auto-starts; otherwise) ----
ollama serve

:: ---- Terminal 2: frontend ----
cd C:\Users\Kushagr\Documents\NotesheetAI\frontend
npm run dev          :: http://localhost:3000

:: ---- Stop ----
:: CTRL+C in each terminal, or:
taskkill /F /IM node.exe
taskkill /F /IM python.exe   :: careful: kills all python
```

First run on a fresh clone: create `backend\.venv`, `pip install -r requirements.txt`,
seed approvers via `POST /api/profs` (or use the Settings page), then generate.
