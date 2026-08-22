"use client"

import { Bell, Check, Moon, Save, Sun, UserRound, Bot } from "lucide-react"
import { useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LLMSettings } from "./llm-settings"

export function UserSettingsMenu() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme !== "light"
  const [profileOpen, setProfileOpen] = useState(false)
  const [llmSettingsOpen, setLlmSettingsOpen] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [name, setName] = useState("Ananya Bhardwaj")
  const [department, setDepartment] = useState("Student Cell")
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()

  return (
    <>
    <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="h-10 w-full justify-start gap-2 px-1.5 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" aria-label="Open user settings">
              <Avatar size="sm"><AvatarFallback className="bg-sidebar-accent font-mono font-semibold text-sidebar-accent-foreground">{initials}</AvatarFallback></Avatar>
              <span className="flex min-w-0 flex-col overflow-hidden text-left leading-none group-data-[collapsible=icon]:hidden"><span className="truncate text-xs font-medium">{name}</span><span className="mt-1 truncate font-mono text-[9px] uppercase tracking-wide text-sidebar-foreground/65">{department} · Requester</span></span>
            </Button>
          }
        />
        <DropdownMenuContent align="start" side="top" className="w-64 p-1.5">
          <DropdownMenuLabel className="px-2 py-2"><span className="block text-sm font-medium text-foreground">{name}</span><span className="mt-0.5 block font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">{department} · Requester</span></DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setProfileOpen(true)}><UserRound />Edit profile</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setNotificationsEnabled((enabled) => !enabled)}>
            <Bell />
            Approval notifications
            {notificationsEnabled && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLlmSettingsOpen(true)}><Bot />AI Backend Settings</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>{isDark ? <Sun /> : <Moon />}Use {isDark ? "light" : "dark"} theme</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit profile</DialogTitle><DialogDescription>These details are saved locally in this prototype.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-2"><div className="grid gap-2"><Label htmlFor="profile-name">Display name</Label><Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="profile-department">Department</Label><Input id="profile-department" value={department} onChange={(event) => setDepartment(event.target.value)} /></div></div>
        <DialogFooter><Button onClick={() => { setProfileOpen(false); toast.success("Profile preferences saved locally.") }}><Save data-icon="inline-start" />Save changes</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <LLMSettings open={llmSettingsOpen} onOpenChange={setLlmSettingsOpen} />
    </>
  )
}
