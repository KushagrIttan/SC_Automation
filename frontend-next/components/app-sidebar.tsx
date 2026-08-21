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
  Stamp,
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
} from "@/components/ui/sidebar"

const primaryNav = [
  { title: "New Request", href: "/new-request", icon: FilePlus2 },
  { title: "My Note Sheets", href: "/notesheets", icon: FileStack },
  { title: "Approvals", href: "/approvals", icon: ClipboardCheck },
]

const libraryNav = [
  { title: "Precedent Library", href: "/precedents", icon: BookMarked },
  { title: "Knowledge Base", href: "/knowledge-base", icon: Database },
]

const insightsNav = [{ title: "Analytics", href: "/analytics", icon: BarChart3 }]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3.5">
        <Link href="/new-request" className="flex items-center gap-2.5 overflow-hidden px-1">
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] tracking-wider">Draft &amp; Route</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryNav.map((item) => (
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
              {libraryNav.map((item) => (
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
              {insightsNav.map((item) => (
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
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2.5 overflow-hidden rounded-sm px-1 py-1">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[11px] text-secondary-foreground">
            AB
          </span>
          <span className="flex flex-col overflow-hidden leading-none">
            <span className="truncate text-xs font-medium">Ananya Bhardwaj</span>
            <span className="truncate font-mono text-[10px] text-muted-foreground">Student Cell · Requester</span>
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
