# Extended API Contract for Phase 2

## New Endpoints

### Category Management
- `GET /api/categories`
  - Returns: List of categories with metadata (name, description, checklist items, approval thresholds)

### Budget Table Generation
- `POST /api/budget`
  - Request: Line items (item, qty, unit_cost, gst_applicable: bool)
  - Response: Computed budget table (JSON) with totals, GST, grand total

### Document Versioning & Diff
- `GET /api/notesheets/{id}/versions`
  - Returns: All versions of the note sheet (AI draft + human edits) with timestamps
- `GET /api/notesheets/{id}/diff`
  - Returns: Unified diff between AI draft and latest human edit

### Audit Trail
- `GET /api/notesheets/{id}/audit`
  - Returns: Timestamped log of actions (generate, edit, approve)

### Dashboard Stats
- `GET /api/dashboard/stats`
  - Returns: {
    "pending_by_category": {...},
    "aging_report": [...],  # Days pending per note sheet
    "precedent_usage": [...]  # Most cited historical note sheets
  }

## Modified Endpoints

### Generate Notesheet
- `POST /api/notesheets/generate` now requires `category` parameter:
  ```json
  {
    "request_text": "string",
    "category": "string"  // e.g., "event_expenditure"
  }
  ```

## Data Structure

```
/data/
├── lab_equipment_purchase/
│   ├── notesheets.json
│   ├── checklist.json
│   ├── approval_thresholds.json
│   └── gfr_rules.json
├── event_expenditure/
│   ├── notesheets.json
│   ├── checklist.json
│   ├── approval_thresholds.json
│   └── gfr_rules.json
├── guest_faculty_honorarium/
│   ...
├── student_travel/
│   ...
└── club_budget/
    ...
```

## Subagent Tasks
1. **Category Expansion**: Generate data for 4 new categories
2. **Budget Table**: Implement calculation logic and endpoint
3. **Versioning/Diff**: Database schema + endpoints
4. **Audit Trail**: Logging implementation
5. **Dashboard**: Streamlit page + stats endpoint

Regression test Phase 1 lab equipment flow after changes.