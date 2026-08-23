// LLM provider settings — talks to the FastAPI backend.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8001"

export interface LLMSettings {
  provider: "ollama" | "gemini"
  model: string
  ollama_base_url: string
  ollama_model: string
  gemini_model: string
  gemini_api_key_set: boolean
}

export async function fetchLLMSettings(): Promise<LLMSettings> {
  const res = await fetch(`${API_BASE}/api/settings/llm`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Failed to fetch LLM settings: ${res.status}`)
  return (await res.json()) as LLMSettings
}

export interface UpdateLLMSettingsInput {
  provider: "ollama" | "gemini"
  gemini_api_key?: string
  gemini_model?: string
  ollama_base_url?: string
  ollama_model?: string
}

export async function updateLLMSettings(
  input: UpdateLLMSettingsInput
): Promise<{ status: string; provider: string; model: string }> {
  const res = await fetch(`${API_BASE}/api/settings/llm`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(msg || `Update failed: ${res.status}`)
  }
  return (await res.json()) as { status: string; provider: string; model: string }
}
