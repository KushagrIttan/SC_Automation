"use client"

import { LogOut, Moon, Sun, UserRound } from "lucide-react"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/providers/auth-provider"
import { ROLE_LABELS } from "@/lib/access"
import type { Role } from "@/lib/api/auth"

export function UserSettingsMenu() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme !== "light"
  const { user, logout } = useAuth()

  const name = user?.name ?? "Not signed in"
  const subtitle = user
    ? [user.department ?? user.position ?? "", ROLE_LABELS[user.role as Role] ?? user.role]
        .filter(Boolean)
        .join(" · ")
    : ""
  const initials =
    name
      .split(" ")
      .filter((p) => /[A-Za-z]/.test(p[0] ?? ""))
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-10 w-full justify-start gap-2 px-1.5 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" aria-label="Open account menu">
            <Avatar size="sm"><AvatarFallback className="bg-sidebar-accent font-mono font-semibold text-sidebar-accent-foreground">{initials}</AvatarFallback></Avatar>
            <span className="flex min-w-0 flex-col overflow-hidden text-left leading-none group-data-[collapsible=icon]:hidden">
              <span className="truncate text-xs font-medium">{name}</span>
              <span className="mt-1 truncate font-mono text-[9px] uppercase tracking-wide text-sidebar-foreground/65">{subtitle}</span>
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="start" side="top" className="w-64 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-2">
            <span className="block truncate text-sm font-medium text-foreground">{name}</span>
            <span className="mt-0.5 block truncate font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">{subtitle}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>{isDark ? <Sun /> : <Moon />}Use {isDark ? "light" : "dark"} theme</DropdownMenuItem>
        <DropdownMenuItem onClick={logout}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
