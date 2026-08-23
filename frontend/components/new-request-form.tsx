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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

  // Warn early (once) if the server has no Tesseract — scanned PDFs will be rejected.
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
  const totalReadyChars = uploads.reduce((sum, u) => sum + (u.chars ?? 0), 0)

  return (
    <div className="flex flex-col">
      {/* Hidden PDF picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFilesChosen(e.target.files)}
      />

      {/* Prompt window — hero when expanded, docked bar when collapsed */}
      <div className="mx-auto w-full transition-all duration-500 ease-out motion-reduce:transition-none">
        {/* Expanded editor */}
        <div
          className="grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none"
          style={{ gridTemplateRows: expanded ? "1fr" : "0fr", opacity: expanded ? 1 : 0 }}
        >
          <div className="overflow-hidden">
            <Card className="mx-auto mt-[10vh] w-full max-w-3xl border-border/80 shadow-lg shadow-black/[0.03]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4 text-primary" />
                  Describe the sanction you need
                </CardTitle>
                <CardDescription>
                  Write it the way you would explain it to a colleague. The draft is generated against
                  institutional rules and past precedents, then routed to the required approvers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="prompt">Request details</FieldLabel>
                    <InputGroup>
                      <InputGroupTextarea
                        id="prompt"
                        placeholder="e.g. Sanction ₹80,000 for four oscilloscopes in the Robotics Lab, three quotes obtained, needed before next semester's lab sessions"
                        className="min-h-32 font-sans text-sm"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleGenerate()
                        }}
                      />
                    </InputGroup>
                    <FieldDescription>
                      Mention items, quantities, vendors, or urgency — the more detail, the sharper the citations.
                      Attach scanned reference note sheets below; their extracted text grounds the retrieval.
                    </FieldDescription>
                  </Field>

                  {uploads.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {uploads.map((u) => (
                        <div key={u.id} className="rounded-sm border border-border bg-muted/30">
                          <div className="flex items-center gap-2 px-3 py-2">
                            {u.status === "uploading" ? (
                              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />
                            ) : (
                              <FileText className="size-4 shrink-0 text-primary" />
                            )}
                            <button
                              type="button"
                              onClick={() => u.status === "ready" && togglePanel(u.id)}
                              disabled={u.status !== "ready"}
                              className="min-w-0 flex-1 truncate text-left text-xs font-medium hover:underline disabled:no-underline"
                              title={u.status === "ready" ? "Show / hide extracted text" : u.name}
                            >
                              {u.name}
                              {u.status === "ready" && (
                                <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                                  {(u.size / 1024).toFixed(0)} KB · {u.chars?.toLocaleString("en-IN")} chars
                                </span>
                              )}
                              {u.status === "error" && (
                                <span className="ml-2 font-mono text-[10px] text-destructive">{u.error}</span>
                              )}
                            </button>
                            {u.status === "ready" && (
                              <Badge
                                variant="outline"
                                className={
                                  u.method === "ocr"
                                    ? "border-amber-500/40 bg-amber-500/10 font-mono text-[9px] text-amber-700 dark:text-amber-400"
                                    : "border-primary/30 bg-primary/[0.07] font-mono text-[9px] text-primary"
                                }
                              >
                                {u.method === "ocr" ? "OCR" : "text layer"}
                              </Badge>
                            )}
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Remove ${u.name}`}
                              onClick={() => setUploads((prev) => prev.filter((x) => x.id !== u.id))}
                            >
                              <X className="text-muted-foreground" />
                            </Button>
                          </div>
                          {u.panelOpen && u.status === "ready" && (
                            <div className="border-t border-border px-3 py-2">
                              <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                Extracted text{u.method === "ocr" ? " (via Tesseract OCR — verify accuracy)" : ""}
                              </p>
                              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-sm bg-background p-2 font-mono text-[11px] leading-relaxed text-foreground/85">
                                {u.text || "(no text extracted)"}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                      {totalReadyChars > 0 && (
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {totalReadyChars.toLocaleString("en-IN")} characters of reference context will ground the
                          retrieval and draft.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Field>
                      <FieldLabel htmlFor="category">Category</FieldLabel>
                      <Select value={category} onValueChange={(v) => setCategory(v as NoteSheetCategory)}>
                        <SelectTrigger id="category" className="w-full">
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
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="requester">Requester name</FieldLabel>
                      <Input
                        id="requester"
                        placeholder="e.g. Dr. A. Sharma"
                        value={requesterName}
                        onChange={(e) => setRequesterName(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="department">Department</FieldLabel>
                      <Input
                        id="department"
                        placeholder="e.g. Electronics & Communication"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
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
                      />
                    </Field>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={pickFiles}
                      aria-label="Attach PDF reference documents"
                    >
                      <Plus data-icon="inline-start" />
                      Attach PDF
                    </Button>
                    <Button onClick={handleGenerate}>
                      <ArrowRight data-icon="inline-start" />
                      Generate draft
                    </Button>
                  </div>
                </FieldGroup>
              </CardContent>
            </Card>
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
          <Card className="mx-auto mt-6 w-full max-w-4xl border-border/80 py-0 shadow-sm">
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
