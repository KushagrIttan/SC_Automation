// Data-access layer for note sheets.
// Every function here simulates network latency and returns a deep clone of
// mock data. Swap the function bodies for real `fetch("/api/...")` calls to
// the FastAPI backend later — callers (hooks/components) do not need to change.
import { noteSheets, getNoteSheet } from "@/lib/mock/notesheets"
import type { NoteSheet } from "@/lib/types"

const LATENCY = 400

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function delay(ms = LATENCY) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchNoteSheets(): Promise<NoteSheet[]> {
  await delay()
  return clone(noteSheets)
}

export async function fetchNoteSheet(id: string): Promise<NoteSheet | null> {
  await delay(250)
  const found = getNoteSheet(id)
  return found ? clone(found) : null
}

export interface GenerateDraftInput {
  prompt: string
  category: NoteSheet["category"]
  attachedFileNames: string[]
}

/**
 * Simulates the AI drafting call. In production this hits the FastAPI
 * `/generate-draft` endpoint, which runs retrieval + generation server-side.
 * For the prototype, we return the closest matching seeded note sheet so the
 * full draft/result UI can be demoed end-to-end.
 */
export async function generateDraft(input: GenerateDraftInput): Promise<NoteSheet> {
  await delay(1600)
  const byCategory = noteSheets.find((n) => n.category === input.category)
  const base = byCategory ?? noteSheets[0]
  return clone({
    ...base,
    id: `ns-draft-${Date.now()}`,
    prompt: input.prompt,
    status: "Draft" as const,
    currentStage: "Not yet submitted",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}
