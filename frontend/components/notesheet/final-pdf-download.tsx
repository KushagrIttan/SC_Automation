"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { downloadFinalNotesheetPdf } from "@/lib/api/documents"

export function FinalPdfDownload({ noteSheetId }: { noteSheetId: string }) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    if (downloading) return
    setDownloading(true)
    try {
      await downloadFinalNotesheetPdf(noteSheetId)
      toast.success("Final note sheet downloaded — signed approval copy with supporting documents.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download the final PDF.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Button size="sm" onClick={handleDownload} disabled={downloading}>
      {downloading ? (
        <Loader2 className="animate-spin motion-reduce:animate-none" data-icon="inline-start" />
      ) : (
        <Download data-icon="inline-start" />
      )}
      {downloading ? "Preparing PDF…" : "Download final PDF"}
    </Button>
  )
}
