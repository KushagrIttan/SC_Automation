import { analyticsSnapshot } from "@/lib/mock/analytics"
import type { AnalyticsSnapshot } from "@/lib/types"

function delay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  await delay()
  return JSON.parse(JSON.stringify(analyticsSnapshot))
}
