import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { DashboardHeaderTitle } from "@/components/dashboard-header-title"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="min-h-svh bg-muted/35">
      <AppSidebar />
      <SidebarInset className="bg-transparent">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-center bg-sidebar px-4 text-sidebar-foreground md:px-6">
          <DashboardHeaderTitle />
        </header>
        <main className="min-w-0 flex-1 px-3 py-4 md:px-6 md:py-6">
          <div className="mx-auto min-h-[calc(100svh-6.5rem)] max-w-[1500px] rounded-xl border border-border bg-background p-4 shadow-sm md:p-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
