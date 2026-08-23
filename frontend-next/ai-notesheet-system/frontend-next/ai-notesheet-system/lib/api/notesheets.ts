// Data-access layer for note sheets — talks to the FastAPI backend.
// Every function here hits the real backend (/api/...). The local mock data
// (lib/mock/*) is kept only as a fallback for offline demos.

import type { NoteSheet } from "@/lib/types"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8001"

export async function fetchNoteSheets(): Promise<NoteSheet[]> {
  const res = await fetch(`${API_BASE}/api/notesheets`, {
    cache: "no-store",
  })
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
  const res = await fetch(`${API_BASE}/api/notesheets/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: input.category,
      user_request: input.prompt,
      attached_files: input.attachedFileNames,
    }),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`Draft generation failed: ${msg}`)
  }
  return (await res.json()) as NoteSheet
}
