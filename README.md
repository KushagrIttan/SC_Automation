# NotesheetAI — Policy-Driven Approval & Note-Sheet Automation

NotesheetAI is an intelligent, explainable platform designed for administrative note-sheet generation, precedent matching, policy compliance verification, and multi-stage approval workflows.

---

## 🌟 Key Features

1. **Automatic Note Sheet Generation**: Generates formal, policy-compliant administrative drafts using local LLMs (Ollama) tailored to specific request categories (e.g., event expenditure, procurement, academic approvals).
2. **Precedent Retrieval**: Vector search powered by FAISS and SentenceTransformers (`all-MiniLM-L6-v2`) to surface historical note-sheets and past decision context.
3. **Wording & Phrasing Recommendations**: Context-aware phrasing improvements for official administrative tone.
4. **Budget & Expenditure Estimation**: Automated line-item breakdown with GST calculations and financial threshold checks.
5. **Rule & Statute Referencing**: Automatic citation of General Financial Rules (GFR Rule 153) and institutional ordinances.
6. **Multi-Stage Approval Pipeline**: Interactive tracking and management of approval chains across departmental authorities.
7. **Missing Document Checklist**: Automatic verification of required supporting attachments before submission.
8. **Explainable AI Justifications**: Audit-ready explanation breakdown for precedent selection, rule compliance, and budget rationale.

---

## 🏗 System Architecture

- **Backend**: [FastAPI](https://fastapi.tiangolo.com/), [SQLAlchemy](https://www.sqlalchemy.org/), [SentenceTransformers](https://www.sbert.net/), [FAISS](https://github.com/facebookresearch/faiss), and [Ollama](https://ollama.com/)
- **Frontend**: [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), and [Tailwind CSS](https://tailwindcss.com/) located in [`frontend-react/`](file:///c:/Users/Kushagr/Documents/NotesheetAI/frontend-react)

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- Ollama (running locally with `bartowski/microsoft_Phi-4-mini-instruct-GGUF` or `qwen2.5-coder:3b`)

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup (React)
```bash
cd frontend-react
npm install
npm start
```
The React frontend will be available at `http://localhost:3000`.

---

## 🧪 Verification & Build Commands

- **Frontend Production Build**:
  ```bash
  npm --prefix frontend-react run build
  ```
- **Backend Health Check**:
  ```bash
  curl http://localhost:8000/health
  ```