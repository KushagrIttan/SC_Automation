"use client"

import { Fragment } from "react"
import { ScrollText } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { RuleCitation } from "@/lib/types"

const CITATION_PATTERN = /\[([^\]]+)\]/g

export function DraftText({ text, citations }: { text: string; citations: RuleCitation[] }) {
  const paragraphs = text.split("\n\n")

  return (
    <div className="flex flex-col gap-4 font-serif text-[15px] leading-relaxed text-foreground/90">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-pretty">
          {renderWithCitations(para, citations)}
        </p>
      ))}
    </div>
  )
}

function renderWithCitations(paragraph: string, citations: RuleCitation[]) {
  const parts: (string | { code: string })[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  const pattern = new RegExp(CITATION_PATTERN)
  while ((match = pattern.exec(paragraph)) !== null) {
    const code = match[1]
    const isCitation = citations.some((c) => c.code === code)
    if (isCitation) {
      if (match.index > lastIndex) parts.push(paragraph.slice(lastIndex, match.index))
      parts.push({ code })
      lastIndex = match.index + match[0].length
    }
  }
  if (lastIndex < paragraph.length) parts.push(paragraph.slice(lastIndex))

  return parts.map((part, i) => {
    if (typeof part === "string") return <Fragment key={i}>{part}</Fragment>
    const citation = citations.find((c) => c.code === part.code)
    if (!citation) return <Fragment key={i}>[{part.code}]</Fragment>
    return <CitationChip key={i} citation={citation} />
  })
}

function CitationChip({ citation }: { citation: RuleCitation }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="mx-0.5 inline-flex items-center gap-1 rounded-sm border border-primary/40 bg-primary/10 px-1.5 py-0.5 align-middle font-mono text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
          >
            {citation.code}
          </button>
        }
      />
      <PopoverContent className="w-80" align="start">
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <ScrollText className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xs font-semibold text-primary">{citation.code}</span>
              <span className="text-sm font-medium text-foreground">{citation.title}</span>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{citation.excerpt}</p>
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Source: {citation.sourceDoc}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  )
}
