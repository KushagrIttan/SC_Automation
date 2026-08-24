// Analytics — dean/admin only on the backend.
import { apiFetch } from "@/lib/api/client"
import type { AnalyticsSnapshot } from "@/lib/types"

export async function fetchAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  return apiFetch<AnalyticsSnapshot>("/api/analytics", { cache: "no-store" })
}
