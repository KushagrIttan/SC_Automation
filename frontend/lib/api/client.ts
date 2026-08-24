// Central authenticated fetch: injects the JWT and base URL.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8001"

const TOKEN_KEY = "nsai_token"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, ...rest } = init ?? {}
  const headers = new Headers(rest.headers)
  const token = getToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  let body = rest.body
  if (json !== undefined) {
    headers.set("Content-Type", "application/json")
    body = JSON.stringify(json)
  }
  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers, body })
  if (!res.ok) {
    let detail = `${res.status}`
    try {
      const data = await res.json()
      detail =
        typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail ?? data)
    } catch {
      /* keep status text */
    }
    throw new ApiError(detail, res.status)
  }
  return (await res.json()) as T
}

export { API_BASE }
