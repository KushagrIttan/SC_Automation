// Data-access layer for reference-document upload (PDF text/OCR extraction).
import { apiFetch } from "@/lib/api/client"

export interface ExtractResult {
  filename: string
  pages: number
  method: "text_layer" | "ocr" | "ocr_unavailable"
  chars: number
  text: string
  ocr_available: boolean
  detail?: string
}

export interface OcrStatus {
  available: boolean
  path: string | null
  version: string | null
}

export interface UploadedDocumentResult {
  id: string
  filename: string
  content_type: string
  size: number
  created_at: string | null
}

export async function getOcrStatus(): Promise<OcrStatus> {
  return apiFetch<OcrStatus>("/api/documents/ocr-status", { cache: "no-store" })
}

export async function extractPdf(file: File): Promise<ExtractResult> {
  const form = new FormData()
  form.append("file", file)
  return apiFetch<ExtractResult>("/api/documents/extract", {
    method: "POST",
    body: form,
  })
}

export async function uploadNoteSheetDocument(notesheetId: string, file: File): Promise<UploadedDocumentResult> {
  const form = new FormData()
  form.append("file", file)
  return apiFetch<UploadedDocumentResult>(`/api/notesheets/${encodeURIComponent(notesheetId)}/documents`, {
    method: "POST",
    body: form,
  })
}
