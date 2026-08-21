"use client"

import Link from "next/link"
import { ArrowRight, FileX2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { StatusBadge } from "@/components/status-badge"
import { formatDate, formatINR } from "@/lib/format"
import type { NoteSheet } from "@/lib/types"

export function NoteSheetListTable({
  noteSheets,
  emptyLabel = "No note sheets found",
}: {
  noteSheets: NoteSheet[]
  emptyLabel?: string
}) {
  if (noteSheets.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileX2 />
          </EmptyMedia>
          <EmptyTitle>{emptyLabel}</EmptyTitle>
          <EmptyDescription>Note sheets matching this view will appear here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {noteSheets.map((ns) => (
            <TableRow key={ns.id}>
              <TableCell className="max-w-80">
                <div className="flex flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-foreground">{ns.subject}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {ns.id} · {ns.requester}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{ns.department}</TableCell>
              <TableCell className="font-mono text-sm font-medium text-foreground">{formatINR(ns.amount)}</TableCell>
              <TableCell>
                <StatusBadge status={ns.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{ns.currentStage}</TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDate(ns.updatedAt)}
              </TableCell>
              <TableCell>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  nativeButton={false}
                  render={<Link href={`/notesheets/${ns.id}`} aria-label={`Open ${ns.id}`} />}
                >
                  <ArrowRight />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
