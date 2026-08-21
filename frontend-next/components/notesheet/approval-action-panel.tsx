"use client"

import { useState } from "react"
import { CheckCircle2, PenLine, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import type { NoteSheet } from "@/lib/types"

export function ApprovalActionPanel({ noteSheet }: { noteSheet: NoteSheet }) {
  const [mode, setMode] = useState<"idle" | "reject">("idle")
  const [reason, setReason] = useState("")
  const [decided, setDecided] = useState<"approved" | "rejected" | null>(null)

  if (decided === "approved") {
    return (
      <Card className="border-accent/30 bg-accent/[0.06]">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="size-5 shrink-0 text-accent" />
          <p className="text-sm text-foreground">
            You signed off on this note sheet. It has moved to the next stage of the approval chain.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (decided === "rejected") {
    return (
      <Card className="border-destructive/30 bg-destructive/[0.06]">
        <CardContent className="flex items-center gap-3 py-4">
          <XCircle className="size-5 shrink-0 text-destructive" />
          <p className="text-sm text-foreground">
            You returned this note sheet to the requester with remarks. It will not proceed until resubmitted.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <PenLine className="size-4 text-muted-foreground" />
          Your decision
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Reviewing as <span className="font-medium text-foreground">{noteSheet.currentStage}</span>. Signing
          applies your institutional e-signature and timestamps the decision.
        </p>

        {mode === "reject" && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reject-reason">Remarks to requester</FieldLabel>
              <Textarea
                id="reject-reason"
                placeholder="Explain what needs correction before resubmission..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-24"
              />
            </Field>
          </FieldGroup>
        )}

        <div className="flex items-center gap-2">
          {mode === "idle" ? (
            <>
              <Button
                className="flex-1"
                onClick={() => {
                  setDecided("approved")
                  toast.success("Note sheet approved and forwarded", {
                    description: `Signed as ${noteSheet.currentStage}.`,
                  })
                }}
              >
                <CheckCircle2 data-icon="inline-start" />
                Approve &amp; sign
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setMode("reject")}>
                <XCircle data-icon="inline-start" />
                Return to requester
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={() => setMode("idle")}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={reason.trim().length === 0}
                onClick={() => {
                  setDecided("rejected")
                  toast.error("Note sheet returned to requester", {
                    description: reason,
                  })
                }}
              >
                <XCircle data-icon="inline-start" />
                Confirm return
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
