import { noteSheets } from "@/lib/mock/notesheets"
import { getApprover } from "@/lib/mock/approvers"
import { precedentLibrary } from "@/lib/mock/precedents"
import type { NoteSheet, NoteSheetCategory } from "@/lib/types"

export interface GenerateDraftInput {
  prompt: string
  category: NoteSheetCategory
  department: string
  amountHint?: number
}

// Simulates what a RAG + LLM drafting pipeline would return: it picks the
// closest template for the chosen category from the note-sheet corpus and
// re-labels it against the requester's actual input so the demo reflects
// what was typed, without needing a live model call.
export function generateDraft(input: GenerateDraftInput): NoteSheet {
  const template =
    noteSheets.find((n) => n.category === input.category && n.status !== "Draft") ??
    noteSheets[0]

  const matchedPrecedents = precedentLibrary.filter((p) => p.category === input.category).slice(0, 2)
  const amount = input.amountHint && input.amountHint > 0 ? input.amountHint : template.amount
  const approvalStages = ensureFinalAuthority(template.approvalStages)

  return {
    ...template,
    id: `draft-${Date.now()}`,
    subject: deriveSubject(input.prompt, input.category),
    department: input.department || template.department,
    amount,
    status: "Draft",
    currentStage: "Not yet submitted",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    prompt: input.prompt,
    justification: template.justification,
    precedentIds: matchedPrecedents.length ? matchedPrecedents.map((p) => p.id) : template.precedentIds,
    approvalStages: approvalStages.map((stage) => ({
      ...stage,
      approvers: stage.approvers.map((a) => ({ ...a, status: "Pending" as const, signature: undefined, signedAt: undefined, rejectionReason: undefined })),
    })),
  }
}

function ensureFinalAuthority(stages: NoteSheet["approvalStages"]): NoteSheet["approvalStages"] {
  if (stages.some((stage) => /dean|director/i.test(stage.name))) return stages

  return [
    ...stages,
    {
      id: "st-final-authority",
      name: "Dean / Director Approval",
      order: stages.length + 1,
      approvers: [{ ...getApprover("apr-08"), recommended: true }],
    },
  ]
}

function deriveSubject(prompt: string, category: NoteSheetCategory): string {
  const trimmed = prompt.trim()
  if (!trimmed) return `Sanction request — ${category}`
  const capped = trimmed.length > 90 ? `${trimmed.slice(0, 87)}...` : trimmed
  return `Sanction for ${capped.replace(/^sanction (for|of)?\s*/i, "")}`
}
