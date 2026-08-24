import { apiFetch, setToken, clearToken } from "@/lib/api/client"

export type Role = "student" | "club_lead" | "prof" | "dean" | "admin"

export interface SessionUser {
  id: number
  email: string
  name: string
  role: Role
  department: string | null
  position: string | null
  has_signature: boolean
  active: boolean
}

export interface SignupInput {
  email: string
  password: string
  name: string
  role: Exclude<Role, "admin">
  department?: string
  position?: string
  signature_png?: string
}

export async function login(email: string, password: string): Promise<SessionUser> {
  const res = await apiFetch<{ token: string; user: SessionUser }>("/api/auth/login", {
    method: "POST",
    json: { email, password },
  })
  setToken(res.token)
  return res.user
}

export async function signup(input: SignupInput): Promise<SessionUser> {
  const res = await apiFetch<{ token: string; user: SessionUser }>("/api/auth/signup", {
    method: "POST",
    json: input,
  })
  setToken(res.token)
  return res.user
}

export async function fetchMe(): Promise<SessionUser> {
  return apiFetch<SessionUser>("/api/auth/me", { cache: "no-store" })
}

export function logout() {
  clearToken()
}
