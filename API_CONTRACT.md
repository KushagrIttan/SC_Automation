# NotesheetAI Phase 1

## API Contract

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/notesheets/generate` | Full loop: extract → retrieve precedents → LLM draft → completeness check → approval chain. Returns drafted notesheet |
| `GET` | `/api/notesheets` | Registry of all notesheets (summary, status filter) |
| `GET` | `/api/notesheets/{id}` | Full notesheet by id |
| `PUT` | `/api/notesheets/{id}` | Human edits to `draft_text` (status stays `draft`) |
| `POST` | `/api/notesheets/{id}/approve` | **Human-only approval** — requires `reviewer_name`; never called by generate flow |
| `GET` | `/api/meta/checklist` | Completeness checklist for this category |
| `GET` | `/api/meta/thresholds` | Approval-chain threshold table |
| `GET` | `/api/meta/rules` | GFR/DFPR rule excerpts |
| `GET` | `/api/meta/precedents` | Seeded historical note sheets |
| `GET` | `/health` | Embedding model, LLM provider, FAISS index, DB counts |

## File Structure

```
NotesheetAI/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   ├── seed.py
│   │   ├── retrieval.py
│   │   ├── drafting.py
│   │   ├── completeness.py
│   │   ├── approval_chain.py
│   │   ├── extractor.py
│   │   └── prompts.py
│   └── requirements.txt
├── frontend/
│   ├── app.py
│   └── .streamlit/
│       └── config.toml
├── data/
│   ├── notesheets.json
│   ├── gfr_rules.json
│   ├── checklist.json
│   └── approval_thresholds.json
├── .venv/
├── .gitignore
├── README.md
└── PHASE1_SUMMARY.md
```

## Approval Thresholds (Assumptions)

- `<₹25,000` → HOD
- `₹25,000–₹1,00,000` → HOD → Dean
- `>₹1,00,000` → HOD → Dean → Registrar → Finance Officer

## Next Steps

- **Dataset subagent**: 18 synthetic notesheets, 10 GFR rules, checklist, thresholds
- **Backend subagent**: FastAPI scaffold, seed, retrieval, drafting, completeness, approval_chain, extractor
- **Frontend subagent**: Streamlit UI with theme from frontend-design skill

All subagents work against the shared API contract above.