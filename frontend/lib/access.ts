// Which dashboard routes each role may open. Backend enforces the same
// splits server-side; this drives nav visibility + client redirects.
import type { Role } from "@/lib/api/auth"

export const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  club_lead: "Club Lead",
  prof: "Prof",
  dean: "Dean / Director",
  admin: "Admin / Developer",
}

const ALL: Role[] = ["student", "club_lead", "prof", "dean", "admin"]

export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/new-request": ALL,
  "/notesheets": ALL,
  "/approvals": ["prof", "dean", "admin"],
  "/precedents": ["prof", "dean", "admin"],
  "/analytics": ["dean", "admin"],
  "/knowledge-base": ["admin"],
  "/settings": ["admin"],
  "/users": ["admin"],
}

export function canAccess(role: Role | undefined, path: string): boolean {
  if (!role) return false
  const allowed = ROUTE_ACCESS[path]
  if (!allowed) return true // pages not in the map are open to all logged-in users
  return allowed.includes(role)
}
