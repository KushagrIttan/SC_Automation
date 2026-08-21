"use client"

import { Check, CircleDashed, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/format"
import type { ApprovalStage } from "@/lib/types"

export function ApprovalStepper({ stages }: { stages: ApprovalStage[] }) {
  return (
    <ol className="flex flex-col gap-0">
      {stages.map((stage, i) => {
        const allApproved = stage.approvers.every((a) => a.status === "Approved")
        const anyRejected = stage.approvers.some((a) => a.status === "Rejected")
        const status = anyRejected ? "rejected" : allApproved ? "approved" : "pending"

        return (
          <li key={stage.id} className="relative flex gap-3 pb-6 last:pb-0">
            {i < stages.length - 1 && (
              <span
                className={cn(
                  "absolute left-[11px] top-6 h-full w-px",
                  status === "approved" ? "bg-accent/50" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                status === "approved" && "border-accent bg-accent/20 text-accent",
                status === "rejected" && "border-destructive bg-destructive/20 text-destructive",
                status === "pending" && "border-border bg-muted text-muted-foreground",
              )}
            >
              {status === "approved" ? <Check className="size-3.5" /> : status === "rejected" ? <X className="size-3.5" /> : <CircleDashed className="size-3.5" />}
            </span>
            <div className="flex flex-1 flex-col gap-1.5 pt-0.5">
              <span className="text-sm font-medium text-foreground">{stage.name}</span>
              <div className="flex flex-col gap-1">
                {stage.approvers.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {a.name} <span className="text-muted-foreground/70">— {a.position}</span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[10px] uppercase tracking-wide",
                        a.status === "Approved" && "text-accent",
                        a.status === "Rejected" && "text-destructive",
                        a.status === "Pending" && "text-muted-foreground",
                      )}
                    >
                      {a.status === "Approved" && a.signedAt ? formatDateTime(a.signedAt) : a.status}
                    </span>
                  </div>
                ))}
              </div>
              {stage.approvers.some((a) => a.rejectionReason) && (
                <p className="rounded-sm border border-destructive/30 bg-destructive/[0.08] px-2.5 py-1.5 text-xs leading-relaxed text-destructive">
                  {stage.approvers.find((a) => a.rejectionReason)?.rejectionReason}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
