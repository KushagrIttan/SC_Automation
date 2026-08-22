import { fetchApi } from "@/lib/api-client"
import type { KnowledgeDocument } from "@/lib/types"
import { retrievalStats as mockRetrievalStats } from "@/lib/mock/knowledge-base"

export async function fetchKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  try {
    const data = await fetchApi<any>("/api/knowledge-base")
    return (data.documents || []).map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      indexedAt: doc.indexedAt,
      sizeKb: doc.sizeKb,
      tags: doc.tags,
      citedCount: doc.citedCount,
    }))
  } catch (error) {
    console.error("Failed to fetch knowledge base documents:", error)
    return []
  }
}

// Keeping retrieval stats mock for now as backend doesn't provide these specific metrics yet
export const retrievalStats = mockRetrievalStats
