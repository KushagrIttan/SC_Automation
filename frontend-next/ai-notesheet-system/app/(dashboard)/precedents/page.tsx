"use client"

import { useMemo, useState } from "react"
import { BookMarked, CalendarDays, Eye, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { usePrecedents } from "@/hooks/use-precedents"
import { formatDate, formatINR } from "@/lib/format"
import type { NoteSheetCategory, Precedent } from "@/lib/types"

const categories: NoteSheetCategory[] = ["Lab Equipment Purchase", "Event/Fest Expenditure", "Guest Faculty Honorarium", "Student Travel/TA-DA", "Club Budget"]

export default function PrecedentLibraryPage() {
  const { precedents, isLoading } = usePrecedents()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<NoteSheetCategory | "all">("all")
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return precedents.filter((precedent) => {
      const matchesCategory = category === "all" || precedent.category === category
      const matchesSearch = !normalized || [precedent.title, precedent.snippet, precedent.department, precedent.category].some((value) => value.toLowerCase().includes(normalized))
      return matchesCategory && matchesSearch
    })
  }, [precedents, query, category])

  return (
    <div className="flex flex-col gap-6 text-foreground">
      <div className="border-l-4 border-primary pl-4">
        <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary"><BookMarked className="size-3" />Office records · reference register</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">Precedent Library</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Historical sanction note sheets retained as formal reference material for drafting and review.</p>
      </div>

      <Card className="rounded-[2px] border border-border bg-card py-0 ring-0 shadow-sm">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row">
          <div className="relative flex-1"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search precedents by title, department, or topic…" className="h-10 rounded-[2px] bg-background pl-9" /></div>
          <Select value={category} onValueChange={(value) => setCategory(value as NoteSheetCategory | "all") }>
            <SelectTrigger className="h-10 w-full rounded-[2px] bg-background sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem value="all">All categories</SelectItem>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between border-b border-border pb-3"><p className="text-sm text-muted-foreground">{isLoading ? "Loading precedents…" : `${filtered.length} precedent${filtered.length === 1 ? "" : "s"} entries filed`}</p><span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Historical note sheets</span></div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      ) : filtered.length === 0 ? (
        <Empty className="rounded-[2px] border border-dashed border-border py-16"><EmptyHeader><EmptyMedia variant="icon"><Search /></EmptyMedia><EmptyTitle>No matching precedents</EmptyTitle><EmptyDescription>Try another category or search phrase.</EmptyDescription></EmptyHeader></Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((precedent) => <PrecedentCard key={precedent.id} precedent={precedent} />)}</div>
      )}
    </div>
  )
}

function PrecedentCard({ precedent }: { precedent: Precedent }) {
  return (
    <Card className="flex flex-col rounded-[2px] border border-border bg-card py-0 ring-0 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="gap-3 border-b border-border py-4">
        <div className="flex items-start justify-between gap-2"><Badge variant="outline" className="rounded-[2px] border-primary/35 bg-primary/10 font-mono text-[10px] font-semibold text-primary">{precedent.category}</Badge><span className="font-mono text-[10px] font-semibold tracking-wide text-muted-foreground">{precedent.id}</span></div>
        <CardTitle className="line-clamp-2 font-serif text-lg leading-snug">{precedent.title}</CardTitle>
        <CardDescription className="line-clamp-3 text-xs leading-relaxed">{precedent.snippet}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-3 py-4">
        <div className="grid grid-cols-2 gap-2 border-y border-border py-3 font-mono text-[10px] uppercase tracking-wide text-muted-foreground"><span className="flex items-center gap-1"><CalendarDays className="size-3" />{formatDate(precedent.date)}</span><span className="text-right font-semibold text-primary">{formatINR(precedent.amount)}</span><span className="col-span-2 truncate">{precedent.department} · cited {precedent.citedCount}×</span></div>
        <PrecedentDialog precedent={precedent} />
      </CardContent>
    </Card>
  )
}

function PrecedentDialog({ precedent }: { precedent: Precedent }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" className="w-full rounded-[2px]" />}><Eye data-icon="inline-start" />View full note sheet</DialogTrigger>
      <DialogContent className="max-h-[85vh] rounded-[2px] border border-border bg-popover sm:max-w-3xl">
        <DialogHeader><div className="flex flex-wrap items-center gap-2 pr-8"><Badge variant="outline" className="rounded-[2px] border-primary/35 bg-primary/10 font-mono text-[10px] font-semibold text-primary">{precedent.category}</Badge><span className="font-mono text-[11px] text-muted-foreground">{precedent.id} · {formatDate(precedent.date)}</span></div><DialogTitle className="font-serif text-xl leading-snug">{precedent.title}</DialogTitle><DialogDescription>{precedent.department} · {formatINR(precedent.amount)} · cited {precedent.citedCount} times</DialogDescription></DialogHeader>
        <ScrollArea className="h-[55vh] rounded-[2px] border border-border bg-background p-4"><p className="whitespace-pre-line font-serif text-[15px] leading-relaxed text-foreground/90">{precedent.fullText}</p></ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
