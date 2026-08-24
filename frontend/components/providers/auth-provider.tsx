"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchMe, login as apiLogin, logout as apiLogout, type Role, type SessionUser, signup as apiSignup } from "@/lib/api/auth"

interface AuthContextValue {
  user: SessionUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<SessionUser>
  signup: (input: Parameters<typeof apiSignup>[0]) => Promise<SessionUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    import("@/lib/api/client")
      .then(({ getToken }) => {
        if (!getToken()) {
          setLoading(false)
          return
        }
        return fetchMe()
          .then((me) => {
            if (!cancelled) setUser(me)
          })
          .catch(() => {
            apiLogout()
          })
          .finally(() => {
            if (!cancelled) setLoading(false)
          })
      })
      .catch(() => setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const me = await apiLogin(email, password)
      setUser(me)
      router.push("/")
      return me
    },
    [router]
  )

  const signup = useCallback(
    async (input: Parameters<typeof apiSignup>[0]) => {
      const me = await apiSignup(input)
      setUser(me)
      router.push("/")
      return me
    },
    [router]
  )

  const logout = useCallback(() => {
    apiLogout()
    setUser(null)
    router.push("/login")
  }, [router])

  const value = useMemo(
    () => ({ user, loading, login, signup, logout }),
    [user, loading, login, signup, logout]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
