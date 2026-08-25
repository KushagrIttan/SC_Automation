"use client"

import { useState } from "react"
import { Check, Loader2, X } from "lucide-react"
import { useSWRConfig } from "swr"
import { Button } from "@/components/ui/button"
import { rejectNoteSheet, approveNoteSheet } from "@/lib/api/approvals"
import { toast } from "sonner"

export function ApprovalQueueActions({ noteSheetId }: { noteSheetId: string }) {
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null)

  async function decide(decision: "approve" | "reject") {
    setBusy(decision)
    try {
      if (decision === "approve") {
        await approveNoteSheet(noteSheetId)
        toast.success("Approved and e-signed. The request moved to its next stage.")
      } else {
        await rejectNoteSheet(noteSheetId, "Returned for revision by the approver.")
        toast.success("Request returned to the student for revision.")
      }
      await Promise.all([mutate("notesheets"), mutate("approval-inbox")])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record the decision.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
      <Button size="sm" variant="outline" onClick={() => decide("reject")} disabled={busy !== null}>
        {busy === "reject" ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <X />}
        Reject
      </Button>
      <Button size="sm" onClick={() => decide("approve")} disabled={busy !== null}>
        {busy === "approve" ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Check />}
        Accept
      </Button>
    </div>
  )
}
