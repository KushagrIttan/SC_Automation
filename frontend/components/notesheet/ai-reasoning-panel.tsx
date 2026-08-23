"use client"

import { useState } from "react"
import { BrainCircuit, ChevronDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

export function AiReasoningPanel({ reasoning, precedentCount }: { reasoning: string; precedentCount: number }) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-sm border border-accent/30 bg-accent/[0.06]">
      <CollapsibleTrigger className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left">
        <BrainCircuit className="size-4 shrink-0 text-accent" />
        <span className="flex-1 text-sm font-medium text-foreground">Why the model drafted it this way</span>
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {precedentCount} precedent{precedentCount === 1 ? "" : "s"} matched
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3.5 pb-3.5">
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{reasoning}</p>
      </CollapsibleContent>
    </Collapsible>
  )
}
