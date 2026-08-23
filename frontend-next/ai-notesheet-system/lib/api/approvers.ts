// Data-access layer for approvers — talks to the FastAPI backend.
import type { Approver } from "@/lib/types"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8001"

export async function fetchApproverDirectory(): Promise<Approver[]> {
  const res = await fetch(`${API_BASE}/api/profs`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch approvers: ${res.status}`)
  return (await res.json()) as Approver[]
}
