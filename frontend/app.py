import streamlit as st
import requests

# API client
API_URL = 'http://localhost:8000/api/notesheets/generate'

def main():
    st.title('AI Notesheet Generator - Lab Equipment Purchase')
    st.caption('Phase 1 Prototype')

    # Request form
    request_text = st.text_area('Enter your purchase request:', height=100)
    if st.button('Generate Notesheet'):
        if not request_text:
            st.error('Please enter a request')
            return
        
        response = requests.post(
            API_URL,
            json={'request_text': request_text}
        )
        if response.status_code == 200:
            data = response.json()
            st.success('Draft generated!')
            
            # Display results
            st.subheader('Drafted Notesheet')
            st.text(data['draft_text'])
            
            st.subheader('Cited Precedents')
            for p in data['precedents_used']:
                st.write(f"ID: {p['id']} | Amount: ₹{p['amount']} | {p['excerpt']}")
            
            st.subheader('Rules Cited')
            for r in data['rules_cited']:
                st.write(f"Rule: {r['rule_number']} | {r['excerpt']}")
            
            st.subheader('Document Status')
            if data['documents_missing']:
                st.error(f"Missing: {', '.join(data['documents_missing'])}")
            else:
                st.success('All required documents present')
            
            st.subheader('Approval Chain')
            st.write(' → '.join(data['approval_chain']))
            
            # Approve button (placeholder)
            if st.button('Approve (Human Review Required)'):
                st.info('Approval recorded. [Simulation - Phase 1]')
        else:
            st.error(f'Error: {response.text}')

if __name__ == '__main__':
    main()