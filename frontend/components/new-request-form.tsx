"use client"

import { useEffect, useRef, useState } from "react"
import {
  ArrowRight,
  ChevronDown,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupTextarea } from "@/components/ui/input-group"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NoteSheetDetail } from "@/components/notesheet/notesheet-detail"
import { ApprovalStepper } from "@/components/notesheet/approval-stepper"
import { PipelineProgress } from "@/components/new-request/pipeline-progress"
import {
  generateDraftStream,
  type StageEvent,
} from "@/lib/api/notesheets"
import { submitNoteSheetForApproval } from "@/lib/api/approvals"
import { extractPdf } from "@/lib/api/documents"
import type { NoteSheet, NoteSheetCategory } from "@/lib/types"
import { toast } from "sonner"

const categories: NoteSheetCategory[] = [
  "Lab Equipment Purchase",
  "Event/Fest Expenditure",
  "Guest Faculty Honorarium",
  "Student Travel/TA-DA",
  "Club Budget",
]

interface UploadItem {
  id: string
  name: string
  size: number
  status: "uploading" | "ready" | "error"
  method?: "text_layer" | "ocr"
  text?: string
  chars?: number
  pages?: number
  error?: string
  panelOpen?: boolean
}

type Phase = "idle" | "working" | "done"

export function NewRequestForm() {
  const [expanded, setExpanded] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")
  const [prompt, setPrompt] = useState("")
  const [category, setCategory] = useState<NoteSheetCategory>("Lab Equipment Purchase")
  const [requesterName, setRequesterName] = useState("")
  const [department, setDepartment] = useState("")
  const [amount, setAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [draft, setDraft] = useState<NoteSheet | null>(null)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [stageEvents, setStageEvents] = useState<Record<string, StageEvent>>({})
  const [fallbackSeen, setFallbackSeen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    import("@/lib/api/documents").then(({ getOcrStatus }) => {
      getOcrStatus()
        .then((status) => {
          if (!cancelled && !status.available) {
            toast.warning("Scanned-PDF support is offline", {
              description: "Tesseract OCR is not installed on the server. Text-layer PDFs still work.",
            })
          }
        })
        .catch(() => {})
    })
    return () => {
      cancelled = true
    }
  }, [])

  function pickFiles() {
    fileInputRef.current?.click()
  }

  async function handleFilesChosen(files: FileList | null) {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        toast.error(`${file.name}: only PDF files are accepted.`)
        continue
      }
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`${file.name}: larger than the 25 MB limit.`)
        continue
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setUploads((prev) => [...prev, { id, name: file.name, size: file.size, status: "uploading" }])
      try {
        const result = await extractPdf(file)
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  ...u,
                  status: "ready",
                  method: result.method === "ocr_unavailable" ? undefined : result.method,
                  text: result.text,
                  chars: result.chars,
                  pages: result.pages,
                  error: result.detail,
                }
              : u
          )
        )
        if (result.method === "ocr") {
          toast.success(`Scanned document read via OCR — ${result.chars.toLocaleString("en-IN")} characters extracted.`)
        } else if (result.method === "text_layer") {
          toast.success(`Reference attached — ${result.pages} page(s), ${result.chars.toLocaleString("en-IN")} characters.`)
        } else {
          toast.error(result.detail || "Could not extract text from this PDF.")
        }
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, status: "error", error: err instanceof Error ? err.message : "Upload failed" } : u
          )
        )
        toast.error(err instanceof Error ? err.message : "Extraction failed.")
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function togglePanel(id: string) {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, panelOpen: !u.panelOpen } : u)))
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error("Describe the sanction you need before generating a draft.")
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const readyTexts = uploads
      .filter((u) => u.status === "ready" && u.text)
      .map((u) => `[Reference: ${u.name}]\n${u.text!.slice(0, 3000)}`)

    setExpanded(false)
    setDetailsOpen(false)
    setStageEvents({})
    setFallbackSeen(false)
    setPhase("working")
    setDraft(null)
    try {
      const result = await generateDraftStream(
        {
          prompt,
          category,
          requesterName,
          department,
          amountHint: amount ? Number(amount) : undefined,
          extraContext: readyTexts.join("\n\n"),
        },
        (event) => {
          setStageEvents((prev) => ({ ...prev, [event.stage]: event }))
          if (event.stage === "draft" && event.status === "fallback") setFallbackSeen(true)
        },
        controller.signal
      )
      setDraft(result)
      setPhase("done")
      requestAnimationFrame(() =>
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      )
      if (result.precedentIds.length === 0) {
        toast.warning("Draft ready — no similar precedents were found in the corpus.")
      } else {
        toast.success(`Draft generated against ${result.precedentIds.length} precedent(s).`)
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setPhase("idle")
        setExpanded(true)
        return
      }
      toast.error(err instanceof Error ? err.message : "Generation failed.")
      setPhase("idle")
      setExpanded(true)
    } finally {
      abortRef.current = null
    }
  }

  function handleCancel() {
    abortRef.current?.abort()
  }

  async function handleSubmitForApproval() {
    if (!draft) return
    setSubmitting(true)
    try {
      await submitNoteSheetForApproval(draft.id)
      toast.success("Note sheet submitted for departmental review.")
      setDraft({ ...draft, status: "Pending Approval", currentStage: draft.approvalStages[0]?.name ?? "Pending" })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submit failed.")
    } finally {
      setSubmitting(false)
    }
  }

  const busy = phase === "working"

  return (
    <div className="flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFilesChosen(e.target.files)}
      />

      {/* Prompt window */}
      <div className="mx-auto w-full transition-all duration-500 ease-out motion-reduce:transition-none">
        {/* Expanded editor — compact centered window */}
        <div
          className="grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none"
          style={{ gridTemplateRows: expanded ? "1fr" : "0fr", opacity: expanded ? 1 : 0 }}
        >
          <div className="overflow-hidden">
            <Card className="mx-auto mt-14 w-full max-w-2xl border-border/80 shadow-lg shadow-black/[0.03]">
              <CardContent className="flex flex-col gap-3 px-5 py-4">
                <Field>
                  <FieldLabel htmlFor="prompt" className="sr-only">
                    Request details
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupTextarea
                      id="prompt"
                      autoFocus
                      placeholder="Describe the sanction you need… e.g. Sanction ₹80,000 for four oscilloscopes in the Robotics Lab"
                      className="min-h-20 border-none bg-transparent px-1 font-sans text-sm shadow-none focus-visible:ring-0"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleGenerate()
                      }}
                    />
                  </InputGroup>
                </Field>

                {uploads.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploads.map((u) => (
                      <div
                        key={u.id}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-sm border border-border bg-muted/40 py-1 pl-2 pr-1"
                      >
                        {u.status === "uploading" ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />
                        ) : (
                          <FileText className="size-3.5 shrink-0 text-primary" />
                        )}
                        <button
                          type="button"
                          onClick={() => u.status === "ready" && togglePanel(u.id)}
                          disabled={u.status !== "ready"}
                          className="max-w-52 truncate text-left font-mono text-[11px] hover:underline disabled:no-underline"
                          title={u.status === "ready" ? "Show / hide extracted text" : u.name}
                        >
                          {u.name}
                        </button>
                        {u.status === "ready" && (
                          <Badge
                            variant="outline"
                            className={
                              u.method === "ocr"
                                ? "border-amber-500/40 bg-amber-500/10 px-1 py-0 font-mono text-[9px] text-amber-700 dark:text-amber-400"
                                : "border-primary/30 bg-primary/[0.07] px-1 py-0 font-mono text-[9px] text-primary"
                            }
                          >
                            {u.method === "ocr" ? "OCR" : "text"}
                          </Badge>
                        )}
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={`Remove ${u.name}`}
                          className="size-5"
                          onClick={() => setUploads((prev) => prev.filter((x) => x.id !== u.id))}
                        >
                          <X className="size-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Extracted-text panels */}
                {uploads.filter((u) => u.panelOpen && u.status === "ready").length > 0 && (
                  <div className="flex flex-col gap-2">
                    {uploads
                      .filter((u) => u.panelOpen && u.status === "ready")
                      .map((u) => (
                        <div key={u.id} className="rounded-sm border border-border bg-muted/20 p-2">
                          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {u.name} · extracted text{u.method === "ocr" ? " (Tesseract OCR — verify accuracy)" : ""}
                            {typeof u.chars === "number" ? ` · ${u.chars.toLocaleString("en-IN")} chars` : ""}
                          </p>
                          <pre className="max-h-44 overflow-auto whitespace-pre-wrap rounded-sm bg-background p-2 font-mono text-[11px] leading-relaxed text-foreground/85">
                            {u.text || "(no text extracted)"}
                          </pre>
                        </div>
                      ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={pickFiles}
                      aria-label="Attach PDF reference documents"
                      title="Attach PDF reference documents"
                    >
                      <Plus />
                    </Button>
                    <Select value={category} onValueChange={(v) => setCategory(v as NoteSheetCategory)}>
                      <SelectTrigger
                        aria-label="Category"
                        className="h-8 w-auto gap-1 border-none bg-transparent px-2 text-xs text-muted-foreground shadow-none hover:bg-muted focus-visible:ring-1"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {categories.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => setDetailsOpen((v) => !v)}
                      className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-expanded={detailsOpen}
                    >
                      Details
                      <ChevronDown className={`size-3.5 transition-transform duration-300 motion-reduce:transition-none ${detailsOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  <Button onClick={handleGenerate} size="sm">
                    Generate draft
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>

                {/* Optional metadata */}
                <div
                  className="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
                  style={{ gridTemplateRows: detailsOpen ? "1fr" : "0fr", opacity: detailsOpen ? 1 : 0 }}
                >
                  <div className="overflow-hidden">
                    <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-3">
                      <Field>
                        <FieldLabel htmlFor="requester">Requester name</FieldLabel>
                        <Input
                          id="requester"
                          placeholder="Dr. A. Sharma"
                          value={requesterName}
                          onChange={(e) => setRequesterName(e.target.value)}
                          className="h-8 bg-background text-xs"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="department">Department</FieldLabel>
                        <Input
                          id="department"
                          placeholder="Electronics & Communication"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="h-8 bg-background text-xs"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="amount">Estimated amount (₹)</FieldLabel>
                        <Input
                          id="amount"
                          type="number"
                          inputMode="numeric"
                          placeholder="80000"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="h-8 bg-background text-xs"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
              Drafts are grounded in retrieved precedents and institutional rules · Ctrl+Enter to generate
            </p>
          </div>
        </div>

        {/* Docked compact bar */}
        <div
          className="grid transition-opacity duration-500 motion-reduce:transition-none"
          style={{
            opacity: expanded ? 0 : 1,
            pointerEvents: expanded ? "none" : "auto",
            height: expanded ? 0 : "auto",
            overflow: "hidden",
          }}
        >
          <Card className="mx-auto mt-6 w-full max-w-2xl border-border/80 py-0 shadow-sm">
            <CardContent className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <Sparkles className="size-4" />
              </span>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="min-w-0 flex-1 text-left"
                title="Expand your request"
              >
                <p className="line-clamp-1 text-xs font-medium text-foreground/90">
                  {prompt.trim() || "Your request"}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[10px] text-muted-foreground">
                  <span>{category}</span>
                  {uploads.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Paperclip className="size-3" />
                      {uploads.filter((u) => u.status === "ready").length} PDF
                    </span>
                  )}
                  {amount && <span>₹{Number(amount).toLocaleString("en-IN")}</span>}
                </p>
              </button>
              <Button variant="outline" size="sm" onClick={() => setExpanded(true)} disabled={busy}>
                <ChevronDown data-icon="inline-start" />
                New request
              </Button>
              {!busy && draft && (
                <Button size="sm" onClick={handleGenerate} disabled={busy}>
                  Regenerate
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Below the fold: pipeline progress or results */}
      <div ref={resultsRef} className="mx-auto mt-6 w-full max-w-5xl scroll-mt-6">
        {busy && (
          <PipelineProgress events={stageEvents} fallbackSeen={fallbackSeen} />
        )}

        {busy && (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        )}

        {draft && !busy && phase === "done" && (
          <div
            key={draft.id}
            className="animate-in fade-in slide-in-from-bottom-4 duration-700 motion-reduce:animate-none"
          >
            <NoteSheetDetail
              noteSheet={draft}
              showApprovalChain={false}
              approvalChainBelowJustification
              approvalChain={<ApprovalStepper stages={draft.approvalStages} />}
              headerAction={
                <Button
                  size="sm"
                  onClick={handleSubmitForApproval}
                  disabled={submitting || draft.status !== "Draft"}
                >
                  <Send data-icon="inline-start" />
                  {submitting ? "Submitting…" : "Submit for approval"}
                </Button>
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
