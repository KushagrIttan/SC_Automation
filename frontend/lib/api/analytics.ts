// Data-access layer for analytics — talks to the FastAPI backend.
import type { AnalyticsSnapshot } from "@/lib/types"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8001"

export async function fetchAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  const res = await fetch(`${API_BASE}/api/analytics`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch analytics: ${res.status}`)
  return (await res.json()) as AnalyticsSnapshot
}
