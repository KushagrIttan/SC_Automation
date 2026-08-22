"use client"

import { useState } from "react"
import { ArrowRight, Loader2, Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupTextarea } from "@/components/ui/input-group"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { NoteSheetDetail } from "@/components/notesheet/notesheet-detail"
import { ApprovalStepper } from "@/components/notesheet/approval-stepper"
import { generateDraft } from "@/lib/generate-draft"
import type { NoteSheet, NoteSheetCategory } from "@/lib/types"
import { toast } from "sonner"

const categories: NoteSheetCategory[] = [
  "Lab Equipment Purchase",
  "Event/Fest Expenditure",
  "Guest Faculty Honorarium",
  "Student Travel/TA-DA",
  "Club Budget",
]

export function NewRequestForm() {
  const [prompt, setPrompt] = useState("")
  const [category, setCategory] = useState<NoteSheetCategory>("Lab Equipment Purchase")
  const [department, setDepartment] = useState("")
  const [amount, setAmount] = useState("")
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState<NoteSheet | null>(null)
  const [selectedApproverIds, setSelectedApproverIds] = useState<string[]>([])

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error("Describe the sanction you need before generating a draft.")
      return
    }
    setGenerating(true)
    setDraft(null)
    try {
      const result = await generateDraft({
        prompt,
        category,
        department,
        amountHint: amount ? Number(amount) : undefined,
      })
      setDraft(result)
      setSelectedApproverIds(
        result.approvalStages.flatMap((stage) =>
          stage.approvers.filter((approver) => approver.recommended).map((approver) => approver.id),
        ),
      )
      toast.success("Draft generated with citations and budget breakdown.")
    } catch (error) {
      console.error(error)
      toast.error("Failed to generate draft. Please check your backend connection.")
    } finally {
      setGenerating(false)
    }
  }

  }

  function handleSubmitForApproval() {
    toast.success("Note sheet submitted for departmental review.", {
      description: `${selectedApproverIds.length} approver${selectedApproverIds.length === 1 ? "" : "s"} selected for routing.`,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Describe the sanction you need
          </CardTitle>
          <CardDescription>
            Write it the way you would explain it to a colleague. The draft is generated against institutional rules
            and past precedents, then routed to the required approvers.
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
                  className="min-h-28 font-sans text-sm"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </InputGroup>
              <FieldDescription>Mention items, quantities, vendors, or urgency — the more detail, the sharper the citations.</FieldDescription>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                <FieldLabel htmlFor="department">Department</FieldLabel>
                <Input
                  id="department"
                  placeholder="e.g. Robotics & Automation"
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

            <div className="flex justify-end">
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <ArrowRight data-icon="inline-start" />}
                {generating ? "Drafting…" : "Generate draft"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {generating && <GeneratingSkeleton />}

      {draft && !generating && (
        <NoteSheetDetail
          noteSheet={draft}
          showApprovalChain={false}
          approvalChainBelowJustification
          approvalChain={
            <ApprovalStepper
              stages={draft.approvalStages}
              selectedApproverIds={selectedApproverIds}
              onSelectedApproverIdsChange={setSelectedApproverIds}
            />
          }
          headerAction={
            <Button size="sm" onClick={handleSubmitForApproval}>
              <Send data-icon="inline-start" />
              Submit for approval
            </Button>
          }
        />
      )}
    </div>
  )
}

function GeneratingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}
