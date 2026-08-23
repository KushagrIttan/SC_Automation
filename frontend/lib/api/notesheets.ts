// Data-access layer for note sheets — talks to the FastAPI backend.
import type {
  NoteSheet,
  NoteSheetCategory,
  NoteSheetStatus,
  RuleCitation,
} from "@/lib/types"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8001"

// Map frontend display categories → backend slugs
export const CATEGORY_SLUGS: Record<NoteSheetCategory, string> = {
  "Lab Equipment Purchase": "lab_equipment_purchase",
  "Event/Fest Expenditure": "event_expenditure",
  "Guest Faculty Honorarium": "guest_faculty_honorarium",
  "Student Travel/TA-DA": "student_travel",
  "Club Budget": "club_budget",
}

export const CATEGORY_LABELS: Record<string, NoteSheetCategory> = Object.fromEntries(
  Object.entries(CATEGORY_SLUGS).map(([label, slug]) => [slug, label])
) as Record<string, NoteSheetCategory>

const STATUS_LABELS: Record<string, NoteSheetStatus> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
}

/** Raw shape returned by the FastAPI notesheet endpoints. */
export interface BackendNoteSheet {
  id: string
  category: string
  request_text: string
  draft_text: string
  draft_source: string
  status: string
  amount: number | null
  requester_name?: string | null
  department?: string | null
  precedents_used: { id: string; category?: string; excerpt?: string }[]
  rules_cited: string[]
  approval_chain: string[]
  documents_missing: string[]
  error?: string | null
  created_at: string | null
  updated_at: string | null
}

function deriveSubject(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ")
  return clean.length > 90 ? `${clean.slice(0, 87)}...` : clean
}

function toCitations(rules: string[]): RuleCitation[] {
  return rules.map((code, i) => ({
    id: `rule-${i}-${code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    code,
    title: code,
    excerpt:
      "Cited in this draft because it applies to the request category and amount.",
    sourceDoc: "General Financial Rules 2017 / institutional ordinances",
  }))
}

/** Map a raw backend payload onto the rich frontend NoteSheet type. */
export function mapBackendNoteSheet(raw: BackendNoteSheet): NoteSheet {
  const status = STATUS_LABELS[raw.status] ?? "Draft"
  const chain = raw.approval_chain ?? []
  const currentStage =
    status === "Approved"
      ? "Completed"
      : status === "Rejected"
        ? "Returned by approver"
        : status === "Pending Approval" && chain.length > 0
          ? chain[0]
          : "Not yet submitted"

  const sourceLabel =
    raw.draft_source === "template"
      ? "template fallback (LLM unavailable)"
      : `${raw.draft_source}`

  return {
    id: raw.id,
    subject: deriveSubject(raw.request_text),
    category: CATEGORY_LABELS[raw.category] ?? (raw.category as NoteSheetCategory),
    requester: raw.requester_name?.trim() || "—",
    department: raw.department?.trim() || "—",
    amount: raw.amount ?? 0,
    status,
    currentStage,
    createdAt: raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updated_at ?? raw.created_at ?? new Date().toISOString(),
    prompt: raw.request_text,
    draftText: raw.draft_text,
    draftSource: raw.draft_source,
    draftError: raw.error ?? null,
    justification: raw.request_text.trim(),
    aiReasoning: `Retrieved ${raw.precedents_used.length} similar precedent note sheet(s) from the FAISS index, then drafted with ${sourceLabel}. Rules applied: ${raw.rules_cited.length > 0 ? raw.rules_cited.join(", ") : "none matched automatically"}. Approval chain suggested from amount thresholds: ${chain.length > 0 ? chain.join(" → ") : "none determined"}.`,
    budgetItems: [],
    citations: toCitations(raw.rules_cited ?? []),
    requiredDocuments: (raw.documents_missing ?? []).map((name, i) => ({
      id: `doc-${i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      attached: false,
    })),
    wordingSuggestions: [],
    approvalStages: chain.map((name, i) => ({
      id: `stage-${i + 1}`,
      name,
      order: i + 1,
      approvers: [],
    })),
    precedentIds: (raw.precedents_used ?? []).map((p) => p.id),
  }
}

export async function fetchNoteSheets(): Promise<NoteSheet[]> {
  const res = await fetch(`${API_BASE}/api/notesheets`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch note sheets: ${res.status}`)
  const rows = (await res.json()) as BackendNoteSheet[]
  return rows.map(mapBackendNoteSheet)
}

export async function fetchNoteSheet(id: string): Promise<NoteSheet | null> {
  const res = await fetch(`${API_BASE}/api/notesheets/${encodeURIComponent(id)}`, {
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to fetch note sheet: ${res.status}`)
  const raw = (await res.json()) as BackendNoteSheet
  return mapBackendNoteSheet(raw)
}

export interface GenerateDraftInput {
  prompt: string
  category: NoteSheet["category"]
  requesterName?: string
  department?: string
  amountHint?: number
  /** Text extracted from uploaded reference PDFs (RAG context). */
  extraContext?: string
  documents?: string[]
}

function buildGenerateBody(input: GenerateDraftInput): string {
  return JSON.stringify({
    request_text: input.prompt,
    category: CATEGORY_SLUGS[input.category] ?? input.category,
    requester_name: input.requesterName || undefined,
    department: input.department || undefined,
    amount: input.amountHint && input.amountHint > 0 ? input.amountHint : undefined,
    extra_context: input.extraContext?.trim() ? input.extraContext : undefined,
    documents: input.documents?.length ? input.documents : undefined,
  })
}

/** Calls the FastAPI `/api/notesheets/generate` endpoint (RAG + LLM). */
export async function generateDraft(
  input: GenerateDraftInput
): Promise<NoteSheet> {
  const res = await fetch(`${API_BASE}/api/notesheets/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: buildGenerateBody(input),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`Draft generation failed: ${msg}`)
  }
  const raw = (await res.json()) as BackendNoteSheet
  return mapBackendNoteSheet(raw)
}

/** Real pipeline stage events emitted by the streaming backend endpoint. */
export type PipelineStage = "retrieve" | "rules" | "draft" | "review"

export interface StageEvent {
  stage: PipelineStage | "complete" | "error"
  status?: "started" | "done" | "fallback"
  precedents?: number
  count?: number
  provider?: string
  missing?: number
  chain?: number
  detail?: string
  result?: BackendNoteSheet
}

/**
 * Streams `/api/notesheets/generate/stream` (NDJSON). Every event reflects a
 * real backend transition — retrieval done, LLM started/finished, review done.
 * Falls back to the non-streaming endpoint if the stream cannot even start.
 */
export async function generateDraftStream(
  input: GenerateDraftInput,
  onEvent: (event: StageEvent) => void,
  signal?: AbortSignal
): Promise<NoteSheet> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/notesheets/generate/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: buildGenerateBody(input),
      signal,
    })
  } catch (err) {
    // Network-level failure before any stream: use plain endpoint so the
    // error surfaces identically either way.
    return generateDraft(input)
  }
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`Draft generation failed: ${msg}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let final: NoteSheet | null = null

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let newlineIndex: number
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim()
      buffer = buffer.slice(newlineIndex + 1)
      if (!line) continue
      let event: StageEvent
      try {
        event = JSON.parse(line) as StageEvent
      } catch {
        continue
      }
      if (event.stage === "complete" && event.result) {
        final = mapBackendNoteSheet(event.result)
      } else if (event.stage === "error") {
        throw new Error(event.detail || "Generation failed")
      } else {
        onEvent(event)
      }
    }
  }

  if (!final) throw new Error("Generation stream ended without a result")
  return final
}
