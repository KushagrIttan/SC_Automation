// Data-access layer for the approval workflow â€” talks to the FastAPI backend.
import { apiFetch } from "@/lib/api/client"

export interface ApprovalStatus {
  notesheet_id: string
  status: string
  stages: {
    stage_order: number
    name: string
    approvers: {
      user_id: number
      name: string | null
      signature: string | null
      status: "pending" | "approved" | "rejected"
      approved_at: string | null
      rejection_reason: string | null
    }[]
  }[]
}

export async function fetchApprovalInbox(): Promise<{ notesheet_id: string; stage: string }[]> {
  const response = await apiFetch<{ items: { notesheet_id: string; stage: string }[] }>("/api/approvals/inbox", {
    cache: "no-store",
  })
  return response.items
}

export async function fetchApprovalStatus(id: string): Promise<ApprovalStatus | null> {
  return apiFetch<ApprovalStatus | null>(`/api/notesheets/${encodeURIComponent(id)}/approval_status`, {
    cache: "no-store",
  }).catch((err) => {
    if ((err as { status?: number }).status === 404) return null
    throw err
  })
}

export async function submitNoteSheetForApproval(id: string): Promise<{ id: string; status: string }> {
  return apiFetch<{ id: string; status: string }>(`/api/notesheets/${encodeURIComponent(id)}/submit`, {
    method: "POST",
  })
}

export async function approveNoteSheet(
  id: string,
): Promise<{ id: string; status: string; stages_left: number; signature?: string | null }> {
  interface ApproveResp extends Record<string, unknown> {
    id: string
    status: string
    stages_left: number
    signature?: string | null
    signed_by?: string
  }
  const out = await apiFetch<ApproveResp>(`/api/notesheets/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    json: {},
  })
  return { id: out.id, status: out.status, stages_left: out.stages_left, signature: out.signature }
}

export async function rejectNoteSheet(
  id: string,
  reason: string
): Promise<{ id: string; status: string; reason: string }> {
  return apiFetch<{ id: string; status: string; reason: string }>(`/api/notesheets/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    json: { reason },
  })
}
