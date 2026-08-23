"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, PenLine, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useApproverDirectory } from "@/hooks/use-approvers"
import { approveNoteSheet, rejectNoteSheet } from "@/lib/api/approvals"
import type { NoteSheet } from "@/lib/types"

export function ApprovalActionPanel({ noteSheet }: { noteSheet: NoteSheet }) {
  const router = useRouter()
  const { approvers } = useApproverDirectory()
  const [mode, setMode] = useState<"idle" | "reject">("idle")
  const [reason, setReason] = useState("")
  const [profId, setProfId] = useState<string>("")
  const [busy, setBusy] = useState(false)
  const [decided, setDecided] = useState<"approved" | "rejected" | null>(null)

  async function act(kind: "approve" | "reject") {
    if (kind === "reject" && !reason.trim()) {
      toast.error("Add a remark so the requester knows what to fix.")
      return
    }
    setBusy(true)
    try {
      if (kind === "approve") {
        await approveNoteSheet(noteSheet.id, profId ? Number(profId) : undefined)
        setDecided("approved")
        toast.success("Signed off. The note sheet moved along its approval chain.")
      } else {
        await rejectNoteSheet(noteSheet.id, reason.trim())
        setDecided("rejected")
        toast.success("Returned to the requester with your remarks.")
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed.")
    } finally {
      setBusy(false)
    }
  }

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
      <CardContent className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="approver-select">Signing as</FieldLabel>
          <Select value={profId} onValueChange={setProfId}>
            <SelectTrigger id="approver-select" className="w-full">
              <SelectValue placeholder="Select your name" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {approvers.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name} — {a.position}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        {mode === "reject" && (
          <Field>
            <FieldLabel htmlFor="rejection-reason">Remarks to requester</FieldLabel>
            <Textarea
              id="rejection-reason"
              placeholder="e.g. Attach the missing comparative statement and resubmit."
              className="min-h-20 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {mode === "idle" && (
            <Button variant="outline" size="sm" onClick={() => setMode("reject")} disabled={busy}>
              <XCircle data-icon="inline-start" />
              Reject
            </Button>
          )}
          {mode === "reject" && (
            <Button variant="ghost" size="sm" onClick={() => setMode("idle")} disabled={busy}>
              Back
            </Button>
          )}
          <Button
            size="sm"
            variant={mode === "reject" ? "destructive" : "default"}
            onClick={() => act(mode === "reject" ? "reject" : "approve")}
            disabled={busy}
          >
            {busy && <Loader2 className="animate-spin" data-icon="inline-start" />}
            {mode === "reject" ? "Confirm rejection" : "Approve"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
