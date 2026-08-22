"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NoteSheetListTable } from "@/components/notesheet/notesheet-list-table"
import { useNoteSheets } from "@/hooks/use-notesheets"
import type { NoteSheetStatus } from "@/lib/types"

const filters: { label: string; value: NoteSheetStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "Draft" },
  { label: "Pending Approval", value: "Pending Approval" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
]

export default function MyNoteSheetsPage() {
  const { noteSheets, isLoading } = useNoteSheets()
  const [filter, setFilter] = useState<NoteSheetStatus | "all">("all")

  const filtered = useMemo(
    () => (filter === "all" ? noteSheets : noteSheets.filter((ns) => ns.status === filter)),
    [noteSheets, filter],
  )

  return (
    <div className="flex flex-col gap-8 text-foreground">
      <div className="max-w-4xl">
        <p className="text-sm font-bold">Sanction Desk</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">My note sheets</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-foreground">View and manage your saved drafts and submitted sanction requests.</p>
      </div>
      <div className="flex max-w-5xl flex-wrap items-center justify-between gap-4 border-y border-border py-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as NoteSheetStatus | "all")} className="gap-0">
          <TabsList variant="line" className="gap-0 p-0">
            {filters.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="h-9 rounded-none px-3 text-[16px] text-primary data-active:bg-transparent data-active:text-foreground">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button render={<Link href="/new-request" />} nativeButton={false} size="lg" className="rounded-[2px] bg-accent px-4 font-bold hover:bg-accent/85">
          <Plus data-icon="inline-start" />
          New request
        </Button>
      </div>

      <section className="max-w-6xl">
        <h2 className="mb-4 text-2xl font-bold">Your note sheets</h2>
        {isLoading ? (
          <div className="flex flex-col gap-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
        ) : (
          <NoteSheetListTable noteSheets={filtered} emptyLabel="No note sheets match this filter" variant="government" />
        )}
      </section>
    </div>
  )
}
