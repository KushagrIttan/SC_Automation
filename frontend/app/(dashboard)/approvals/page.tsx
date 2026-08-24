"use client"

import { useMemo } from "react"
import useSWR from "swr"
import { ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { NoteSheetListTable } from "@/components/notesheet/notesheet-list-table"
import { ApprovalQueueActions } from "@/components/notesheet/approval-queue-actions"
import { useNoteSheets } from "@/hooks/use-notesheets"
import { fetchApprovalInbox } from "@/lib/api/approvals"

export default function ApprovalsPage() {
  const { noteSheets, isLoading } = useNoteSheets()
  const { data: inbox, isLoading: inboxLoading } = useSWR("approval-inbox", fetchApprovalInbox)

  const pending = useMemo(() => {
    const ids = new Set((inbox ?? []).map((item) => item.notesheet_id))
    return noteSheets.filter((ns) => ids.has(ns.id))
  }, [inbox, noteSheets])
  const resolved = useMemo(
    () => noteSheets.filter((ns) => ns.status === "Approved" || ns.status === "Rejected"),
    [noteSheets],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Awaiting your sign-off
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-primary">
            {isLoading || inboxLoading ? <Skeleton className="h-8 w-12" /> : pending.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Decided this quarter
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-foreground">
            {isLoading ? <Skeleton className="h-8 w-12" /> : resolved.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Avg. time in your queue
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-foreground">
            {isLoading ? <Skeleton className="h-8 w-16" /> : "1.8 days"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-muted-foreground" />
            Pending your approval
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading || inboxLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <NoteSheetListTable
              noteSheets={pending}
              emptyLabel="No note sheets are awaiting your sign-off"
              actions={(noteSheet) => <ApprovalQueueActions noteSheetId={noteSheet.id} />}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Recently decided</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <NoteSheetListTable noteSheets={resolved} emptyLabel="No decisions recorded yet" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
