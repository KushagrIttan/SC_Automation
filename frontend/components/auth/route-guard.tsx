"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { canAccess, ROLE_LABELS } from "@/lib/access"
import type { Role } from "@/lib/api/auth"

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const allowed = canAccess(user?.role as Role | undefined, pathname)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (!allowed) {
      // Signed in but not permitted for this route — send them home.
      toastOnce(user.role)
      router.replace("/")
    }
  }, [loading, user, allowed, router])

  if (loading || !user || !allowed) return null
  return <>{children}</>
}

let warned: string | null = null
function toastOnce(role: string) {
  if (warned === role) return
  warned = role
  import("sonner").then(({ toast }) =>
    toast.error(`Your role (${ROLE_LABELS[role as Role]}) does not have access to that page.`)
  )
}
