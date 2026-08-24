"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { NoteSheetDetail } from "@/components/notesheet/notesheet-detail"
import { ApprovalActionPanel } from "@/components/notesheet/approval-action-panel"
import { useAuth } from "@/components/providers/auth-provider"
import { fetchNoteSheet } from "@/lib/api/notesheets"
import { fetchApprovalStatus } from "@/lib/api/approvals"
import type { NoteSheet } from "@/lib/types"

function withLiveApprovalStatus(noteSheet: NoteSheet, status: Awaited<ReturnType<typeof fetchApprovalStatus>>): NoteSheet {
  if (!status) return noteSheet
  return {
    ...noteSheet,
    status: status.status === "approved" ? "Approved" : status.status === "rejected" ? "Rejected" : status.status === "pending_approval" ? "Pending Approval" : "Draft",
    currentStage: status.stages.find((stage) => stage.approvers.some((approver) => approver.status === "pending"))?.name ?? (status.status === "approved" ? "Completed" : noteSheet.currentStage),
    approvalStages: status.stages.map((stage) => ({
      id: `stage-${stage.stage_order}`,
      name: stage.name,
      order: stage.stage_order,
      approvers: stage.approvers.map((approver) => ({
        id: `approver-${stage.stage_order}-${approver.user_id}`,
        name: approver.name ?? "Assigned approver",
        position: stage.name,
        department: "",
        status: approver.status === "approved" ? "Approved" : approver.status === "rejected" ? "Rejected" : "Pending",
        signature: approver.signature ?? undefined,
        signedAt: approver.approved_at ?? undefined,
        rejectionReason: approver.rejection_reason ?? undefined,
      })),
    })),
  }
}

export default function NoteSheetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { data: noteSheet, isLoading } = useSWR(["notesheet", id], () => fetchNoteSheet(id))
  const { data: approvalStatus } = useSWR(
    noteSheet && noteSheet.status !== "Draft" ? ["approval-status", id] : null,
    () => fetchApprovalStatus(id),
    { refreshInterval: 15_000 },
  )

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (!noteSheet) return <p className="text-sm text-muted-foreground">This note sheet is unavailable.</p>

  const liveNoteSheet = withLiveApprovalStatus(noteSheet, approvalStatus ?? null)
  const canDecide = user?.role === "prof" || user?.role === "dean" || user?.role === "admin"

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <Button render={<Link href="/notesheets" />} nativeButton={false} variant="ghost" size="sm" className="w-fit -ml-2">
        <ArrowLeft data-icon="inline-start" />
        Back to note sheets
      </Button>
      <NoteSheetDetail
        noteSheet={liveNoteSheet}
        approvalPanel={liveNoteSheet.status === "Pending Approval" && canDecide ? <ApprovalActionPanel noteSheet={liveNoteSheet} /> : undefined}
      />
    </div>
  )
}
