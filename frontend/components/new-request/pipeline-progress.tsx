"use client"

import { useEffect, useState } from "react"
import { Check, FileSearch, Landmark, Loader2, ScrollText, ShieldAlert } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { StageEvent } from "@/lib/api/notesheets"

const STAGES = [
  {
    key: "retrieve",
    icon: FileSearch,
    label: "Retrieving similar precedents",
    detail: (e: Partial<StageEvent>) =>
      typeof e.precedents === "number" ? `${e.precedents} matched in the corpus` : undefined,
  },
  {
    key: "rules",
    icon: Landmark,
    label: "Loading applicable rules & thresholds",
    detail: (e: Partial<StageEvent>) =>
      typeof e.count === "number" ? `${e.count} candidate rule(s) for this category` : undefined,
  },
  {
    key: "draft",
    icon: ScrollText,
    label: "Drafting the note sheet",
    detail: (e: Partial<StageEvent>) => {
      if (e.status === "fallback") return "LLM unavailable — using template fallback"
      if (typeof e.provider === "string") return `generating with ${e.provider}…`
      return e.status === "done" ? "draft written" : undefined
    },
  },
  {
    key: "review",
    icon: ShieldAlert,
    label: "Checking citations, documents & approval chain",
    detail: (e: Partial<StageEvent>) => {
      if (typeof e.missing === "number" && typeof e.chain === "number")
        return `${e.missing} document(s) to attach · ${e.chain}-stage chain suggested`
      return undefined
    },
  },
] as const

export function PipelineProgress({
  events,
  fallbackSeen,
}: {
  /** Latest event per stage, as they arrived from the real backend stream. */
  events: Record<string, StageEvent>
  fallbackSeen: boolean
}) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500)
    return () => clearInterval(timer)
  }, [])

  return (
    <Card className="border border-border/70 bg-card/80 shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-500 motion-reduce:animate-none">
      <CardContent className="flex flex-col gap-1 py-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Drafting pipeline · live
          </p>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{elapsed}s</span>
        </div>
        {STAGES.map((stage, i) => {
          const event = events[stage.key]
          const state = !event ? "pending" : event.status === "started" || event.status === "fallback" ? "active" : "done"
          const Icon = stage.icon
          const isLast = i === STAGES.length - 1
          return (
            <div key={stage.key}>
              <div className="flex items-center gap-3 py-2">
                <span
                  className={
                    state === "done"
                      ? "flex size-7 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/15 text-accent"
                      : state === "active"
                        ? "flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary"
                        : "flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground/50"
                  }
                >
                  {state === "done" ? (
                    <Check className="size-3.5" />
                  ) : state === "active" ? (
                    <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      state === "pending"
                        ? "text-sm text-muted-foreground/60"
                        : "text-sm font-medium text-foreground"
                    }
                  >
                    {stage.label}
                    {stage.key === "draft" && fallbackSeen && (
                      <span className="ml-2 rounded-sm bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                        template fallback
                      </span>
                    )}
                  </p>
                  {event && event.status !== "started" && stage.detail(event) && (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{stage.detail(event)}</p>
                  )}
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {state === "done" ? "done" : state === "active" ? "running" : "queued"}
                </span>
              </div>
              {!isLast && <div className="ml-[13px] h-px w-[calc(100%-26px)] bg-border" />}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
