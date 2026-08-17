import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import ollama

app = FastAPI()

# Configuration - move to config.py in production
CONFIG = {
    "OLLAMA_BASE_URL": os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434'),
    "OLLAMA_MODEL": 'qwen2.5-coder:3b',
    "EMBEDDING_MODEL": 'all-MiniLM-L6-v2',
    "DATA_DIR": os.path.join(os.path.dirname(__file__), '..', 'data')
}

# Load categories and data paths
categories = ['lab_equipment_purchase', 'event_expenditure', 'guest_faculty_honorarium', 'student_travel', 'club_budget']

# Initialize embedding model and FAISS index
model = SentenceTransformer(CONFIG['EMBEDDING_MODEL'])
index = faiss.IndexFlatL2(model.get_sentence_embedding_dimension())

# Load all historical note sheets into FAISS
all_embeddings = []
note_texts = []
for category in categories:
    category_dir = os.path.join(CONFIG['DATA_DIR'], category)
    notes_file = os.path.join(category_dir, 'notesheets.json')
    if not os.path.exists(notes_file):
        continue  # Handle missing files gracefully
    with open(notes_file) as f:
        notes = json.load(f)
    for note in notes:
        text = note.get('content', '')  # Use empty string if 'content' missing
        note_texts.append((category, note))
        all_embeddings.append(model.encode(text))

if len(all_embeddings) > 0:
    all_embeddings = np.stack(all_embeddings)
    index.add(all_embeddings)

# Load rules and checklists per category
category_meta = {}
for category in categories:
    category_dir = os.path.join(CONFIG['DATA_DIR'], category)
    category_meta[category] = {}
    # Load GFR rules
    rules_path = os.path.join(category_dir, 'gfr_rules.json')
    if os.path.exists(rules_path):
        with open(rules_path) as f:
            category_meta[category]['rules'] = json.load(f)
    # Load completeness checklist
    checklist_path = os.path.join(category_dir, 'completeness_checklist.json')
    if os.path.exists(checklist_path):
        with open(checklist_path) as f:
            category_meta[category]['checklist'] = json.load(f)
    # Load approval thresholds
    thresholds_path = os.path.join(category_dir, 'approval_thresholds.json')
    if os.path.exists(thresholds_path):
        with open(thresholds_path) as f:
            category_meta[category]['thresholds'] = json.load(f)

class NotesheetRequest(BaseModel):
    request_text: str
    category: str

def extract_request_details(request_text: str, category: str):
    details = {}
    if category == 'lab_equipment_purchase':
        # Existing extraction logic for lab equipment
        keywords = ['sanction', 'purchase', 'for', 'in']
        parts = request_text.split()
        for i, part in enumerate(parts):
            if part in ['₹', 'rs', 'rupees'] and i+1 < len(parts):
                amount_str = ''.join(filter(str.isdigit, parts[i+1]))
                details['amount'] = int(amount_str) if amount_str else None
            if part.lower() == 'for' and i+1 < len(parts):
                details['item'] = parts[i+1]
            if part.lower() == 'in' and i+1 < len(parts):
                details['department'] = parts[i+1]
    elif category == 'event_expenditure':
        # New logic for events
        # ... (implement event-specific extraction)
    # Add logic for other categories
    return details

def get_approval_chain(amount: float, category: str):
    if category not in category_meta or 'thresholds' not in category_meta[category]:
        return []
    thresholds = category_meta[category]['thresholds'].get('thresholds', [])
    for tier in thresholds:
        if 'max_amount' in tier and amount <= tier['max_amount']:
            return tier.get('approval_chain', [])
    return []

def draft_notesheet(request_details, top_precedents, category):
    try:
        prompt = f"Draft official note sheet for {category} request: {request_details}.\n"
        prompt += f"Cite at least 2 most relevant precedents from: {top_precedents}.\n"
        prompt += f"Cite applicable rules from: {category_meta[category].get('rules', [])}.\n"
        if 'amount' in request_details and category in ['event_expenditure', 'guest_faculty_honorarium', 'student_travel', 'club_budget']:
            prompt += f"Include a budget table with line items, GST, and total."
        response = ollama.chat(
            model=CONFIG['OLLAMA_MODEL'],
            messages=[{'role': 'user', 'content': prompt}]
        )
        draft_text = response['message']['content']
        return {'draft_text': draft_text, 'draft_source': 'ollama'}
    except Exception as e:
        template = generate_template(request_details, category)
        return {'draft_text': template, 'draft_source': 'template', 'error': str(e)}

# Helper function for template
def generate_template(request_details, category):
    template = f"TO: [Approver]\nFROM: [Requester]\nSUBJECT: Sanction for {category.replace('_', ' ').title()}\n\n"
    template += f"Amount: ₹{request_details.get('amount', 'N/A')}\n"
    template += f"Details: {request_details}\n\n"
    template += "[Body citing precedents and rules]\n\n"
    template += f"APPROVAL CHAIN: {get_approval_chain(request_details.get('amount', 0), category)}\n"
    template += "SUPPORTING DOCS: [List required documents]"
    return template

@app.post('/api/notesheets/generate')
async def generate_notesheet(request: NotesheetRequest):
    if request.category not in categories:
        raise HTTPException(400, 'Invalid category')

    request_details = extract_request_details(request.request_text, request.category)

    # Precedent retrieval
    query_embedding = model.encode(f"{request.category}: {request.request_text}")
    try:
        distances, indices = index.search(np.array([query_embedding]), 3)
    except Exception as e:
        # Handle empty index or FAISS errors
        top_precedents = []
    else:
        top_precedents = [note_texts[i] for i in indices[0] if i < len(note_texts)]

    draft_result = draft_notesheet(request_details, top_precedents, request.category)

    # Completeness check
    checklist = category_meta.get(request.category, {}).get('checklist', [])
    documents_missing = [item for item in checklist if item not in request_details.get('documents', [])]

    # Approval chain
    amount = request_details.get('amount', 0)
    approval_chain = get_approval_chain(amount, request.category)

    # Return response with draft source
    return {
        'id': f"NS-{int(time.time())}",  # Simple ID for demo
        'request_text': request.request_text,
        'category': request.category,
        'draft_text': draft_result['draft_text'],
        'draft_source': draft_result['draft_source'],
        'precedents_used': top_precedents,
        'rules_cited': draft_result.get('rules_cited', []),
        'documents_missing': documents_missing,
        'approval_chain': approval_chain,
        'status': 'draft',
        'error': draft_result.get('error')
    }

# Budget endpoint placeholder
@app.post('/api/budget')
async def calculate_budget(line_items: list):
    # Implement budget calculation
    return {'total': 0, 'gst': 0, 'grand_total': 0}

# ... Implement other Phase 2 endpoints
