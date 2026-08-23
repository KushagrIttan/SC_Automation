"use client"

import { useEffect, useState } from "react"
import { BrainCircuit, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  fetchLLMSettings,
  updateLLMSettings,
  type LLMSettings,
} from "@/lib/api/settings"

type Provider = "ollama" | "gemini"

export default function SettingsPage() {
  const [settings, setSettings] = useState<LLMSettings | null>(null)
  const [provider, setProvider] = useState<Provider>("ollama")
  const [geminiKey, setGeminiKey] = useState("")
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash")
  const [ollamaModel, setOllamaModel] = useState("qwen2.5-coder:3b")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLLMSettings()
      .then((s) => {
        setSettings(s)
        setProvider(s.provider)
        setGeminiModel(s.gemini_model)
        setOllamaModel(s.ollama_model)
      })
      .catch(() => toast.error("Could not load LLM settings from the backend."))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await updateLLMSettings({
        provider,
        gemini_api_key: geminiKey || undefined,
        gemini_model: geminiModel || undefined,
        ollama_model: ollamaModel || undefined,
      })
      toast.success(
        `Brain switched to ${res.provider === "gemini" ? "Gemini" : "Ollama"} (${res.model}).`
      )
      setSettings((prev) =>
        prev ? { ...prev, provider: res.provider as Provider, model: res.model } : prev
      )
      setGeminiKey("")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed."
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight text-primary">Settings</h1>
        <p className="text-sm text-muted-foreground">Loading model configuration…</p>
      </div>
    )
  }

  const isGemini = provider === "gemini"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
          <BrainCircuit className="size-4" />
          Drafting engine
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-primary">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Choose which model powers note-sheet drafting. Ollama runs locally and free; Gemini
          uses a Google AI API key. The change applies to the backend at runtime.
        </p>
      </div>

      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-primary">Brain provider</CardTitle>
          <CardDescription>Select Ollama (local) or Gemini (Google AI).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setProvider("ollama")}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                !isGemini
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              <Sparkles className="mt-0.5 size-5 text-primary" />
              <span>
                <span className="block text-sm font-semibold text-primary">Ollama (local)</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Runs on your machine. No API key, no cost.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setProvider("gemini")}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                isGemini
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              <BrainCircuit className="mt-0.5 size-5 text-primary" />
              <span>
                <span className="block text-sm font-semibold text-primary">Gemini (Google AI)</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Cloud model. Requires an API key.
                </span>
              </span>
            </button>
          </div>

          <Separator />

          {isGemini ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="gemini-key">Gemini API key</Label>
                <Input
                  id="gemini-key"
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder={
                    settings?.gemini_api_key_set
                      ? "•••••••• (already set — leave blank to keep)"
                      : "Paste your Google AI API key"
                  }
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Get one at makersuite.google.com/app/apikey. Stored only in the backend process.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="gemini-model">Gemini model</Label>
                <Input
                  id="gemini-model"
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  placeholder="gemini-2.0-flash"
                  className="bg-background"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="ollama-model">Ollama model</Label>
              <Input
                id="ollama-model"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                placeholder="qwen2.5-coder:3b"
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Must be pulled locally (e.g. <code>ollama pull qwen2.5-coder:3b</code>) and Ollama
                must be running.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Current active:{" "}
              <span className="font-medium text-primary">
                {settings?.provider === "gemini" ? "Gemini" : "Ollama"}
              </span>{" "}
              ({settings?.model})
            </span>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save provider"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
