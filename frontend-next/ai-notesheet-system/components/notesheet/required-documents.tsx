"use client"

import { CheckCircle2, CircleDashed } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RequiredDocument } from "@/lib/types"

export function RequiredDocuments({ documents }: { documents: RequiredDocument[] }) {
  const missing = documents.filter((d) => !d.attached).length

  return (
    <div className="flex flex-col gap-2.5">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-start gap-2.5">
          {doc.attached ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
          ) : (
            <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
          <span
            className={cn(
              "text-pretty text-sm leading-relaxed",
              doc.attached ? "text-foreground/90" : "text-muted-foreground",
            )}
          >
            {doc.name}
          </span>
        </div>
      ))}
      {missing > 0 && (
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-destructive">
          {missing} document{missing > 1 ? "s" : ""} outstanding before final sanction
        </p>
      )}
    </div>
  )
}
