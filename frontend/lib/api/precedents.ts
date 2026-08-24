// Data-access layer for precedents â€” talks to the FastAPI backend.
import type { NoteSheetCategory, Precedent } from "@/lib/types"
import { CATEGORY_LABELS } from "@/lib/api/notesheets"

import { apiFetch } from "@/lib/api/client"

/** Raw shape returned by the FastAPI precedent endpoints. */
export interface BackendPrecedent {
  id: string
  category: string
  title: string
  excerpt: string
  full_text: string
  cited_count?: number
}

function extractAmount(text: string): number {
  const match = text.match(/â‚¹\s?([\d,]+(?:\.\d+)?)\s*(?:lakhs?|L\b)?/i)
  if (!match) return 0
  let value = Number(match[1].replace(/,/g, ""))
  if (!Number.isFinite(value)) return 0
  if (/lakhs?|L\b/i.test(match[0]) && value < 1000) value *= 100000
  return Math.round(value)
}

function extractDepartment(text: string): string {
  const fromLine = text.match(/^FROM:\s*(.+)$/m)
  if (fromLine) return fromLine[1].trim()
  return "â€”"
}

function extractDate(text: string): string {
  const match = text.match(/(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ""
}

export function mapBackendPrecedent(raw: BackendPrecedent): Precedent {
  const fullText = raw.full_text || raw.excerpt || ""
  return {
    id: raw.id,
    title: raw.title && raw.title !== raw.id ? raw.title : deriveTitle(fullText),
    category:
      CATEGORY_LABELS[raw.category] ?? (raw.category as NoteSheetCategory),
    date: extractDate(fullText),
    amount: extractAmount(fullText),
    snippet: raw.excerpt ?? "",
    fullText,
    citedCount: raw.cited_count ?? 0,
    department: extractDepartment(fullText),
  }
}

function deriveTitle(content: string): string {
  const subject = content.match(/^SUBJECT:\s*(.+)$/m)
  if (subject) return subject[1].trim()
  const firstLine = content.split("\n").find((l) => l.trim().length > 0)
  return firstLine?.trim().slice(0, 80) ?? "Untitled precedent"
}

export async function fetchPrecedents(): Promise<Precedent[]> {
  const rows = await apiFetch<BackendPrecedent[]>("/api/precedents", { cache: "no-store" })
  return rows.map(mapBackendPrecedent)
}

export async function fetchPrecedent(id: string): Promise<Precedent | null> {
  const raw = await apiFetch<BackendPrecedent | null>(
    `/api/precedents/${encodeURIComponent(id)}`,
    { cache: "no-store" }
  ).catch((err) => {
    if ((err as { status?: number }).status === 404) return null
    throw err
  })
  return raw ? mapBackendPrecedent(raw) : null
}

export async function fetchPrecedentsByIds(ids: string[]): Promise<Precedent[]> {
  if (ids.length === 0) return []
  const all = await fetchPrecedents()
  const wanted = new Set(ids)
  return all.filter((p) => wanted.has(p.id))
}
