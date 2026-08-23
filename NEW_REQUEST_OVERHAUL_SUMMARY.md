# New Request Page Overhaul — Summary

Date: 2026-08-23
Scope: Gemini-style prompt interaction, real pipeline progress streaming, PDF reference
upload with Tesseract OCR fallback.

## 0. Prior-fixes recheck (done first, as required)

- Backend health: `{"status":"ok","llm_provider":"ollama","faiss_vectors":75,"categories":5}`
- Fresh generation: `NS-f726622129d7`, `draft_source=ollama`
- Detail page for that real ID: HTTP 200 (no 404)
- Knowledge-base stats endpoint (previous fix): returns live `mostCitedDocuments`

No regressions. One data note (not a regression): on that particular generation the model
did not name any "GFR Rule N" in its prose so `rules_cited` was honestly empty — extraction
is regex-based and only reports what the draft actually cites. Other runs cite rules normally.

## 1. Animation implementation — what's REAL vs SIMULATED

**REAL — wired to actual backend state.** A new endpoint
`POST /api/notesheets/generate/stream` emits newline-delimited JSON events at each genuine
pipeline transition:

| Event | Fires when |
|---|---|
| `retrieve started/done {precedents:N}` | before/after FAISS similarity search |
| `rules done {count:N}` | after loading the category's rule set |
| `draft started {provider}` / `draft done` or `fallback` | around the LLM call itself |
| `review started/done {missing:N, chain:N}` | after citation extraction + completeness + chain |
| `complete {result}` | full persisted payload |

Client-side evidence (`backend/tests/stream_client.py`, real timestamps):

```
[   0.03s] retrieve  started
[   0.05s] retrieve  done     {'precedents': 3}
[   0.05s] rules     done     {'count': 2}
[   0.05s] draft     started  {'provider': 'ollama'}
[  14.49s] draft     done          <-- the 14.4 s gap IS the Ollama call
[  14.53s] review    done     {'missing': 5, 'chain': 2}
[  14.53s] COMPLETE id=NS-55a28c882370 source=ollama rules=['GFR Rule 153']
```

The progress UI (`components/new-request/pipeline-progress.tsx`) renders exactly these four
stages with queued/running/done states and per-stage detail from the events. Nothing is
timed or faked; the only client-side timer is an elapsed-seconds readout. If the stream
cannot start at all, the client falls back to the original non-streaming endpoint.

Interaction pattern:
- **Idle**: centered hero prompt card (max-w-3xl) with textarea, metadata fields, attach button.
- **On submit**: hero collapses via CSS `grid-template-rows 1fr→0fr` transition into a docked
  top bar showing the truncated request, category, PDF count and amount ("New request" expands
  it again; previous results remain below until replaced).
- **Working**: live PipelineProgress card in the results area + Cancel.
- **Complete**: existing result components (`NoteSheetDetail`, `ApprovalStepper`) fade/slide in —
  no result logic was rebuilt.
- All animations carry `motion-reduce:` fallbacks per the repo's accessibility standard.

## 2. OCR implementation — real and tested

Backend `backend/app/documents_api.py`:
- `POST /api/documents/extract` — opens the PDF with PyMuPDF; if embedded text ≥ 32 chars/page
  → returned as `method="text_layer"` (no OCR). Otherwise pages are rasterised at 200 DPI and
  run through Tesseract → `method="ocr"`. If scanned but Tesseract missing → honest
  `ocr_unavailable` result with install guidance (never fabricated text).
- `GET /api/documents/ocr-status` — availability + version; the form warns once if offline.
- Tesseract is located via PATH → `TESSERACT_CMD` env var → common Windows install paths
  (found here at `%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe`, v5.5.0).

Extracted text is shown to the user in a per-file expandable panel ("Extracted text … verify
accuracy") and is included in generation as `extra_context`: it is embedded together with the
prompt for FAISS retrieval AND passed to the LLM as a fenced REFERENCE DOCUMENT block.

Evidence (fixtures generated under `backend/tests/`):

- `textlayer.pdf` (embedded text) → `method=text_layer, chars=430`
- `scanned.pdf` (image-only page, direct-text extraction yields 0 chars)
  → `method=ocr, chars=435, 0.6 s`. Real extracted text:
  ```
  LAB EQUIPMENT NOTE SHEET
  TO: Head of Department, Electronics
  FROM: Lab In-charge
  SUBJECT: Sanction of Rs 42000 for Function Generator Upgrades
  Request: Replace 6 ageing analog function generators in the
  Signals Lab with 6 digital DDS units (Feeltech FY6900) at
  Rs 7000 per unit. Three vendor quotations enclosed.
  Justification: Existing units drift beyond calibration limits,
  affecting 120 students per semester in lab practicals.
  ```
- End-to-end with that OCR text attached: streamed generation completed
  (`NS-92ec652afd36`, ollama, GFR Rules 42+43 cited) and the draft references the uploaded
  content ("function generator"), proving extra_context reached retrieval + prompt.

## 3. Environment setup needed

Nothing further on this machine: PyMuPDF 1.28.2, pytesseract, Pillow, python-multipart are
installed in `backend/.venv` and pinned in `requirements.txt`; Tesseract v5.5.0 was already
installed. On a fresh machine you would need:
1. `pip install -r requirements.txt`
2. Tesseract binary (Windows: UB-Mannheim installer) — only needed for *scanned* PDFs;
   text-layer PDFs work without it.

## 4. Run state & how to test live

Both servers are running right now (backend :8001, frontend :3000, dev mode hot-reloaded).

1. Open http://localhost:3000/new-request — hero prompt is centred.
2. Click **Attach PDF**, pick `backend/tests/scanned.pdf` — chip appears, then an amber
   **OCR** badge; click the file name to inspect the extracted text panel.
3. Type a request, hit **Generate draft** — prompt docks to the top bar, the live pipeline
   card walks retrieve → rules → draft (this stage takes tens of seconds; it's the real LLM)
   → review, then the familiar results view fades in.
4. "New request" re-expands the prompt without discarding the result below.
5. Production build verified: `npm run build` passes (10 routes).

Known limitation: visual smoothness of the collapse animation was verified by code paths,
build and SSR responses (no browser automation available); the timing/behaviour claims above
are all backed by captured API traffic.
