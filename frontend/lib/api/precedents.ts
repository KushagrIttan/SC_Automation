// Data-access layer for precedents — talks to the FastAPI backend.
import type { NoteSheetCategory, Precedent } from "@/lib/types"
import { CATEGORY_LABELS } from "@/lib/api/notesheets"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8001"

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
  const match = text.match(/₹\s?([\d,]+(?:\.\d+)?)\s*(?:lakhs?|L\b)?/i)
  if (!match) return 0
  let value = Number(match[1].replace(/,/g, ""))
  if (!Number.isFinite(value)) return 0
  if (/lakhs?|L\b/i.test(match[0]) && value < 1000) value *= 100000
  return Math.round(value)
}

function extractDepartment(text: string): string {
  const fromLine = text.match(/^FROM:\s*(.+)$/m)
  if (fromLine) return fromLine[1].trim()
  return "—"
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
  const res = await fetch(`${API_BASE}/api/precedents`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch precedents: ${res.status}`)
  const rows = (await res.json()) as BackendPrecedent[]
  return rows.map(mapBackendPrecedent)
}

export async function fetchPrecedent(id: string): Promise<Precedent | null> {
  const res = await fetch(`${API_BASE}/api/precedents/${encodeURIComponent(id)}`, {
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to fetch precedent: ${res.status}`)
  const raw = (await res.json()) as BackendPrecedent
  return mapBackendPrecedent(raw)
}

export async function fetchPrecedentsByIds(ids: string[]): Promise<Precedent[]> {
  if (ids.length === 0) return []
  const all = await fetchPrecedents()
  const wanted = new Set(ids)
  return all.filter((p) => wanted.has(p.id))
}
