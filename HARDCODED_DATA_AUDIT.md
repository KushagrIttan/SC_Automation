# COMPLETE HARDCODED DATA AUDIT - NotesheetAI
**Date**: 2026-08-21 18:04 UTC

---

## 🔴 FRONTEND HARDCODED DATA

### 1. **Mock Data Files** (NOT connected to backend)
Location: `frontend-next/lib/mock/`

#### `analytics.ts` - FAKE ANALYTICS DATA
- Total notesheets: 156 (fake)
- Approved: 89, Pending: 52, Rejected: 15 (all fake)
- Category breakdown with fake counts
- Top precedents with fake citation counts
- Top rules with fake citation counts
- Average approval time: 3.2 days (fake)

**Used By**: Analytics page still shows this fake data

#### `approvers.ts` - FAKE PROFESSOR DIRECTORY
```typescript
export const approverDirectory: Approver[] = [
  {
    id: "prof-001",
    name: "Dr. Rajesh Kumar",
    position: "Head of Department",
    department: "Electronics",
    status: "Pending"
  },
  {
    id: "prof-002", 
    name: "Dr. Anita Singh",
    position: "Dean",
    department: "Engineering",
    status: "Pending"
  },
  // ... 8 more fake professors
]
```

**Used By**: Approval selection dropdowns

#### `knowledge-base.ts` - FAKE RAG/KNOWLEDGE BASE
```typescript
export const knowledgeDocuments: KnowledgeDocument[] = [
  {
    id: "doc-001",
    title: "GFR 2017 - Rule 153",
    type: "Rule",
    content: "Fake rule content...",
    tags: ["procurement", "thresholds"],
    retrievalCount: 45
  },
  // ... 12 more fake documents
]

export const retrievalStats = {
  totalDocuments: 127,  // FAKE
  totalRetrievals: 2341, // FAKE
  avgRetrievalTime: 0.34 // FAKE
}
```

**Used By**: RAG Management / Knowledge Base page

#### `notesheets.ts` - FAKE NOTESHEET HISTORY
```typescript
export const noteSheets: NoteSheet[] = [
  {
    id: "ns-001",
    subject: "Lab Equipment Purchase - Oscilloscopes",
    category: "Lab Equipment Purchase",
    requester: "Dr. Sharma",
    department: "Electronics",
    amount: 75000,
    status: "Approved",
    // ... full fake notesheet with precedents, rules, etc.
  },
  // ... 15 more fake notesheets
]
```

**Used By**: 
- "My Note Sheets" page (list view)
- Individual notesheet detail pages
- Approvals page (pending list)

#### `precedents.ts` - FAKE PRECEDENT LIBRARY
```typescript
export const precedentLibrary: Precedent[] = [
  {
    id: "prec-001",
    subject: "Digital Oscilloscopes - ₹75,000",
    category: "Lab Equipment Purchase",
    amount: 75000,
    createdAt: "2024-03-15T10:30:00Z",
    similarity: 0.92
  },
  // ... 12 more fake precedents
]
```

**Used By**: Precedent Library page

#### `rules.ts` - FAKE RULE CITATIONS
```typescript
export const ruleLibrary: RuleCitation[] = [
  {
    id: "rule-001",
    code: "GFR Rule 153",
    title: "Powers of Sanction",
    excerpt: "Fake rule text...",
    sourceDoc: "General Financial Rules 2017"
  },
  // ... 8 more fake rules
]
```

**Used By**: Rule reference tooltips/modals

---

### 2. **API Files Still Using Mock Data**

#### `lib/api/analytics.ts` - ❌ NOT WIRED
```typescript
import { analyticsSnapshot } from "@/lib/mock/analytics"

export async function fetchAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  await delay()
  return clone(analyticsSnapshot) // RETURNS FAKE DATA
}
```

#### `lib/api/approvers.ts` - ❌ NOT WIRED
```typescript
import { approverDirectory } from "@/lib/mock/approvers"

export async function fetchApproverDirectory(): Promise<Approver[]> {
  await delay()
  return clone(approverDirectory) // RETURNS FAKE DATA
}
```

#### `lib/api/knowledge-base.ts` - ❌ NOT WIRED
```typescript
import { knowledgeDocuments, retrievalStats } from "@/lib/mock/knowledge-base"

export async function fetchKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  await delay()
  return clone(knowledgeDocuments) // RETURNS FAKE DATA
}
```

