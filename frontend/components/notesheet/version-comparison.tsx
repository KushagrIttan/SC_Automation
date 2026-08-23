"use client"

import { useMemo } from "react"
import { FilePenLine, Sparkles } from "lucide-react"

type DiffPart = { value: string; kind: "unchanged" | "removed" | "added" }

export function VersionComparison({ originalText, editedText }: { originalText: string; editedText: string }) {
  const diff = useMemo(() => diffWords(originalText, editedText), [originalText, editedText])

  return (
    <div className="overflow-hidden rounded-sm border border-border">
      <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <VersionColumn icon={<Sparkles className="size-4 text-primary" />} label="Original AI draft" parts={diff.filter((part) => part.kind !== "added")} variant="original" />
        <VersionColumn icon={<FilePenLine className="size-4 text-accent" />} label="Human-edited version" parts={diff.filter((part) => part.kind !== "removed")} variant="edited" />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border bg-muted/30 px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        <span><i className="mr-1 inline-block size-2 rounded-sm bg-destructive/60" />Removed from original</span>
        <span><i className="mr-1 inline-block size-2 rounded-sm bg-accent/60" />Added by editor</span>
      </div>
    </div>
  )
}

function VersionColumn({ icon, label, parts, variant }: { icon: React.ReactNode; label: string; parts: DiffPart[]; variant: "original" | "edited" }) {
  return (
    <section>
      <header className="flex items-center gap-2 border-b border-border bg-card/50 px-4 py-3">
        {icon}
        <h3 className="text-sm font-medium">{label}</h3>
      </header>
      <div className="min-h-80 whitespace-pre-wrap px-4 py-4 font-serif text-[15px] leading-relaxed text-foreground/90">
        {parts.map((part, index) => (
          <span key={index} className={part.kind === "removed" && variant === "original" ? "rounded-sm bg-destructive/20 text-destructive line-through decoration-destructive/70" : part.kind === "added" && variant === "edited" ? "rounded-sm bg-accent/20 text-foreground" : undefined}>
            {part.value}
          </span>
        ))}
      </div>
    </section>
  )
}

function diffWords(original: string, edited: string): DiffPart[] {
  const before = original.match(/\s+|[^\s]+/g) ?? []
  const after = edited.match(/\s+|[^\s]+/g) ?? []
  const matrix = Array.from({ length: before.length + 1 }, () => Array(after.length + 1).fill(0) as number[])

  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      matrix[i][j] = before[i] === after[j] ? matrix[i + 1][j + 1] + 1 : Math.max(matrix[i + 1][j], matrix[i][j + 1])
    }
  }

  const parts: DiffPart[] = []
  const push = (value: string, kind: DiffPart["kind"]) => {
    const previous = parts.at(-1)
    if (previous?.kind === kind) previous.value += value
    else parts.push({ value, kind })
  }

  let i = 0
  let j = 0
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      push(before[i], "unchanged")
      i++
      j++
    } else if (matrix[i + 1][j] >= matrix[i][j + 1]) {
      push(before[i++], "removed")
    } else {
      push(after[j++], "added")
    }
  }
  while (i < before.length) push(before[i++], "removed")
  while (j < after.length) push(after[j++], "added")
  return parts
}
