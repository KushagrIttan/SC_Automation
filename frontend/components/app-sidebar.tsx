"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  BookMarked,
  ClipboardCheck,
  Database,
  FilePlus2,
  FileStack,
  Settings,
  Stamp,
  UsersRound,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { UserSettingsMenu } from "@/components/user-settings-menu"
import { useAuth } from "@/components/providers/auth-provider"
import { ROUTE_ACCESS, ROLE_LABELS } from "@/lib/access"
import type { Role } from "@/lib/api/auth"

const primaryNav = [
  { title: "New Request", href: "/new-request", icon: FilePlus2 },
  { title: "My Note Sheets", href: "/notesheets", icon: FileStack },
  { title: "Approvals", href: "/approvals", icon: ClipboardCheck },
]

const libraryNav = [
  { title: "Precedent Library", href: "/precedents", icon: BookMarked },
  { title: "Knowledge Base", href: "/knowledge-base", icon: Database },
]

const insightsNav = [
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Settings", href: "/settings", icon: Settings },
]

const adminNav = [{ title: "User Management", href: "/users", icon: UsersRound }]

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const role = user?.role as Role | undefined

  function visible(items: { href: string; title: string; icon: unknown }[]) {
    return items.filter((item) => {
      const allowed = ROUTE_ACCESS[item.href]
      return !allowed || (role ? allowed.includes(role) : false)
    })
  }

  const primary = visible(primaryNav)
  const library = visible(libraryNav)
  const insights = visible(insightsNav)
  const admin = role === "admin" ? adminNav : []

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-3 py-3.5 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Link href="/new-request" className="flex min-w-0 items-center gap-2.5 overflow-hidden px-1 group-data-[collapsible=icon]:hidden">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-primary/30 bg-primary/10 text-primary">
              <Stamp className="size-4" />
            </span>
            <span className="flex flex-col overflow-hidden leading-none">
              <span className="truncate font-serif text-sm font-semibold tracking-wide text-sidebar-foreground">
                Sanction Desk
              </span>
              <span className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Office of the Dean
              </span>
            </span>
          </Link>
          <SidebarTrigger className="ml-auto shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] tracking-wider">Draft &amp; Route</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primary.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] tracking-wider">Reference</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {library.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] tracking-wider">Insights</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {insights.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {admin.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="font-mono text-[10px] tracking-wider">Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {admin.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={pathname.startsWith(item.href)}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="px-3 py-3">
        <UserSettingsMenu />
      </SidebarFooter>
    </Sidebar>
  )
}
