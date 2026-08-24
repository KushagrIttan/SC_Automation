// LLM provider settings — admin-only endpoints.
import { apiFetch } from "@/lib/api/client"

export interface LLMSettings {
  provider: string
  model: string
  ollama_base_url: string
  ollama_model: string
  gemini_model: string
  gemini_api_key_set: boolean
}

export async function fetchLLMSettings(): Promise<LLMSettings> {
  return apiFetch<LLMSettings>("/api/settings/llm", { cache: "no-store" })
}

export interface UpdateLLMSettingsInput {
  provider: string
  gemini_api_key?: string
  gemini_model?: string
  ollama_base_url?: string
  ollama_model?: string
}

export async function updateLLMSettings(input: UpdateLLMSettingsInput) {
  return apiFetch<{ status: string; provider: string; model: string }>(
    "/api/settings/llm",
    { method: "PUT", json: input }
  )
}
