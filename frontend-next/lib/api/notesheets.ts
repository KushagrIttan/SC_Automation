import { fetchApi } from "@/lib/api-client"
import type { NoteSheet, NoteSheetCategory } from "@/lib/types"

// Helper to map backend format to frontend types
function mapBackendNotesheet(item: any): NoteSheet {
  // Try to find matching frontend category format
  let frontendCategory: NoteSheetCategory = "Lab Equipment Purchase";
  if (item.category === "event_expenditure") frontendCategory = "Event/Fest Expenditure";
  if (item.category === "student_travel") frontendCategory = "Student Travel/TA-DA";
  if (item.category === "club_budget") frontendCategory = "Club Budget";
  if (item.category === "guest_faculty_honorarium") frontendCategory = "Guest Faculty Honorarium";

  return {
    id: item.id,
    subject: item.request_text ? `Sanction for ${item.request_text.substring(0, 50)}...` : `Note Sheet ${item.id}`,
    category: frontendCategory,
    requester: "Requester", 
    department: "Department",
    amount: item.amount || 0,
    status: item.status === "draft" ? "Draft" : (item.status === "approved" ? "Approved" : "Pending Approval"),
    currentStage: "Stage 1",
    createdAt: item.created_at || new Date().toISOString(),
    updatedAt: item.updated_at || new Date().toISOString(),
    prompt: item.request_text || "",
    draftText: item.draft_text || "",
    justification: "",
    aiReasoning: `Source: ${item.draft_source || 'unknown'}`,
    budgetItems: [],
    citations: (item.rules_cited || []).map((r: any, i: number) => ({
        id: `r-${i}`,
        code: r,
        title: r,
        excerpt: r,
        sourceDoc: "Rules"
    })),
    requiredDocuments: (item.documents_missing || []).map((d: string, i: number) => ({
        id: `d-${i}`,
        name: d,
        attached: false
    })),
    wordingSuggestions: [],
    approvalStages: (item.approval_chain || []).map((role: string, i: number) => ({
        id: `s-${i}`,
        name: `${role} Approval`,
        order: i + 1,
        approvers: []
    })),
    precedentIds: (item.precedents_used || []).map((p: any) => p.id)
  }
}

export async function fetchNoteSheets(): Promise<NoteSheet[]> {
  try {
    const data = await fetchApi<any[]>("/api/notesheets")
    return data.map(mapBackendNotesheet)
  } catch (error) {
    console.error("Failed to fetch notesheets:", error)
    return []
  }
}

export async function fetchNoteSheet(id: string): Promise<NoteSheet | null> {
  try {
    const data = await fetchApi<any>(`/api/notesheets/${id}`)
    return mapBackendNotesheet(data)
  } catch (error) {
    console.error(`Failed to fetch notesheet ${id}:`, error)
    return null
  }
}
