import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NoteSheetDetail } from "@/components/notesheet/notesheet-detail"
import { ApprovalActionPanel } from "@/components/notesheet/approval-action-panel"
import { getNoteSheet } from "@/lib/mock/notesheets"

export default async function NoteSheetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const noteSheet = getNoteSheet(id)

  if (!noteSheet) notFound()

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <Button render={<Link href="/notesheets" />} nativeButton={false} variant="ghost" size="sm" className="w-fit -ml-2">
        <ArrowLeft data-icon="inline-start" />
        Back to note sheets
      </Button>
      <NoteSheetDetail
        noteSheet={noteSheet}
        approvalPanel={noteSheet.status === "Pending Approval" ? <ApprovalActionPanel noteSheet={noteSheet} /> : undefined}
      />
    </div>
  )
}
