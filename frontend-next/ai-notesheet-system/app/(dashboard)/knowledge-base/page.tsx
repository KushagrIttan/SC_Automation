"use client"

import { useState } from "react"
import { Database, FilePlus2, FileSearch, Files, Search, ShieldCheck, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatDateTime } from "@/lib/format"
import { useKnowledgeDocuments, useKnowledgeSearch, useRetrievalStats } from "@/hooks/use-knowledge-base"

export default function KnowledgeBasePage() {
  const [query, setQuery] = useState("")
  const { documents, isLoading: documentsLoading } = useKnowledgeDocuments()
  const { stats, isLoading: statsLoading } = useRetrievalStats()
  const { results, isLoading: searchLoading } = useKnowledgeSearch(query.trim())
  const displayedDocuments = query.trim() ? results : documents
  const maxCitations = stats?.mostCitedDocuments[0]?.citedCount ?? 1

  return (
    <div className="flex flex-col gap-6 text-foreground">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-accent"><ShieldCheck className="size-4" />Verified institutional corpus</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-primary">Knowledge Base</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">A trusted collection of rules, statutes, circulars, and approved note sheets for grounded drafting.</p>
        </div>
        <Button className="border-0 bg-primary shadow-sm hover:bg-primary/90" onClick={() => toast.info("Document upload will be connected to the indexing API.")}>
          <FilePlus2 data-icon="inline-start" />
          Add document
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-[2px] bg-primary px-5 py-5 text-primary-foreground shadow-sm">
        <Sparkles className="absolute -right-5 -bottom-6 size-32 text-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-white/80">Document intelligence</p><p className="mt-1 text-lg font-semibold">Search, retrieve, and reference verified institutional records.</p></div><span className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium"><ShieldCheck className="size-4" />Corpus ready</span></div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Database className="size-4 text-primary" />} label="Indexed documents" value={stats?.totalDocuments} loading={statsLoading} />
        <StatCard icon={<Files className="size-4 text-primary" />} label="Searchable chunks" value={stats?.totalChunksIndexed.toLocaleString("en-IN")} loading={statsLoading} />
        <StatCard icon={<FileSearch className="size-4 text-primary" />} label="Last re-indexed" value={stats ? formatDateTime(stats.lastReindexedAt) : undefined} loading={statsLoading} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border border-border bg-card py-0 shadow-sm">
          <CardHeader className="gap-4 border-b border-border py-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold text-primary">Indexed documents</CardTitle>
                <CardDescription>{query.trim() ? `${displayedDocuments.length} matching result${displayedDocuments.length === 1 ? "" : "s"}` : "Rules, circulars, statutes, and approved note-sheet precedents"}</CardDescription>
              </div>
              {!documentsLoading && <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-primary">{documents.length} total</span>}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, document types, or tags…" className="h-10 bg-background pl-9 text-sm shadow-xs" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {documentsLoading || searchLoading ? (
              <div className="flex flex-col gap-3 py-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
            ) : displayedDocuments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center"><Search className="size-5 text-muted-foreground" /><p className="text-sm font-medium">No indexed documents match this search</p><p className="text-xs text-muted-foreground">Try a rule name, a document type, or a topic tag.</p></div>
            ) : (
              <div className="divide-y divide-border">
                {displayedDocuments.map((document) => (
                  <article key={document.id} className="flex items-start gap-3 py-4 first:pt-4">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Database className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start gap-2">
                        <h2 className="text-sm font-medium">{document.title}</h2>
                        <Badge variant="outline" className="border-primary/25 bg-secondary font-mono text-[10px] font-semibold text-primary">{document.type}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>Indexed {formatDate(document.indexedAt)}</span><span>{document.sizeKb.toLocaleString("en-IN")} KB</span><span>{document.citedCount} citations</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {document.tags.map((tag) => <Badge key={tag} variant="secondary" className="font-mono text-[10px]">{tag}</Badge>)}
                      </div>
                    </div>
                    <Button size="icon-sm" variant="ghost" aria-label={`Remove ${document.title}`} onClick={() => toast.info("Document removal will be connected to the knowledge-base API.", { description: document.title })}>
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit border border-border bg-card py-0 shadow-sm">
          <CardHeader className="border-b border-border py-5">
            <CardTitle className="text-base font-semibold text-primary">Most cited in retrieval</CardTitle>
            <CardDescription>Documents most often selected as grounding context.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 py-5">
            {statsLoading ? <><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></> : stats?.mostCitedDocuments.map((document, index) => (
              <div key={document.id} className="flex flex-col gap-1.5">
                <div className="flex items-start gap-2"><span className="mt-0.5 font-mono text-[11px] text-primary">{String(index + 1).padStart(2, "0")}</span><p className="line-clamp-2 flex-1 text-xs font-medium leading-relaxed">{document.title}</p><span className="font-mono text-[11px] text-muted-foreground">{document.citedCount}</span></div>
                <div className="ml-5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${(document.citedCount / maxCitations) * 100}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, loading }: { icon: React.ReactNode; label: string; value?: string | number; loading: boolean }) {
  return (
    <Card className="border border-border bg-card py-0 shadow-sm"><CardContent className="flex items-center gap-3 py-4"><span className="flex size-9 items-center justify-center rounded-lg bg-secondary">{icon}</span><div><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>{loading ? <Skeleton className="mt-1 h-5 w-20" /> : <p className="mt-0.5 text-base font-semibold text-foreground">{value}</p>}</div></CardContent></Card>
  )
}
