// Approver directory = active prof/dean users.
import { apiFetch } from "@/lib/api/client"
import type { Approver } from "@/lib/types"

export async function fetchApproverDirectory(): Promise<Approver[]> {
  return apiFetch<Approver[]>("/api/profs", { cache: "no-store" })
}
