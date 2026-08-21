# ARCHITECTURE_PIVOT_SUMMARY.md

## 1. Reused Components from Existing Build
- **RAG Pipeline**: FAISS retrieval for precedents, Ollama drafting with `qwen2.5-coder:3b`.
- **Category Structure**: Adapted for new categories (event_expenditure, guest_faculty_honorarium, student_travel, club_budget).
- **Completeness Checks**: Integrated into file upload requirements.
- **Streamlit UI Core**: Expanded, not replaced.

## 2. New Data Model for Approval Workflow
```sql
-- Profs Table
CREATE TABLE profs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    position VARCHAR(100)
);

-- Approval Stages Table
CREATE TABLE approval_stages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    notesheet_id INT NOT NULL,
    stage_order INT NOT NULL,
    FOREIGN KEY (notesheet_id) REFERENCES notesheets(id)
);

-- Stage Approvers Junction Table
CREATE TABLE stage_approvers (
    stage_id INT NOT NULL,
    prof_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT NULL,
    PRIMARY KEY (stage_id, prof_id),
    FOREIGN KEY (stage_id) REFERENCES approval_stages(id),
    FOREIGN KEY (prof_id) REFERENCES profs(id)
);
```

## 3. End-to-End Test Results

### **Approval Success Path**
1. **Request Submission**:
   - Category: `event_expenditure`
   - Request: "Sanction ₹50,000 for annual tech fest"
   - Attached File: `budget.pdf`
   - Justification: "Essential for student engagement and skill development."
   - Approvers Selected: Stage 1: Prof A & Prof B; Stage 2: Prof C (Dean auto-added).

2. **Approval Flow**:
   - **Stage 1**: Both Prof A and Prof B approved.
   - **Stage 2**: Prof C approved.
   - **Dean Approval**: Auto-routed and approved.

3. **Final Output** (Database Precedent Excerpt):
   ```json
   {
     "id": "NS-20260818-001",
     "category": "event_expenditure",
     "status": "approved",
     "approval_stages": [
       {"stage": 1, "approvers": ["Prof A", "Prof B"], "status": "approved"},
       {"stage": 2, "approvers": ["Prof C"], "status": "approved"},
       {"stage": 3, "approvers": ["Dean"], "status": "approved"}
     ]
   }
   ```

### **Rejection Path**
1. **Request Submission**: Same as above.
2. **Rejection at Stage 1**:
   - Prof B rejects with reason: "Insufficient budget justification."
3. **Loop-Back**: Requester redirected to form with rejection reason displayed.

## 4. Resolved Ambiguities
- **Dean Approval UI**: Included in the same status tracker as the final stage, labeled "Dean/Director".
- **Rejection Reason**: Mandatory text field in the approval UI before submission.

## 5. Current Run State
- **Backend**: `http://localhost:8001` (healthy)
- **Frontend**: `http://localhost:8502`
- **Test Verification**: Both paths executed successfully.

## 6. Positioning Narrative
"We've built a flexible, human-centric approval workflow that adapts to USAR's needs. Requesters get AI-drafted note sheets grounded in institutional precedents, while approvers collaborate in parallel, ensuring efficiency and compliance. The system learns from every approved case, continuously improving future drafts."
