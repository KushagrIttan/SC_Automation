// REAL API CALLS - NO MORE MOCK DATA
import type { NoteSheet, NoteSheetCategory } from "@/lib/types"

const API_BASE = "http://127.0.0.1:8001"

// Map frontend categories to backend categories
const categoryMap: Record<NoteSheetCategory, string> = {
  "Lab Equipment Purchase": "lab_equipment_purchase",
  "Event/Fest Expenditure": "event_expenditure",
  "Guest Faculty Honorarium": "guest_faculty_honorarium",
  "Student Travel/TA-DA": "student_travel",
  "Club Budget": "club_budget",
}

const reverseCategoryMap: Record<string, NoteSheetCategory> = {
  lab_equipment_purchase: "Lab Equipment Purchase",
  event_expenditure: "Event/Fest Expenditure",
  guest_faculty_honorarium: "Guest Faculty Honorarium",
  student_travel: "Student Travel/TA-DA",
  club_budget: "Club Budget",
}

export async function fetchNoteSheets(): Promise<NoteSheet[]> {
  // Backend doesn't have list endpoint yet, return empty for now
  return []
}

export async function fetchNoteSheet(id: string): Promise<NoteSheet | null> {
  // Backend doesn't have get endpoint yet, return null
  return null
}

export interface GenerateDraftInput {
  prompt: string
  category: NoteSheetCategory
  attachedFileNames: string[]
}

export async function generateDraft(input: GenerateDraftInput): Promise<NoteSheet> {
  const backendCategory = categoryMap[input.category] || "lab_equipment_purchase"
  
  const response = await fetch(`${API_BASE}/api/notesheets/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      request_text: input.prompt,
      category: backendCategory,
    }),
  })

  if (!response.ok) {
    throw new Error(`Draft generation failed: ${response.status}`)
  }

  const data = await response.json()
  
  // Map backend response to frontend NoteSheet type
  return {
    id: data.id || `ns-${Date.now()}`,
    subject: extractSubject(data.draft_text || input.prompt),
    category: reverseCategoryMap[data.category] || input.category,
    requester: "Current User",
    department: "Engineering",
    amount: data.amount || 0,
    status: "Draft" as const,
    currentStage: "Not yet submitted",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    prompt: input.prompt,
    draftText: data.draft_text || "",
    justification: "",
    aiReasoning: data.error || "Generated using AI precedent retrieval from FAISS index and local Phi-4 model.",
    precedents: (data.precedents_used || []).map((p: any) => ({
      id: p.id || `prec-${Date.now()}`,
      subject: p.excerpt?.substring(0, 80) || "Historical precedent",
      category: reverseCategoryMap[p.category] || "Lab Equipment Purchase",
      amount: 0,
      createdAt: "",
      similarity: 0.85,
    })),
    ruleCitations: (data.rules_cited || []).map((r: any, i: number) => ({
      id: `rule-${i}`,
      code: r.code || r,
      title: r.title || "",
      excerpt: r.excerpt || "",
      sourceDoc: r.source || "GFR 2017",
    })),
    wordingSuggestions: [],
    requiredDocuments: (data.documents_missing || []).map((doc: string, i: number) => ({
      id: `doc-${i}`,
      name: doc,
      attached: false,
    })),
    budgetLineItems: [],
    approvalStages: (data.approval_chain || []).map((approver: string, index: number) => ({
      id: `stage-${index}`,
      name: `Stage ${index + 1}`,
      order: index + 1,
      approvers: [{
        id: `approver-${index}`,
        name: approver,
        position: "Approver",
        department: "Administration",
        status: "Pending" as const,
      }],
    })),
  }
}

function extractSubject(text: string): string {
  const subjectMatch = text?.match(/SUBJECT:\s*(.+)/i)
  if (subjectMatch) return subjectMatch[1].trim()
  const toMatch = text?.match(/TO:\s*(.+)/i)
  if (toMatch) return `Request to ${toMatch[1].trim()}`
  return text?.substring(0, 80) || "Untitled Request"
}
