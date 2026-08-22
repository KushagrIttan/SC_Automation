import { fetchApi } from "@/lib/api-client"
import type { Precedent } from "@/lib/types"

export async function fetchPrecedents(): Promise<Precedent[]> {
  try {
    const data = await fetchApi<any[]>("/api/precedents")
    return data.map((item) => {
        let frontendCategory = "Lab Equipment Purchase";
        if (item.category === "event_expenditure") frontendCategory = "Event/Fest Expenditure";
        if (item.category === "student_travel") frontendCategory = "Student Travel/TA-DA";
        if (item.category === "club_budget") frontendCategory = "Club Budget";
        if (item.category === "guest_faculty_honorarium") frontendCategory = "Guest Faculty Honorarium";

        return {
            id: item.id,
            title: item.title,
            category: frontendCategory as any,
            date: new Date().toISOString(), // Mocked as backend doesn't return date currently
            amount: 0, // Mocked
            snippet: item.excerpt,
            fullText: item.full_text,
            citedCount: 0, // Mocked
            department: "Unknown" // Mocked
        }
    })
  } catch (error) {
    console.error("Failed to fetch precedents:", error)
    return []
  }
}
