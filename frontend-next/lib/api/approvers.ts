import { fetchApi } from "@/lib/api-client"
import type { Approver } from "@/lib/types"

export async function fetchApproverDirectory(): Promise<Approver[]> {
  try {
    const data = await fetchApi<any[]>("/api/profs")
    return data.map((prof) => ({
      id: `prof-${prof.id}`,
      name: prof.name,
      position: prof.position || "Professor",
      department: "University", // Backend model doesn't have department
      status: "Pending"
    }))
  } catch (error) {
    console.error("Failed to fetch approvers:", error)
    return []
  }
}
