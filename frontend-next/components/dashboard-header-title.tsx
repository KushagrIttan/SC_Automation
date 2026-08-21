"use client"

import { usePathname } from "next/navigation"

const titleMap: { match: (path: string) => boolean; title: string; eyebrow: string }[] = [
  { match: (p) => p.startsWith("/new-request"), title: "New Request", eyebrow: "Draft" },
  { match: (p) => p.startsWith("/notesheets"), title: "My Note Sheets", eyebrow: "Records" },
  { match: (p) => p.startsWith("/approvals"), title: "Approvals", eyebrow: "Routing" },
  { match: (p) => p.startsWith("/precedents"), title: "Precedent Library", eyebrow: "Reference" },
  { match: (p) => p.startsWith("/knowledge-base"), title: "Knowledge Base", eyebrow: "RAG Corpus" },
  { match: (p) => p.startsWith("/analytics"), title: "Analytics", eyebrow: "Insights" },
]

export function DashboardHeaderTitle() {
  const pathname = usePathname()
  const entry = titleMap.find((t) => t.match(pathname))

  return (
    <div className="flex items-baseline gap-2 overflow-hidden">
      <span className="truncate text-sm font-medium text-foreground">{entry?.title ?? "Sanction Desk"}</span>
      {entry?.eyebrow ? (
        <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
          {entry.eyebrow}
        </span>
      ) : null}
    </div>
  )
}
