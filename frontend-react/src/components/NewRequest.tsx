import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PrecedentsPanel from './PrecedentsPanel';
import WordingSuggestions from './WordingSuggestions';
import BudgetTable from './BudgetTable';
import RuleSidebar from './RuleSidebar';
import ApprovalPipeline from './ApprovalPipeline';
import MissingDocsChecklist from './MissingDocsChecklist';
import ExplainableJustifications from './ExplainableJustifications';

const NewRequest = () => {
  const [requestText, setRequestText] = useState('');
  const [category, setCategory] = useState('lab_equipment_purchase');
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [draftText, setDraftText] = useState('');
  const [budgetItems, setBudgetItems] = useState<any[]>([]);
  const [approvalStages, setApprovalStages] = useState<any[]>([]);
  const [attachedDocs, setAttachedDocs] = useState<string[]>([]);
  const navigate = useNavigate();

  const categories = [
    'lab_equipment_purchase',
    'event_expenditure',
    'guest_faculty_honorarium',
    'student_travel',
    'club_budget'
  ];

  // Category-specific required documents
  const requiredDocsMap: Record<string, string[]> = {
    lab_equipment_purchase: ['Quotations', 'Comparative Statement', 'Purchase Committee Approval'],
    event_expenditure: ['Budget Breakdown', 'Sponsorship Letters', 'Venue Booking Confirmation'],
    guest_faculty_honorarium: ['Invitation Letter', 'Travel Bills', 'Honorarium Justification'],
    student_travel: ['Competition Details', 'TA/DA Claims', 'Faculty Recommendation'],
    club_budget: ['Annual Plan', 'Previous Utilization Report', 'Club Constitution']
  };

  // Mock suggestions for demo
  const mockSuggestions = [
    {
      original: "Sanction ₹50,000 for annual tech fest",
      suggested: "Sanction a sum of ₹50,000 (Rupees Fifty Thousand only) for the annual technical festival",
      reason: "More formal tone for official documents"
    }
  ];

  // Mock rules for demo
  const mockRules = [
    {
      rule_number: "GFR Rule 153",
      excerpt: "Procurement thresholds for non-recurring expenditures",
      full_text: "153. Procurement of goods and services shall be made through a transparent process. For non-recurring expenditures above ₹10,000, a minimum of three quotations shall be obtained and a comparative statement prepared."
    },
    {
      rule_number: "GGSIPU Ordinance 2023-4.2",
      excerpt: "Student event funding guidelines",
      full_text: "4.2 Student events may be funded up to ₹100,000 per annum per department, subject to approval by the Dean of Student Welfare and the Finance Committee."
    }
  ];

  // Mock explanations for demo
  const mockExplanations = [
    {
      reason: "Precedent-Based Drafting",
      details: "This draft cites two similar precedents: NS-20250101-001 (₹45,000 for cultural fest) and NS-20241115-003 (₹60,000 for hackathon). The structure and tone follow these approved examples."
    },
    {
      reason: "Rule Compliance",
      details: "The draft adheres to GFR Rule 153 (procurement thresholds) and GGSIPU Ordinance 2023-4.2 (student event funding). The approval chain (Prof A → Prof B → Dean) is derived from these rules."
    },
    {
      reason: "Budget Justification",
      details: "The requested amount (₹50,000) is within the ₹100,000 annual limit for student events per department. The budget table aligns with historical spending patterns for similar events."
    }
  ];

  // Mock approval stages for demo
  const mockApprovalStages = [
    {
      stage_order: 1,
      approvers: [
        { id: 1, name: "Prof A", status: "pending" },
        { id: 2, name: "Prof B", status: "pending" }
      ]
    },
    {
      stage_order: 2,
      approvers: [
        { id: 3, name: "Prof C", status: "pending" }
      ]
    },
    {
      stage_order: 3,
      approvers: [
        { id: 4, name: "Dean", status: "pending" }
      ]
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8001/api/notesheets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_text: requestText, category })
      });
      const data = await response.json();
      setDraft(data);
      setDraftText(data.draft_text);
      setApprovalStages(mockApprovalStages);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSuggestion = (suggestion: any) => {
    setDraftText(draftText.replace(suggestion.original, suggestion.suggested));
  };

  const handleBudgetCalculate = (items: any[]) => {
    setBudgetItems(items);
  };

  const handleApprove = (stageIndex: number, approverIndex: number) => {
    const newStages = [...approvalStages];
    newStages[stageIndex].approvers[approverIndex].status = 'approved';
    setApprovalStages(newStages);
  };

  const handleReject = (stageIndex: number, approverIndex: number, reason: string) => {
    const newStages = [...approvalStages];
    newStages[stageIndex].approvers[approverIndex].status = 'rejected';
    newStages[stageIndex].approvers[approverIndex].rejectionReason = reason;
    setApprovalStages(newStages);
  };

  const handleAttachDoc = (doc: string) => {
    setAttachedDocs([...attachedDocs, doc]);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">New Request</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Request Details</label>
          <textarea
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            rows={6}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="e.g., Sanction ₹50,000 for annual tech fest"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isLoading ? 'Generating...' : 'Generate Draft'}
        </button>
      </form>

      {draft && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
          <div className="lg:col-span-3 space-y-4">
            <div className="p-6 bg-white rounded-lg shadow">
              <h3 className="text-xl font-bold mb-4">Drafted Notesheet</h3>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={20}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <div className="mt-4">
                <button
                  onClick={() => navigate('/notesheets')}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Submit for Approval
                </button>
              </div>
            </div>
            <WordingSuggestions
              suggestions={mockSuggestions}
              onAccept={handleAcceptSuggestion}
            />
            <BudgetTable onCalculate={handleBudgetCalculate} />
            <ApprovalPipeline
              stages={approvalStages}
              onApprove={handleApprove}
              onReject={handleReject}
            />
            <MissingDocsChecklist
              requiredDocs={requiredDocsMap[category]}
              attachedDocs={attachedDocs}
              onAttach={handleAttachDoc}
            />
            <ExplainableJustifications explanations={mockExplanations} />
          </div>
          <div className="lg:col-span-1">
            <PrecedentsPanel precedents={draft.precedents_used} />
          </div>
          <div className="lg:col-span-1">
            <RuleSidebar rules={mockRules} />
          </div>
        </div>
      )}
    </div>
  );
};

export default NewRequest;