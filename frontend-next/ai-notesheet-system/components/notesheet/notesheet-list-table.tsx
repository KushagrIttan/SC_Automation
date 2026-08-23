"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, FileX2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { StatusBadge } from "@/components/status-badge"
import { formatDate, formatINR } from "@/lib/format"
import type { NoteSheet } from "@/lib/types"
import { cn } from "@/lib/utils"

export function NoteSheetListTable({
  noteSheets,
  emptyLabel = "No note sheets found",
  variant = "default",
}: {
  noteSheets: NoteSheet[]
  emptyLabel?: string
  variant?: "default" | "government"
}) {
  const router = useRouter()
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
    <div className={cn("overflow-x-auto rounded-sm border border-border", variant === "government" && "border-x-0 border-t-4 border-b-0") }>
      <Table className={cn(variant === "government" && "text-[16px]")}>
        <TableHeader>
          <TableRow className={cn(variant === "government" && "bg-muted hover:bg-muted")}>
            <TableHead className={cn(variant === "government" && "h-12 px-3 font-bold text-foreground")}>Subject</TableHead>
            <TableHead className={cn(variant === "government" && "h-12 px-3 font-bold text-foreground")}>Category</TableHead>
            <TableHead className={cn(variant === "government" && "h-12 px-3 font-bold text-foreground")}>Amount</TableHead>
            <TableHead className={cn(variant === "government" && "h-12 px-3 font-bold text-foreground")}>Status</TableHead>
            <TableHead className={cn(variant === "government" && "h-12 px-3 font-bold text-foreground")}>Current stage</TableHead>
            <TableHead className={cn(variant === "government" && "h-12 px-3 font-bold text-foreground")}>Date</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {noteSheets.map((ns) => (
            <TableRow
              key={ns.id}
              className={cn("cursor-pointer transition-colors hover:bg-muted/40", variant === "government" && "hover:bg-secondary")}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/notesheets/${ns.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") router.push(`/notesheets/${ns.id}`)
              }}
            >
              <TableCell className={cn("max-w-80", variant === "government" && "px-3 py-4")}>
                <div className="flex flex-col gap-0.5">
                  <span className={cn("truncate text-sm font-medium text-foreground", variant === "government" && "text-[16px] font-bold text-primary underline underline-offset-2")}>{ns.subject}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {ns.id} · {ns.requester}
                  </span>
                </div>
              </TableCell>
              <TableCell className={cn("max-w-44 text-sm text-muted-foreground", variant === "government" && "px-3 py-4 text-[16px] text-foreground")}>{ns.category}</TableCell>
              <TableCell className={cn("font-mono text-sm font-medium text-foreground", variant === "government" && "px-3 py-4 font-sans text-[16px] font-bold")}>{formatINR(ns.amount)}</TableCell>
              <TableCell>
                <StatusBadge status={ns.status} className={cn(variant === "government" && "rounded-none px-1.5 font-sans font-bold tracking-normal")} />
              </TableCell>
              <TableCell className={cn("text-sm text-muted-foreground", variant === "government" && "px-3 py-4 text-[16px] text-foreground")}>{ns.currentStage}</TableCell>
              <TableCell className={cn("whitespace-nowrap text-sm text-muted-foreground", variant === "government" && "px-3 py-4 text-[16px] text-foreground")}>
                {formatDate(ns.updatedAt)}
              </TableCell>
              <TableCell>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  nativeButton={false}
                  render={<Link href={`/notesheets/${ns.id}`} aria-label={`Open ${ns.id}`} onClick={(event) => event.stopPropagation()} />}
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
