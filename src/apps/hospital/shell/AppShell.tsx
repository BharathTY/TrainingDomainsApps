import { useEffect } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "@/apps/hospital/shell/Sidebar"
import { Topbar } from "@/apps/hospital/shell/Topbar"
import { useUiStore } from "@/apps/hospital/stores/ui-store"

export function AppShell() {
  const theme = useUiStore((state) => state.theme)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground">
        Skip to content
      </a>
      <Topbar />
      <div className="flex min-h-0 flex-1">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main id="content" tabIndex={-1} className="min-w-0 flex-1 p-3 outline-none md:p-4">
          <Outlet />
        </main>
      </div>
      <footer className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        MediCare HMS — synthetic training data only. Not for clinical use.
      </footer>
    </div>
  )
}
