// Data-access layer for note sheets — talks to the FastAPI backend.
import type { NoteSheet } from "@/lib/types"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8001"

// Map frontend display categories → backend slugs
const CATEGORY_SLUGS: Record<string, string> = {
  "Lab Equipment Purchase": "lab_equipment_purchase",
  "Event/Fest Expenditure": "event_expenditure",
  "Guest Faculty Honorarium": "guest_faculty_honorarium",
  "Student Travel/TA-DA": "student_travel",
  "Club Budget": "club_budget",
}

export async function fetchNoteSheets(): Promise<NoteSheet[]> {
  const res = await fetch(`${API_BASE}/api/notesheets`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch note sheets: ${res.status}`)
  return (await res.json()) as NoteSheet[]
}

export async function fetchNoteSheet(id: string): Promise<NoteSheet | null> {
  const res = await fetch(`${API_BASE}/api/notesheets/${id}`, {
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to fetch note sheet: ${res.status}`)
  return (await res.json()) as NoteSheet
}

export interface GenerateDraftInput {
  prompt: string
  category: NoteSheet["category"]
  attachedFileNames: string[]
}

/** Calls the FastAPI `/api/notesheets/generate` endpoint (RAG + LLM). */
export async function generateDraft(
  input: GenerateDraftInput
): Promise<NoteSheet> {
  const slug = CATEGORY_SLUGS[input.category] ?? input.category
  const res = await fetch(`${API_BASE}/api/notesheets/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      request_text: input.prompt,
      category: slug,
    }),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`Draft generation failed: ${msg}`)
  }
  return (await res.json()) as NoteSheet
}
