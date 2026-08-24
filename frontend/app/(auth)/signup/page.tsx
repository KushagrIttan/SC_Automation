"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SignaturePad } from "@/components/auth/signature-pad"
import { useAuth } from "@/components/providers/auth-provider"
import { BuildBadge } from "@/components/build-badge"

const ROLES = [
  { value: "student", label: "Student", signature: false },
  { value: "club_lead", label: "Club Lead", signature: true },
  { value: "prof", label: "Prof", signature: true },
  { value: "dean", label: "Dean / Director", signature: true },
] as const

export default function SignupPage() {
  const router = useRouter()
  const { signup } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<string>("student")
  const [department, setDepartment] = useState("")
  const [position, setPosition] = useState("")
  const [signature, setSignature] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roleDef = ROLES.find((r) => r.value === role)!
  const needsSignature = roleDef.signature

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (needsSignature && !signature) {
      setError("Please draw your signature before creating the account.")
      return
    }
    setBusy(true)
    try {
      await signup({
        email: email.trim(),
        password,
        name: name.trim(),
        role: role as never,
        department: department.trim() || undefined,
        position: position.trim() || undefined,
        signature_png: needsSignature ? signature! : undefined,
      })
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <BuildBadge />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Create your account</CardTitle>
          <CardDescription>
            Pick the role that matches how you use NotesheetAI. Admin accounts are provisioned by
            the institute and cannot be self-registered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="name">Full name</FieldLabel>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Ananya Sharma" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="role">Role</FieldLabel>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="email">Institutional email</FieldLabel>
              <Input id="email" type="email" placeholder="name@usar.ac.in" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="department">Department / Club</FieldLabel>
                <Input id="department" placeholder="Electronics & Communication" value={department} onChange={(e) => setDepartment(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="position">Position</FieldLabel>
                <Input id="position" placeholder="Professor / B.Tech CSE, 3rd Year" value={position} onChange={(e) => setPosition(e.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" type="password" minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>

            {needsSignature && (
              <Field>
                <FieldLabel>Signature (kept on file and applied to your approvals)</FieldLabel>
                <SignaturePad value={signature} onChange={setSignature} />
              </Field>
            )}

            {error && (
              <p role="alert" className="rounded-sm border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <UserPlus data-icon="inline-start" />}
              Create account
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Already registered?{" "}
              <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
