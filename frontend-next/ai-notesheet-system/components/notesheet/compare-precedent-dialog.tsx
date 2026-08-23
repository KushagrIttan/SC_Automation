"use client"

import { useState } from "react"
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
import { formatDate, formatINR } from "@/lib/format"
import { getPrecedent } from "@/lib/mock/precedents"
import type { NoteSheet } from "@/lib/types"

export function ComparePrecedentDialog({ noteSheet }: { noteSheet: NoteSheet }) {
  const precedents = noteSheet.precedentIds.map(getPrecedent).filter((p): p is NonNullable<typeof p> => Boolean(p))
  const [activeId, setActiveId] = useState(precedents[0]?.id)

  if (precedents.length === 0) return null

  const active = precedents.find((p) => p.id === activeId) ?? precedents[0]

  return (
    <Dialog>
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

        {precedents.length > 1 && (
          <Tabs value={active.id} onValueChange={setActiveId}>
            <TabsList>
              {precedents.map((p) => (
                <TabsTrigger key={p.id} value={p.id}>
                  {p.id}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

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
      </DialogContent>
    </Dialog>
  )
}
