import useSWR from "swr"
import { fetchNoteSheets, fetchNoteSheet } from "@/lib/api/notesheets"

export function useNoteSheets() {
  const { data, error, isLoading } = useSWR("notesheets", fetchNoteSheets)
  return { noteSheets: data ?? [], error, isLoading }
}

export function useNoteSheet(id: string | undefined) {
  const { data, error, isLoading } = useSWR(id ? ["notesheet", id] : null, () => fetchNoteSheet(id as string))
  return { noteSheet: data ?? null, error, isLoading }
}
