import { fetchApi } from "@/lib/api-client"
import type { NoteSheet, NoteSheetCategory } from "@/lib/types"

export interface GenerateDraftInput {
  prompt: string
  category: NoteSheetCategory
  department: string
  amountHint?: number
}

// Helper to convert display category to backend enum format
function toBackendCategory(cat: string): string {
  if (cat === "Event/Fest Expenditure") return "event_expenditure"
  if (cat === "Student Travel/TA-DA") return "student_travel"
  if (cat === "Club Budget") return "club_budget"
  if (cat === "Guest Faculty Honorarium") return "guest_faculty_honorarium"
  return "lab_equipment_purchase"
}

export async function generateDraft(input: GenerateDraftInput): Promise<NoteSheet> {
  const backendCat = toBackendCategory(input.category)
  
  // Call real backend
  const response = await fetchApi<any>("/api/notesheets/generate", {
    method: "POST",
    body: JSON.stringify({
      request_text: input.prompt,
      category: backendCat,
    }),
  })

  // Map backend response to frontend NoteSheet type
  const amount = response.amount || input.amountHint || 0

  return {
    id: response.id,
    subject: deriveSubject(input.prompt, input.category),
    category: input.category,
    requester: "Current User",
    department: input.department || "Engineering",
    amount: amount,
    status: "Draft",
    currentStage: "Not yet submitted",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    prompt: input.prompt,
    draftText: response.draft_text,
    justification: `AI Draft generated via ${response.draft_source || 'system'}.`,
    aiReasoning: "",
    budgetItems: [], // The text contains the budget if requested
    citations: (response.rules_cited || []).map((rule: any, idx: number) => ({
      id: `rule-${idx}`,
      code: rule.rule_number || `Rule ${idx + 1}`,
      title: rule.title || "Applicable Rule",
      excerpt: rule.excerpt || rule,
      sourceDoc: "Institutional Guidelines",
    })),
    requiredDocuments: (response.documents_missing || []).map((doc: string, idx: number) => ({
      id: `doc-${idx}`,
      name: doc,
      attached: false,
    })),
    wordingSuggestions: [],
    approvalStages: (response.approval_chain || []).map((role: string, idx: number) => ({
      id: `stage-${idx}`,
      name: `${role} Approval`,
      order: idx + 1,
      approvers: [
        {
          id: `approver-${idx}`,
          name: `Pending ${role}`,
          position: role,
          department: "University",
          status: "Pending",
          recommended: true,
        },
      ],
    })),
    precedentIds: (response.precedents_used || []).map((p: any) => p.id),
  }
}

function deriveSubject(prompt: string, category: NoteSheetCategory): string {
  const trimmed = prompt.trim()
  if (!trimmed) return `Sanction request — ${category}`
  const capped = trimmed.length > 90 ? `${trimmed.slice(0, 87)}...` : trimmed
  return `Sanction for ${capped.replace(/^sanction (for|of)?\s*/i, "")}`
}
