// Data-access layer for reference-document upload (PDF text/OCR extraction).
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8001"

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

export async function getOcrStatus(): Promise<OcrStatus> {
  const res = await fetch(`${API_BASE}/api/documents/ocr-status`, { cache: "no-store" })
  if (!res.ok) throw new Error(`OCR status check failed: ${res.status}`)
  return (await res.json()) as OcrStatus
}

export async function extractPdf(file: File): Promise<ExtractResult> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${API_BASE}/api/documents/extract`, {
    method: "POST",
    body: form,
  })
  if (!res.ok) {
    let detail = `${res.status}`
    try {
      const body = await res.json()
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail)
    } catch {
      /* keep status code */
    }
    throw new Error(detail)
  }
  return (await res.json()) as ExtractResult
}
