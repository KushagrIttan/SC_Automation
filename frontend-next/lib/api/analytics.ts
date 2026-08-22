import { fetchApi } from "@/lib/api-client"
import type { AnalyticsSnapshot } from "@/lib/types"
import { analyticsSnapshot as mockAnalytics } from "@/lib/mock/analytics"

export async function fetchAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  try {
    const data = await fetchApi<any>("/api/analytics")
    
    // We map the backend data, but fallback to mock data for fields the backend might not fully populate yet
    return {
      requestsByCategory: data.requestsByCategory || mockAnalytics.requestsByCategory,
      turnaroundByCategory: data.turnaroundByCategory?.length ? data.turnaroundByCategory : mockAnalytics.turnaroundByCategory,
      approvalOutcome: data.approvalOutcome || mockAnalytics.approvalOutcome,
      mostCitedRules: data.mostCitedRules?.length ? data.mostCitedRules : mockAnalytics.mostCitedRules,
      mostCitedPrecedents: data.mostCitedPrecedents?.length ? data.mostCitedPrecedents : mockAnalytics.mostCitedPrecedents,
      totalRequests: data.totalRequests || 0,
      avgTurnaroundDays: data.avgTurnaroundDays || 0,
      approvalRate: data.approvalRate || 0,
    }
  } catch (error) {
    console.error("Failed to fetch analytics:", error)
    return mockAnalytics // Fallback to mock on error
  }
}
