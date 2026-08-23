import useSWR from "swr"
import { fetchAnalyticsSnapshot } from "@/lib/api/analytics"

export function useAnalytics() {
  const { data, error, isLoading } = useSWR("analytics-snapshot", fetchAnalyticsSnapshot)
  return { analytics: data ?? null, error, isLoading }
}
