import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type Status = "Draft" | "Pending Approval" | "Approved" | "Rejected" | "Pending"

const styles: Record<Status, string> = {
  Draft: "bg-muted text-muted-foreground border-transparent",
  "Pending Approval": "bg-primary/15 text-primary border-primary/30",
  Pending: "bg-primary/15 text-primary border-primary/30",
  Approved: "bg-accent/15 text-accent border-accent/30",
  Rejected: "bg-destructive/15 text-destructive border-destructive/30",
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-wide", styles[status], className)}>
      {status}
    </Badge>
  )
}
