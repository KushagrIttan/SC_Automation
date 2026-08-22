"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Bot, Save, Loader2, KeyRound } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchApi } from "@/lib/api-client"

interface LLMSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LLMSettings({ open, onOpenChange }: LLMSettingsProps) {
  const [provider, setProvider] = useState("ollama")
  const [geminiApiKey, setGeminiApiKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setLoading(true)
      fetchApi<any>("/api/settings/llm")
        .then((data) => {
          setProvider(data.provider || "ollama")
          if (data.gemini_api_key_set) {
            setGeminiApiKey("••••••••••••••••") // obfuscated
          }
        })
        .catch((err) => {
          console.error("Failed to fetch LLM settings", err)
          toast.error("Could not load current AI settings")
        })
        .finally(() => setLoading(false))
    }
  }, [open])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: any = { provider }
      
      // Only send the API key if the user actually typed a real key (not the obfuscated placeholder)
      if (provider === "gemini" && geminiApiKey && geminiApiKey !== "••••••••••••••••") {
        payload.gemini_api_key = geminiApiKey
      }

      const res = await fetchApi<any>("/api/settings/llm", {
        method: "PUT",
        body: JSON.stringify(payload),
      })
      
      toast.success(`Successfully switched to ${res.provider} (${res.model})`)
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast.error("Failed to update AI settings. Make sure backend is running.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="size-5" />
            AI Backend Settings
          </DialogTitle>
          <DialogDescription>
            Choose the model that generates your note sheets.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="provider">LLM Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ollama">Ollama (Local / CPU)</SelectItem>
                  <SelectItem value="gemini">Google Gemini (Cloud)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {provider === "gemini" && (
              <div className="grid gap-2">
                <Label htmlFor="api-key" className="flex items-center gap-1.5">
                  <KeyRound className="size-3.5" />
                  API Key
                </Label>
                <Input 
                  id="api-key" 
                  type="password" 
                  placeholder="AIzaSy..." 
                  value={geminiApiKey} 
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your key is sent directly to the local backend and never exposed.
                </p>
              </div>
            )}
            
            {provider === "ollama" && (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <p>Currently configured to use the local Ollama instance running at <code>http://localhost:11434</code>.</p>
                <p className="mt-2">Ensure Ollama is running and the model is pulled.</p>
              </div>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
