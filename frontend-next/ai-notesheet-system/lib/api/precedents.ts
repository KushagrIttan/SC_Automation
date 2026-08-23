// Data-access layer for precedents — talks to the FastAPI backend.
import type { Precedent } from "@/lib/types"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8001"

export async function fetchPrecedents(): Promise<Precedent[]> {
  const res = await fetch(`${API_BASE}/api/precedents`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch precedents: ${res.status}`)
  return (await res.json()) as Precedent[]
}

export async function fetchPrecedent(id: string): Promise<Precedent | null> {
  const res = await fetch(`${API_BASE}/api/precedents/${id}`, {
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to fetch precedent: ${res.status}`)
  return (await res.json()) as Precedent
}

export async function fetchPrecedentsByIds(ids: string[]): Promise<Precedent[]> {
  const all = await fetchPrecedents()
  return all.filter((p) => ids.includes(p.id))
}
