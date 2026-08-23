import useSWR from "swr"
import { fetchApproverDirectory } from "@/lib/api/approvers"

export function useApproverDirectory() {
  const { data, error, isLoading } = useSWR("approver-directory", fetchApproverDirectory)
  return { approvers: data ?? [], error, isLoading }
}
