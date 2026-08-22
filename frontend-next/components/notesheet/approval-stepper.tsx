"use client"

import { useState } from "react"
import { Check, ChevronRight, CircleDashed, PenLine, ShieldCheck, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/status-badge"
import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/format"
import type { Approver, ApprovalStage } from "@/lib/types"

type ApprovalStepperProps = {
  stages: ApprovalStage[]
  selectedApproverIds?: string[]
  onSelectedApproverIdsChange?: (ids: string[]) => void
}

export function ApprovalStepper({ stages, selectedApproverIds, onSelectedApproverIdsChange }: ApprovalStepperProps) {
  const [openApproverId, setOpenApproverId] = useState<string | null>(null)
  const isPickerEnabled = Boolean(onSelectedApproverIdsChange)
  const selectedIds = new Set(selectedApproverIds ?? stages.flatMap((stage) => stage.approvers.map((approver) => approver.id)))
  const visibleStages = isPickerEnabled
    ? stages.map((stage) => ({ ...stage, approvers: stage.approvers.filter((approver) => selectedIds.has(approver.id)) }))
    : stages

  function toggleApprover(approverId: string, checked: boolean) {
    const next = new Set(selectedIds)
    if (checked) next.add(approverId)
    else next.delete(approverId)
    onSelectedApproverIdsChange?.([...next])
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-x-auto pb-2">
        <ol className="flex min-w-max items-start gap-0">
          {visibleStages.map((stage, index) => {
            const stageStatus = getStageStatus(stage)
            const isFinalStage = index === visibleStages.length - 1

            return (
              <li key={stage.id} className="flex items-center">
                <section className="w-64 rounded-md border border-border bg-card/50 p-3">
                  <div className="mb-3 flex items-start gap-2">
                    <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border", stageStatusStyles[stageStatus])}>
                      {stageStatus === "approved" ? <Check className="size-3.5" /> : stageStatus === "rejected" ? <X className="size-3.5" /> : <CircleDashed className="size-3.5" />}
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-tight">{stage.name}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                        {isFinalStage ? "Final authority" : `Stage ${stage.order}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {stage.approvers.length > 0 ? (
                      stage.approvers.map((approver) => (
                        <ApproverNode
                          key={approver.id}
                          approver={approver}
                          open={openApproverId === approver.id}
                          onToggle={() => setOpenApproverId((current) => (current === approver.id ? null : approver.id))}
                        />
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No approver selected</p>
                    )}
                  </div>
                </section>
                {!isFinalStage && (
                  <div className={cn("flex w-10 items-center justify-center", stageStatus === "approved" ? "text-accent" : "text-muted-foreground")} aria-hidden="true">
                    <span className={cn("h-px w-5", stageStatus === "approved" ? "bg-accent" : "bg-border")} />
                    <ChevronRight className="size-4" />
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      {isPickerEnabled && (
        <div className="rounded-md border border-primary/25 bg-primary/[0.05] p-3">
          <div className="mb-3 flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Select approvers to route</p>
              <p className="text-xs leading-relaxed text-muted-foreground">Recommended approvers are preselected. You can route to more than one person in a stage; they will review in parallel.</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {stages.flatMap((stage) => stage.approvers.filter((approver) => approver.recommended).map((approver) => ({ stage, approver }))).map(({ stage, approver }) => (
              <label key={approver.id} className="flex cursor-pointer items-start gap-2 rounded-sm border border-border/70 bg-background/40 p-2.5 hover:border-primary/40">
                <Checkbox checked={selectedIds.has(approver.id)} onCheckedChange={(checked) => toggleApprover(approver.id, checked === true)} />
                <span className="min-w-0">
                  <span className="block text-xs font-medium">{approver.name}</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">{approver.position} · {stage.name}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ApproverNode({ approver, open, onToggle }: { approver: Approver; open: boolean; onToggle: () => void }) {
  return (
    <div className="min-w-[100px] basis-[calc(50%-0.25rem)] flex-1">
      <button type="button" onClick={onToggle} className="w-full rounded-sm border border-border bg-background/50 p-2 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={open}>
        <p className="truncate text-xs font-medium">{approver.name}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{approver.position}</p>
        <StatusBadge status={approver.status} className="mt-2" />
      </button>
      {open && (approver.status === "Approved" || approver.status === "Rejected") && (
        <div className={cn("mt-1 rounded-sm border p-2 text-[11px] leading-relaxed", approver.status === "Rejected" ? "border-destructive/30 bg-destructive/[0.08] text-destructive" : "border-accent/30 bg-accent/[0.08] text-foreground")}>
          {approver.status === "Approved" ? (
            <><span className="flex items-center gap-1 font-medium"><PenLine className="size-3" /> E-signed by {approver.signature ?? approver.name}</span><span className="mt-1 block text-muted-foreground">{approver.signedAt ? formatDateTime(approver.signedAt) : "Timestamp unavailable"}</span></>
          ) : (
            <><span className="font-medium">Returned with remarks</span><span className="mt-1 block">{approver.rejectionReason ?? "No reason was recorded."}</span></>
          )}
        </div>
      )}
    </div>
  )
}

function getStageStatus(stage: ApprovalStage): "approved" | "rejected" | "pending" {
  if (stage.approvers.some((approver) => approver.status === "Rejected")) return "rejected"
  if (stage.approvers.length > 0 && stage.approvers.every((approver) => approver.status === "Approved")) return "approved"
  return "pending"
}

const stageStatusStyles = {
  approved: "border-accent bg-accent/20 text-accent",
  rejected: "border-destructive bg-destructive/20 text-destructive",
  pending: "border-border bg-muted text-muted-foreground",
}
