import useSWR from "swr"
import { fetchPrecedents, fetchPrecedentsByIds } from "@/lib/api/precedents"

export function usePrecedents() {
  const { data, error, isLoading } = useSWR("precedents", fetchPrecedents)
  return { precedents: data ?? [], error, isLoading }
}

export function usePrecedentsByIds(ids: string[]) {
  const key = ids.length ? ["precedents-by-ids", ...ids].join(",") : null
  const { data, error, isLoading } = useSWR(key, () => fetchPrecedentsByIds(ids))
  return { precedents: data ?? [], error, isLoading }
}
