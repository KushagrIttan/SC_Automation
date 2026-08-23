// Data-access layer for the knowledge base — talks to the FastAPI backend.
import type { KnowledgeDocument } from "@/lib/types"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8001"

export async function fetchKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  const res = await fetch(`${API_BASE}/api/knowledge-base`, {
    cache: "no-store",
  })
  if (!res.ok)
    throw new Error(`Failed to fetch knowledge docs: ${res.status}`)
  return (await res.json()) as KnowledgeDocument[]
}

export async function fetchRetrievalStats() {
  const res = await fetch(`${API_BASE}/api/analytics`, { cache: "no-store" })
  if (!res.ok)
    throw new Error(`Failed to fetch retrieval stats: ${res.status}`)
  return (await res.json()) as Record<string, unknown>
}

export async function searchKnowledgeBase(
  query: string
): Promise<KnowledgeDocument[]> {
  const res = await fetch(
    `${API_BASE}/api/knowledge-base?q=${encodeURIComponent(query)}`,
    { cache: "no-store" }
  )
  if (!res.ok)
    throw new Error(`Knowledge base search failed: ${res.status}`)
  return (await res.json()) as KnowledgeDocument[]
}
