"use client"

import { useRef, useState } from "react"
import { CheckCircle2, CircleDashed, FileUp, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { uploadNoteSheetDocument } from "@/lib/api/documents"
import { cn } from "@/lib/utils"
import type { RequiredDocument, UploadedDocument } from "@/lib/types"

export function RequiredDocuments({
  documents,
  noteSheetId,
  uploadedDocuments = [],
  onDocumentUploaded,
}: {
  documents: RequiredDocument[]
  noteSheetId: string
  uploadedDocuments?: UploadedDocument[]
  onDocumentUploaded?: (document: UploadedDocument) => void
}) {
  const missing = documents.filter((d) => !d.attached).length
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files can be uploaded.")
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("PDF must be 25 MB or smaller.")
      return
    }
    setUploading(true)
    try {
      const uploaded = await uploadNoteSheetDocument(noteSheetId, file)
      onDocumentUploaded?.({
        id: uploaded.id,
        filename: uploaded.filename,
        contentType: uploaded.content_type,
        size: uploaded.size,
        createdAt: uploaded.created_at,
      })
      toast.success(`${uploaded.filename} uploaded and attached to this note sheet.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload the PDF.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <FileUp />}
        {uploading ? "Uploading…" : "Upload PDF"}
      </Button>
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-start gap-2.5">
          {doc.attached ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
          ) : (
            <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
          <span
            className={cn(
              "text-pretty text-sm leading-relaxed",
              doc.attached ? "text-foreground/90" : "text-muted-foreground",
            )}
          >
            {doc.name}
          </span>
        </div>
      ))}
      {uploadedDocuments.length > 0 && (
        <div className="border-t border-border pt-2">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Uploaded PDFs</p>
          {uploadedDocuments.map((document) => (
            <p key={document.id} className="truncate text-xs text-foreground/85" title={document.filename}>
              {document.filename}
            </p>
          ))}
        </div>
      )}
      {missing > 0 && (
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-destructive">
          {missing} document{missing > 1 ? "s" : ""} outstanding before final sanction
        </p>
      )}
    </div>
  )
}
