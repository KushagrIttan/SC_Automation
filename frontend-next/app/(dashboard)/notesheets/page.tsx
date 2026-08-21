"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as NoteSheetStatus | "all")}>
          <TabsList>
            {filters.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button render={<Link href="/new-request" />} nativeButton={false} size="sm">
          <Plus data-icon="inline-start" />
          New request
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <NoteSheetListTable noteSheets={filtered} emptyLabel="No note sheets match this filter" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
