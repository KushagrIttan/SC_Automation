"use client"

import { useState } from "react"
import { FileCheck2, Landmark, ScrollText, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "@/components/status-badge"
import { DraftText } from "@/components/notesheet/draft-text"
import { BudgetTable } from "@/components/notesheet/budget-table"
import { RequiredDocuments } from "@/components/notesheet/required-documents"
import { WordingSuggestions } from "@/components/notesheet/wording-suggestions"
import { AiReasoningPanel } from "@/components/notesheet/ai-reasoning-panel"
import { ApprovalStepper } from "@/components/notesheet/approval-stepper"
import { ComparePrecedentDialog } from "@/components/notesheet/compare-precedent-dialog"
import { formatDate, formatINR } from "@/lib/format"
import type { NoteSheet } from "@/lib/types"

export function NoteSheetDetail({
  noteSheet,
  showApprovalChain = true,
  headerAction,
  approvalPanel,
}: {
  noteSheet: NoteSheet
  showApprovalChain?: boolean
  headerAction?: React.ReactNode
  approvalPanel?: React.ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [editedText, setEditedText] = useState(noteSheet.editedText ?? noteSheet.draftText)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Main column */}
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={noteSheet.status} />
                <Badge variant="secondary" className="font-mono text-[10px] tracking-wide">
                  {noteSheet.category}
                </Badge>
                <span className="font-mono text-[11px] text-muted-foreground">{noteSheet.id}</span>
              </div>
              <CardTitle className="text-balance font-serif text-lg leading-snug">{noteSheet.subject}</CardTitle>
              <p className="font-mono text-[11px] text-muted-foreground">
                {noteSheet.requester} · {noteSheet.department} · {formatDate(noteSheet.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="font-mono text-xl font-semibold text-primary">{formatINR(noteSheet.amount)}</span>
              {headerAction}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <ScrollText className="size-3.5" />
                Drafted note sheet text
              </span>
              <div className="flex items-center gap-2">
                {noteSheet.precedentIds.length > 0 && <ComparePrecedentDialog noteSheet={noteSheet} />}
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditing((v) => !v)}>
                  {editing ? "Preview" : "Edit text"}
                </Button>
              </div>
            </div>
            {editing ? (
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="min-h-72 font-serif text-[15px] leading-relaxed"
              />
            ) : (
              <div className="rounded-sm border border-border bg-card/60 p-5">
                <DraftText text={editedText} citations={noteSheet.citations} />
              </div>
            )}
          </CardContent>
        </Card>

        <AiReasoningPanel reasoning={noteSheet.aiReasoning} precedentCount={noteSheet.precedentIds.length} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Landmark className="size-4 text-muted-foreground" />
              Budget breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <BudgetTable items={noteSheet.budgetItems} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Justification</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{noteSheet.justification}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar column */}
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <FileCheck2 className="size-4 text-muted-foreground" />
              Required documents
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <RequiredDocuments documents={noteSheet.requiredDocuments} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-muted-foreground" />
              Wording suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <WordingSuggestions suggestions={noteSheet.wordingSuggestions} />
          </CardContent>
        </Card>

        {approvalPanel}

        {showApprovalChain && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Approval chain</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ApprovalStepper stages={noteSheet.approvalStages} />
            </CardContent>
            <Separator className="my-1" />
            <CardContent className="pt-3 text-[11px] text-muted-foreground">
              Current stage: <span className="font-medium text-foreground">{noteSheet.currentStage}</span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
