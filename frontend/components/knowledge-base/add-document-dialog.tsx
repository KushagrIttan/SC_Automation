"use client"

import { useRef, useState } from "react"
import { FilePlus2, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { useSWRConfig } from "swr"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { uploadKnowledgeDocument } from "@/lib/api/knowledge-base"
import { CATEGORY_LABELS, CATEGORY_SLUGS } from "@/lib/api/notesheets"

const CATEGORY_OPTIONS = Object.entries(CATEGORY_SLUGS) as [string, string][]

export function AddDocumentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutate } = useSWRConfig()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  function reset() {
    setCategory("")
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (uploading) return
    if (!category) {
      toast.error("Choose the category this document belongs to.")
      return
    }
    if (!file) {
      toast.error("Attach a PDF to add to the knowledge base.")
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("PDF must be 25 MB or smaller.")
      return
    }
    setUploading(true)
    try {
      const result = await uploadKnowledgeDocument(file, category)
      const methodNote =
        result.method === "ocr"
          ? "Text was recovered via OCR from the scanned pages."
          : `Text layer read directly — ${result.chars.toLocaleString("en-IN")} characters.`
      toast.success(`“${result.subject}” added to ${CATEGORY_LABELS[result.category] ?? result.category}.`, {
        description: `${methodNote} It is now searchable and citable as precedent ${result.id}.`,
      })
      void mutate("kb-documents")
      void mutate("kb-retrieval-stats")
      reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the document.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Add document to the corpus</DialogTitle>
          <DialogDescription>
            The PDF&rsquo;s text is extracted (OCR for scans), embedded into retrieval, and kept as a citable precedent.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="kb-category">Category</FieldLabel>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="kb-category" className="w-full" disabled={uploading}>
                <SelectValue>{category ? CATEGORY_LABELS[category] ?? category : "Select a category"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CATEGORY_OPTIONS.map(([label, slug]) => (
                    <SelectItem key={slug} value={slug}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="kb-file">Document (PDF)</FieldLabel>
            <Input
              id="kb-file"
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-primary hover:file:bg-secondary/80"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">Up to 25 MB. Scanned PDFs need Tesseract OCR on the server.</p>
          </Field>
          <DialogFooter className="mt-1 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" data-icon="inline-start" />
              ) : (
                <Upload data-icon="inline-start" />
              )}
              {uploading ? "Indexing…" : "Add document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AddDocumentButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button className="border-0 bg-primary shadow-sm hover:bg-primary/90" onClick={() => setOpen(true)}>
        <FilePlus2 data-icon="inline-start" />
        Add document
      </Button>
      <AddDocumentDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
