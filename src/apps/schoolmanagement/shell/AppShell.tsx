import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { Outlet } from "react-router-dom"
import { CommandPalette } from "@/apps/schoolmanagement/shell/CommandPalette"
import { Topbar } from "@/apps/schoolmanagement/shell/Topbar"
import { applyPermissionMatrix } from "@/apps/schoolmanagement/config/permissions"
import { fetchPermissions } from "@/apps/schoolmanagement/features/settings/api"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function AppShell() {
  const theme = useUiStore((state) => state.theme)
  const setCommandOpen = useUiStore((state) => state.setCommandOpen)
  const permissionVersion = useUiStore((state) => state.permissionVersion)
  const permissions = useQuery({ queryKey: ["settings", "permissions"], queryFn: fetchPermissions, staleTime: Infinity })

  useEffect(() => {
    if (!permissions.data) return
    applyPermissionMatrix(permissions.data)
    useUiStore.getState().bumpPermissions()
  }, [permissions.data])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [setCommandOpen])

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground" data-permissions={permissionVersion}>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Topbar />
      <main id="content" tabIndex={-1} className="min-w-0 flex-1 p-3 outline-none md:p-4">
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  )
}
