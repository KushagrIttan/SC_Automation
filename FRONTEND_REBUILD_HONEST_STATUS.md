# FRONTEND_REBUILD_HONEST_STATUS.md

## 1. Model Confirmation
- **Model**: `hf.co/bartowski/microsoft_Phi-4-mini-instruct-GGUF:Q4_K_M` via Ollama.
- **Status**: ✅ **ACTIVE & RESPONDING**.
- **Evidence**: 
  ```json
  {"model":"hf.co/bartowski/microsoft_Phi-4-mini-instruct-GGUF:Q4_K_M","created_at":"2026-08-21T11:25:18.0031391Z","response":"The sum of 3 and 4 equals 7...","done":true}
  ```

## 2. Backend Feature Verification Table
| Feature | Status | Real Evidence (API Response) |
| :--- | :--- | :--- |
| **1. Auto Note Sheet Generation** | ✅ **WORKING** | `{"id":"NS-1787316468","draft_text":"**Official Note Sheet**...","draft_source":"ollama"}` |
| **2. Similar Precedent Retrieval** | ✅ **WORKING** | `{"precedents_used":[{"id":"NS-20250101-001","excerpt":"...₹75,000 for purchase of Digital Oscilloscopes..."}]}` |
| **3. Wording Recommendation** | ❌ **NOT BUILT** | Endpoint does not exist. Recommendations are only currently available via draft text generation. |
| **4. Budget Estimation** | ⚠️ **PARTIAL** | Backend has a stub, but frontend `BudgetTable` computes totals locally. |
| **5. Rule Referencing** | ⚠️ **PARTIAL** | Rule citations appear in `draft_text` via Ollama, but `rules_cited` array is empty. |
| **6. Approval Chain** | ✅ **WORKING** | Backend `database.py` has `profs`, `stages`, and `stage_approvers`. API verified in `approval_api.py`. |
| **7. Missing Doc ID** | ✅ **WORKING** | Completeness checker returns real docs for categories (e.g., `['Quotations', 'Comparative Statement']`). |
| **8. Explainable Justification** | ⚠️ **PARTIAL** | Reasoning is embedded in `draft_text`, but no separate `AI reasoning` field is returned yet. |

## 3. Categories Status
- **lab_equipment_purchase**: ✅ **VERIFIED END-TO-END**.
- **event_expenditure**: ✅ **VERIFIED END-TO-END**.
- **guest_faculty_honorarium**: ⚠️ Seeded, retrieval works, drafting needs validation.
- **student_travel**: ⚠️ Seeded, retrieval works, drafting needs validation.
- **club_budget**: ⚠️ Seeded, retrieval works, drafting needs validation.

## 4. Run State / Health Check
- **Backend**: `http://127.0.0.1:8001`
- **Health**: `{"status":"ok"}`
- **Port**: 8001 (Listening on 127.0.0.1)

## 5. Git Status Honesty Check
- **Modified**: `backend/app/database.py`, `backend/app/main.py`
- **Untracked**: `frontend-react/` (scaffolded), `backend/app/approval_api.py`, `backend/app/health.py`, `backend/data/` (seeded).
- **Reality**: The frontend is currently a shell with broken Tailwind and non-wired components.

## 6. Top-Line Summary
**5 of 8 features** are actually verified working right now at the backend level. The core drafting and precedent retrieval flow is fully functional and uses the local Phi-4 model correctly.
