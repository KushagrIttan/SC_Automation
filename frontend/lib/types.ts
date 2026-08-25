// Shared domain types for the Sanction Desk note-sheet system.
// These types are the contract the future FastAPI backend should satisfy.

export type NoteSheetCategory =
  | "Lab Equipment Purchase"
  | "Event/Fest Expenditure"
  | "Guest Faculty Honorarium"
  | "Student Travel/TA-DA"
  | "Club Budget"

export type NoteSheetStatus = "Draft" | "Pending Approval" | "Approved" | "Rejected"

export interface BudgetLineItem {
  id: string
  item: string
  quantity: number
  unitCost: number
  gstPercent: number
}

export interface RuleCitation {
  id: string
  code: string // e.g. "GFR Rule 153"
  title: string
  excerpt: string
  sourceDoc: string
}

export interface WordingSuggestion {
  id: string
  before: string
  after: string
  reason: string
  status: "pending" | "accepted" | "rejected"
}

export interface RequiredDocument {
  id: string
  name: string
  attached: boolean
}

export interface UploadedDocument {
  id: string
  filename: string
  contentType: string
  size: number
  createdAt: string | null
}

export type ApproverStatus = "Pending" | "Approved" | "Rejected"

export interface Approver {
  id: string
  name: string
  position: string
  department: string
  status: ApproverStatus
  signature?: string
  signedAt?: string
  rejectionReason?: string
  recommended?: boolean
  selected?: boolean
}

export interface ApprovalStage {
  id: string
  name: string
  order: number
  approvers: Approver[]
}

export interface NoteSheet {
  id: string
  subject: string
  category: NoteSheetCategory
  requester: string
  department: string
  amount: number
  status: NoteSheetStatus
  currentStage: string
  /** users.id of the submitting owner; null on legacy rows. */
  requesterId?: number | null
  createdAt: string
  updatedAt: string
  prompt: string
  draftText: string
  editedText?: string
  /** Which engine produced the draft: e.g. "ollama", "gemini", or "template". */
  draftSource?: string
  /** Populated when the LLM was unavailable and a template fallback was used. */
  draftError?: string | null
  justification: string
  aiReasoning: string
  budgetItems: BudgetLineItem[]
  citations: RuleCitation[]
  requiredDocuments: RequiredDocument[]
  uploadedDocuments: UploadedDocument[]
  wordingSuggestions: WordingSuggestion[]
  approvalStages: ApprovalStage[]
  precedentIds: string[]
}

export interface Precedent {
  id: string
  title: string
  category: NoteSheetCategory
  date: string
  amount: number
  snippet: string
  fullText: string
  citedCount: number
  department: string
}

export type KnowledgeDocType = "Precedent Note Sheet" | "GFR Rule" | "DFPR Rule" | "University Statute" | "Circular"

export interface KnowledgeDocument {
  id: string
  title: string
  type: KnowledgeDocType
  indexedAt: string
  sizeKb: number
  tags: string[]
  citedCount: number
}

export interface AnalyticsSnapshot {
  requestsByCategory: { category: string; count: number }[]
  turnaroundByCategory: { category: string; days: number }[]
  approvalOutcome: { name: string; value: number }[]
  mostCitedRules: { code: string; count: number }[]
  mostCitedPrecedents: { title: string; count: number }[]
  totalRequests: number
  avgTurnaroundDays: number
  approvalRate: number
}
