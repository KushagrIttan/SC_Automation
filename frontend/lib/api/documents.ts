// Data-access layer for reference-document upload (PDF text/OCR extraction).
import { API_BASE, apiFetch, ApiError, getToken } from "@/lib/api/client"

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

/**
 * Downloads the final approved note-sheet PDF (signed approval copy followed
 * by the uploaded supporting documents). Only the requester may download it,
 * and only after every approval stage is complete — enforced by the backend.
 */
export async function downloadFinalNotesheetPdf(notesheetId: string): Promise<void> {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/notesheets/${encodeURIComponent(notesheetId)}/final-pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  })
  if (!res.ok) {
    let detail = `${res.status}`
    try {
      const data = await res.json()
      detail =
        typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail ?? data)
    } catch {
      /* keep status */
    }
    throw new ApiError(detail, res.status)
  }

  const disposition = res.headers.get("Content-Disposition") ?? ""
  const filename =
    disposition.match(/filename="([^"]+)"/)?.[1] ?? `${notesheetId}-approved-notesheet.pdf`

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