#### `lib/api/precedents.ts` - ❌ NOT WIRED
```typescript
import { precedentLibrary, getPrecedent } from "@/lib/mock/precedents"

export async function fetchPrecedents(): Promise<Precedent[]> {
  await delay()
  return clone(precedentLibrary) // RETURNS FAKE DATA
}
```

#### `lib/api/notesheets.ts` - ⚠️ PARTIALLY WIRED
```typescript
// ✅ generateDraft() - NOW CALLS REAL BACKEND
// ❌ fetchNoteSheets() - Returns empty array (no backend endpoint)
// ❌ fetchNoteSheet(id) - Returns null (no backend endpoint)

export async function fetchNoteSheets(): Promise<NoteSheet[]> {
  return [] // HARDCODED EMPTY - backend has no list endpoint
}

export async function fetchNoteSheet(id: string): Promise<NoteSheet | null> {
  return null // HARDCODED NULL - backend has no get endpoint
}
```

---

### 3. **Hardcoded UI Text & Configuration**

#### `components/app-sidebar.tsx`
```typescript
const primaryNav = [
  { title: "New Request", href: "/new-request", icon: FilePlus2 },
  { title: "My Note Sheets", href: "/notesheets", icon: FileStack },
  { title: "Approvals", href: "/approvals", icon: ClipboardCheck },
]

const libraryNav = [
  { title: "Precedent Library", href: "/precedents", icon: BookMarked },
  { title: "Knowledge Base", href: "/knowledge-base", icon: Database },
]

const insightsNav = [
  { title: "Analytics", href: "/analytics", icon: BarChart3 }
]
```

#### `lib/types.ts`
```typescript
export type NoteSheetCategory =
  | "Lab Equipment Purchase"
  | "Event/Fest Expenditure"
  | "Guest Faculty Honorarium"
  | "Student Travel/TA-DA"
  | "Club Budget"

export type NoteSheetStatus = "Draft" | "Pending Approval" | "Approved" | "Rejected"
```

#### `app/layout.tsx`
```typescript
export const metadata = {
  title: "Sanction Desk — AI Note Sheet Drafting",
  description: "AI-assisted drafting, precedent retrieval...",
}
```

#### `components/new-request-form.tsx`
```typescript
// Hardcoded field mappings
requester: "Current User",  // Should come from auth
department: "Engineering",  // Should be user's department
```

---

## 🔴 BACKEND HARDCODED DATA

### 1. **Configuration** (`backend/app/main.py`)
```python
CONFIG = {
    "OLLAMA_BASE_URL": "http://localhost:11434",  # Hardcoded
    "OLLAMA_MODEL": "hf.co/bartowski/microsoft_Phi-4-mini-instruct-GGUF:Q4_K_M",  # Hardcoded
    "EMBEDDING_MODEL": "all-MiniLM-L6-v2",  # Hardcoded
    "DATA_DIR": os.path.join(os.path.dirname(__file__), '..', 'data')
}

categories = [
    'lab_equipment_purchase',
    'event_expenditure', 
    'guest_faculty_honorarium',
    'student_travel',
    'club_budget'
]  # Hardcoded category list
```

### 2. **Category Metadata** (`backend/app/main.py`)
```python
category_meta = {
    'lab_equipment_purchase': {
        'rules': ['GFR Rule 153', 'GGSIPU Equipment Guidelines 2023'],  # Hardcoded
        'checklist': [
            'Quotations (minimum 3)',
            'Comparative Statement',
            'Technical Specifications',
            'Purchase Committee Approval'
        ],  # Hardcoded
        'thresholds': {
            'thresholds': [
                {'max_amount': 50000, 'approval_chain': ['Lab In-charge', 'HoD']},
                {'max_amount': 200000, 'approval_chain': ['Lab In-charge', 'HoD', 'Dean']},
            ]
        }  # Hardcoded approval logic
    },
    # Similar hardcoded metadata for other categories...
}
```

### 3. **Seed Data Files** (`backend/data/`)

#### `backend/data/lab_equipment_purchase/notesheets.json`
```json
[
  {
    "id": "NS-20250101-001",
    "category": "lab_equipment_purchase",
    "content": "TO: Head of Department...\n[Full hardcoded precedent notesheet]"
  },
  // 2 more hardcoded precedents
]
```

