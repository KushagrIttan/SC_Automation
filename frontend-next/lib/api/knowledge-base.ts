import { knowledgeDocuments, retrievalStats } from "@/lib/mock/knowledge-base"
import type { KnowledgeDocument } from "@/lib/types"

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  await delay()
  return JSON.parse(JSON.stringify(knowledgeDocuments))
}

export async function fetchRetrievalStats() {
  await delay(250)
  return JSON.parse(JSON.stringify(retrievalStats))
}

export async function searchKnowledgeBase(query: string): Promise<KnowledgeDocument[]> {
  await delay(500)
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return knowledgeDocuments.filter(
    (d) => d.title.toLowerCase().includes(q) || d.tags.some((t) => t.toLowerCase().includes(q)) || d.type.toLowerCase().includes(q),
  )
}
