"use client"

import { useState } from "react"
import useSWR from "swr"
import { GitCompareArrows } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatINR } from "@/lib/format"
import { fetchPrecedentsByIds } from "@/lib/api/precedents"
import type { NoteSheet } from "@/lib/types"

export function ComparePrecedentDialog({ noteSheet }: { noteSheet: NoteSheet }) {
  const [open, setOpen] = useState(false)
  const { data: precedents, isLoading } = useSWR(
    open ? ["precedents", noteSheet.precedentIds] : null,
    () => fetchPrecedentsByIds(noteSheet.precedentIds)
  )
  const [activeId, setActiveId] = useState<string | undefined>()

  if (noteSheet.precedentIds.length === 0) return null

  const active = precedents?.find((p) => p.id === activeId) ?? precedents?.[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <GitCompareArrows data-icon="inline-start" />
        Compare with precedent
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Draft vs. cited precedent</DialogTitle>
          <DialogDescription>
            Side-by-side comparison of the current draft against the precedent note sheet(s) it was matched
            against.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !precedents ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-80 w-full" />
          </div>
        ) : precedents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            The cited precedent note sheets could not be loaded from the corpus.
          </p>
        ) : (
          <>
            {precedents.length > 1 && (
              <Tabs value={active?.id} onValueChange={setActiveId}>
                <TabsList>
                  {precedents.map((p) => (
                    <TabsTrigger key={p.id} value={p.id}>
                      {p.id}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {active && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Current draft
                    </span>
                    <span className="font-mono text-xs font-medium text-primary">{formatINR(noteSheet.amount)}</span>
                  </div>
                  <ScrollArea className="h-80 rounded-sm border border-border bg-card/60 p-3.5">
                    <p className="text-pretty whitespace-pre-line font-serif text-sm leading-relaxed text-foreground/90">
                      {noteSheet.draftText}
                    </p>
                  </ScrollArea>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {active.title} · {formatDate(active.date)}
                    </span>
                    <span className="font-mono text-xs font-medium text-accent">{formatINR(active.amount)}</span>
                  </div>
                  <ScrollArea className="h-80 rounded-sm border border-accent/30 bg-accent/[0.04] p-3.5">
                    <p className="text-pretty whitespace-pre-line font-serif text-sm leading-relaxed text-foreground/90">
                      {active.fullText}
                    </p>
                  </ScrollArea>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
