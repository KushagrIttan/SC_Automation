// Data-access layer for the knowledge base (admin-only on the backend).
import { apiFetch } from "@/lib/api/client"
import type { KnowledgeDocument } from "@/lib/types"

interface KnowledgeBaseResponse {
  totalDocuments: number
  totalVectors: number
  embeddingModel: string
  documents: KnowledgeDocument[]
}

export interface RetrievalStats {
  totalDocuments: number
  totalChunksIndexed: number
  lastReindexedAt: string | null
  mostCitedDocuments: { id: string; title: string; citedCount: number }[]
}

export async function fetchKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  const body = await apiFetch<KnowledgeBaseResponse>("/api/knowledge-base", {
    cache: "no-store",
  })
  return body.documents ?? []
}

export async function fetchRetrievalStats(): Promise<RetrievalStats> {
  return apiFetch<RetrievalStats>("/api/knowledge-base/stats", { cache: "no-store" })
}

export async function searchKnowledgeBase(
  query: string
): Promise<KnowledgeDocument[]> {
  const body = await apiFetch<KnowledgeBaseResponse>(
    `/api/knowledge-base?q=${encodeURIComponent(query)}`,
    { cache: "no-store" }
  )
  return body.documents ?? []
}

export interface KnowledgeUploadResult {
  id: string
  subject: string
  category: string
  chars: number
  pages: number
  method: "text_layer" | "ocr"
  amount: number | null
}

/** Uploads a PDF into a category's precedent corpus; indexed immediately. */
export async function uploadKnowledgeDocument(
  file: File,
  category: string
): Promise<KnowledgeUploadResult> {
  const form = new FormData()
  form.append("file", file)
  form.append("category", category)
  return apiFetch<KnowledgeUploadResult>("/api/knowledge-base/documents", {
    method: "POST",
    body: form,
  })
}
