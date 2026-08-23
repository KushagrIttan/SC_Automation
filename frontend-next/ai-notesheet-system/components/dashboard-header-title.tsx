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
    <div className="flex min-w-0 flex-col items-center overflow-hidden text-center leading-none">
      <span className="truncate text-base font-semibold text-sidebar-foreground md:text-lg">{entry?.title ?? "Sanction Desk"}</span>
      {entry?.eyebrow ? (
        <span className="mt-1 hidden font-mono text-[9px] uppercase tracking-[0.14em] text-sidebar-foreground/65 md:inline">
          {entry.eyebrow}
        </span>
      ) : null}
    </div>
  )
}
