"use client"

import { useState } from "react"
import { Check, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import type { WordingSuggestion } from "@/lib/types"

export function WordingSuggestions({ suggestions: initial }: { suggestions: WordingSuggestion[] }) {
  const [suggestions, setSuggestions] = useState(initial)

  function resolve(id: string, status: "accepted" | "rejected") {
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
  }

  if (suggestions.length === 0) {
    return (
      <Empty className="py-6">
        <EmptyMedia variant="icon">
          <Sparkles />
        </EmptyMedia>
        <EmptyTitle className="text-sm">No wording suggestions</EmptyTitle>
        <EmptyDescription>This draft already matches institutional phrasing conventions.</EmptyDescription>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {suggestions.map((s) => (
        <div key={s.id} className="flex flex-col gap-2 rounded-sm border border-border bg-muted/30 p-3">
          <div className="flex flex-col gap-1.5 text-xs leading-relaxed">
            <p className="text-muted-foreground line-through decoration-destructive/50">{s.before}</p>
            <p className="text-foreground">{s.after}</p>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">{s.reason}</p>
          {s.status === "pending" ? (
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="secondary" className="h-7" onClick={() => resolve(s.id, "accepted")}>
                <Check data-icon="inline-start" />
                Accept
              </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => resolve(s.id, "rejected")}>
                <X data-icon="inline-start" />
                Dismiss
              </Button>
            </div>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {s.status === "accepted" ? "Accepted" : "Dismissed"}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
