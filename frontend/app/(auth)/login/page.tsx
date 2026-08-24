"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/providers/auth-provider"
import { BuildBadge } from "@/components/build-badge"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password)
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <BuildBadge />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-serif text-xl">NotesheetAI</CardTitle>
          <CardDescription>Sign in to draft, track and approve note sheets.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="email">Institutional email</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@usar.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            {error && (
              <p role="alert" className="rounded-sm border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <LogIn data-icon="inline-start" />}
              Sign in
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              No account?{" "}
              <Link href="/signup" className="font-medium text-primary underline-offset-2 hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
