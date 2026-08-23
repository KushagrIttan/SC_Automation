// Data-access layer for the approval workflow — talks to the FastAPI backend.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8001"

export interface ApprovalStatus {
  notesheet_id: string
  status: string
  stages: {
    stage_order: number
    name: string
    approvers: {
      prof_id: number
      prof_name: string | null
      status: "pending" | "approved" | "rejected"
      approved_at: string | null
      rejection_reason: string | null
    }[]
  }[]
}

export async function fetchApprovalStatus(id: string): Promise<ApprovalStatus | null> {
  const res = await fetch(
    `${API_BASE}/api/notesheets/${encodeURIComponent(id)}/approval_status`,
    { cache: "no-store" }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to fetch approval status: ${res.status}`)
  return (await res.json()) as ApprovalStatus
}

export async function submitNoteSheetForApproval(id: string): Promise<{ id: string; status: string }> {
  const res = await fetch(
    `${API_BASE}/api/notesheets/${encodeURIComponent(id)}/submit`,
    { method: "POST" }
  )
  if (!res.ok) throw new Error(await res.text().catch(() => `Submit failed: ${res.status}`))
  return (await res.json()) as { id: string; status: string }
}

export async function approveNoteSheet(
  id: string,
  profId?: number
): Promise<{ id: string; status: string; stages_left: number }> {
  const res = await fetch(
    `${API_BASE}/api/notesheets/${encodeURIComponent(id)}/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prof_id: profId }),
    }
  )
  if (!res.ok) throw new Error(await res.text().catch(() => `Approve failed: ${res.status}`))
  return (await res.json()) as { id: string; status: string; stages_left: number }
}

export async function rejectNoteSheet(
  id: string,
  reason: string
): Promise<{ id: string; status: string; reason: string }> {
  const res = await fetch(
    `${API_BASE}/api/notesheets/${encodeURIComponent(id)}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }
  )
  if (!res.ok) throw new Error(await res.text().catch(() => `Reject failed: ${res.status}`))
  return (await res.json()) as { id: string; status: string; reason: string }
}
