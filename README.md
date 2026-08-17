# NotesheetAI Phase 1

## Overview
NotesheetAI automates the generation and approval of notesheets for administrative workflows. This project is divided into backend (FastAPI) and frontend (Streamlit) components.

## Backend
- **API Contract**: See `API_CONTRACT.md` for endpoints and schemas.
- **Data**: Synthetic notesheets, GFR rules, checklist, and approval thresholds.

## Frontend

### Theme and Styling Choices
The Streamlit frontend for NotesheetAI Phase 1 uses a clean, modern design with the following styling choices:

1. **Color Scheme**:
   - Primary color: Blue (`#007bff`) for buttons and interactive elements.
   - Background color: Light gray (`#f8f9fa`) for input fields.
   - Approval chain section: Light gray (`#e9ecef`) with rounded corners.

2. **Typography**:
   - Font size: 16px for body text with a line height of 1.6 for readability.

3. **Layout**:
   - Responsive design with Streamlit's built-in grid system.
   - Approval chain displayed in a styled container with padding and rounded borders.

4. **Interactive Elements**:
   - Rounded buttons with padding for better clickability.
   - Text inputs with rounded borders and padding for a modern look.

These styles are applied using custom CSS injected into the Streamlit app to override default styles and provide a polished user experience.

## Setup
1. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Run the backend:
   ```bash
   cd backend && uvicorn app.main:app --reload
   ```
3. Run the frontend:
   ```bash
   cd frontend && streamlit run app.py
   ```