#### `backend/data/event_expenditure/notesheets.json`
```json
[
  {
    "id": "NS-20250101-001",
    "category": "event_expenditure",
    "content": "Event expenditure note sheet example"  // Minimal stub
  }
]
```

**Similar stub files for**: `guest_faculty_honorarium`, `student_travel`, `club_budget`

### 4. **Database Seed Data** (`backend/notesheet.db`)
```sql
-- Only 2 professors seeded:
INSERT INTO profs VALUES (1, 'Dr. Sharma', 'sharma@univ.edu', 'Professor');
INSERT INTO profs VALUES (2, 'Dr. Gupta', 'gupta@univ.edu', 'Head of Department');
```

### 5. **Template Fallback** (`backend/app/main.py`)
```python
def generate_template(request_details, category):
    template = f"TO: [Approver]\\nFROM: [Requester]\\n"  # Hardcoded template
    template += f"SUBJECT: Sanction for {category}\\n\\n"
    template += f"Amount: ₹{request_details.get('amount', 'N/A')}\\n"
    # ... more hardcoded template text
    return template
```

Used when Ollama call fails.

---

## 📊 SUMMARY TABLE

| Component | Hardcoded? | Connected to Real Data? |
|-----------|------------|-------------------------|
| **Draft Generation** | ❌ (calls Ollama) | ✅ Real AI + FAISS |
| **Precedent Retrieval** | ⚠️ (7 seeded) | ✅ Real FAISS search |
| **Notesheet List** | ✅ 15 fake notesheets | ❌ Mock data |
| **Notesheet Detail** | ✅ 15 fake notesheets | ❌ Mock data |
| **Analytics** | ✅ Fake stats | ❌ Mock data |
| **Professor Directory** | ✅ 10 fake professors | ⚠️ DB has 2 real |
| **Precedent Library** | ✅ 12 fake precedents | ❌ Mock data |
| **Knowledge Base/RAG** | ✅ 13 fake docs | ⚠️ FAISS has 7 real |
| **Rule Citations** | ✅ 8 fake rules | ❌ Mock data |
| **Approval Stages** | ⚠️ Logic hardcoded | ✅ DB schema ready |
| **Categories** | ✅ 5 hardcoded | ✅ Backend uses same |
| **Approval Thresholds** | ✅ Hardcoded tiers | ❌ Not in DB |

---

## 🎯 WHAT'S REAL vs FAKE

### ✅ ACTUALLY WORKING WITH REAL DATA
1. Draft generation (calls Ollama)
2. FAISS precedent retrieval (7 real precedents)
3. SQLite database (2 real professors, tables ready)
4. Approval API endpoints (create profs/stages)

### ❌ STILL SHOWING FAKE DATA
1. "My Note Sheets" page - 15 fake notesheets
2. Individual notesheet detail pages - fake data
3. "Approvals" page - fake pending list
4. Analytics page - fake statistics
5. Precedent Library - 12 fake precedents
6. Knowledge Base - 13 fake documents
7. Professor selector - 10 fake professors (only 2 real in DB)

---

## 🔧 TO MAKE IT FULLY REAL

### Missing Backend Endpoints
```python
@app.get('/api/notesheets')  # List all generated notesheets
@app.get('/api/notesheets/{id}')  # Get single notesheet
@app.get('/api/precedents')  # List indexed precedents
@app.get('/api/analytics')  # Real analytics from DB
@app.get('/api/knowledge-base')  # FAISS index stats
@app.get('/api/profs')  # List professors (already exists!)
```

### Missing Database Tables
```sql
CREATE TABLE notesheets (
  id TEXT PRIMARY KEY,
  category TEXT,
  request_text TEXT,
  draft_text TEXT,
  status TEXT,
  created_at TIMESTAMP,
  -- ... all notesheet fields
);
```

### Missing Data
- More professors in `profs` table (only 2 exist)
- More precedents in seed files (only 7 total)
- Real historical notesheets (none stored yet)
- Real analytics (no data to analyze yet)

---

## 🚨 CRITICAL ISSUE

**The frontend looks complete but 90% of data is fake mock data.** Only the "Generate Draft" button calls the real backend. Everything else - the list pages, detail pages, analytics - is pulling from hardcoded TypeScript arrays in `lib/mock/*.ts` files.

**User experience**: You can generate ONE real draft, but can't see it in "My Note Sheets" because that page shows fake data. The draft isn't saved to the database either.
