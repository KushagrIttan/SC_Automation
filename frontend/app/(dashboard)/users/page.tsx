"use client"

import { useState } from "react"
import useSWR from "swr"
import { ShieldCheck, UsersRound } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api/client"
import { ROLE_LABELS } from "@/lib/access"
import type { Role } from "@/lib/api/auth"

interface AdminUser {
  id: number
  email: string
  name: string
  role: Role
  department: string | null
  position: string | null
  has_signature: boolean
  signature_png: string | null
  active: boolean
}

const fetcher = (url: string) => apiFetch<AdminUser[]>(url, { cache: "no-store" })

export default function UserManagementPage() {
  const { data: users, isLoading, mutate } = useSWR("/api/admin/users", fetcher)
  const [savingId, setSavingId] = useState<number | null>(null)

  async function patch(id: number, body: Record<string, unknown>) {
    setSavingId(id)
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: "PATCH", json: body })
      toast.success("Saved.")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="border-l-4 border-primary pl-4">
        <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          <ShieldCheck className="size-3" />Admin / Developer · access control
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">User Management</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          All registered accounts across roles. Change roles, deactivate accounts, and review captured
          signatures. Changes apply immediately — deactivated users are rejected at the API layer.
        </p>
      </div>

      <Card className="rounded-[2px] border border-border bg-card py-0 shadow-sm">
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <UsersRound className="size-4 text-muted-foreground" />
            Accounts
          </CardTitle>
          <CardDescription>{isLoading ? "Loading…" : `${users?.length ?? 0} registered users`}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto py-0">
          {isLoading ? (
            <div className="flex flex-col gap-2 py-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Signature</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users ?? []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[u.department, u.position].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(v) => patch(u.id, { role: v })}
                        disabled={savingId === u.id}
                      >
                        <SelectTrigger size="sm" className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {u.signature_png ? (
                        <Dialog>
                          <DialogTrigger render={<Button variant="outline" size="sm">View</Button>} />
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>{u.name} — signature on file</DialogTitle>
                            </DialogHeader>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={u.signature_png}
                              alt={`Signature of ${u.name}`}
                              className="mx-auto max-h-40 rounded-sm border border-border bg-white p-2"
                            />
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            u.active
                              ? "border-accent/40 bg-accent/[0.08] text-accent"
                              : "border-destructive/40 bg-destructive/[0.08] text-destructive"
                          }
                        >
                          {u.active ? "Active" : "Deactivated"}
                        </Badge>
                        <Button
                          variant={u.active ? "outline" : "default"}
                          size="sm"
                          disabled={savingId === u.id}
                          onClick={() => patch(u.id, { active: !u.active })}
                        >
                          {u.active ? "Deactivate" : "Reactivate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
