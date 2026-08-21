import useSWR from "swr"
import { fetchKnowledgeDocuments, fetchRetrievalStats, searchKnowledgeBase } from "@/lib/api/knowledge-base"

export function useKnowledgeDocuments() {
  const { data, error, isLoading } = useSWR("kb-documents", fetchKnowledgeDocuments)
  return { documents: data ?? [], error, isLoading }
}

export function useRetrievalStats() {
  const { data, error, isLoading } = useSWR("kb-retrieval-stats", fetchRetrievalStats)
  return { stats: data ?? null, error, isLoading }
}

export function useKnowledgeSearch(query: string) {
  const { data, error, isLoading } = useSWR(query ? ["kb-search", query] : null, () => searchKnowledgeBase(query))
  return { results: data ?? [], error, isLoading }
}
