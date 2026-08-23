"use client"

import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { computeLineTotal, formatINR } from "@/lib/format"
import type { BudgetLineItem } from "@/lib/types"

export function BudgetTable({ items }: { items: BudgetLineItem[] }) {
  const grandTotal = items.reduce((sum, item) => sum + lineTotal(item), 0)

  if (items.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-border p-4 text-sm text-muted-foreground">
        No structured line-item breakdown was extracted for this request. Amounts cited in the draft text above are
        the authoritative figures.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Unit cost</TableHead>
          <TableHead className="text-right">GST</TableHead>
          <TableHead className="text-right">Line total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="max-w-64 text-pretty text-sm">{item.item}</TableCell>
            <TableCell className="text-right font-mono text-sm">{item.quantity}</TableCell>
            <TableCell className="text-right font-mono text-sm">{formatINR(item.unitCost)}</TableCell>
            <TableCell className="text-right font-mono text-sm text-muted-foreground">
              {item.gstPercent > 0 ? `${item.gstPercent}%` : "—"}
            </TableCell>
            <TableCell className="text-right font-mono text-sm font-medium">{formatINR(lineTotal(item))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={4} className="font-medium">
            Total sanctioned amount
          </TableCell>
          <TableCell className="text-right font-mono font-semibold text-primary">{formatINR(grandTotal)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}

function lineTotal(item: BudgetLineItem) {
  return Math.round(computeLineTotal(item.quantity, item.unitCost, item.gstPercent))
}
