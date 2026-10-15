import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ROLE_LABEL, type Role, visibleModules } from "@/apps/hospital/config/permissions"
import { Sidebar } from "@/apps/hospital/shell/Sidebar"
import { useUiStore } from "@/apps/hospital/stores/ui-store"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AppTopNav } from "@/shared/AppTopNav"
import { appPath } from "@/shared/lib/app-context"
import { api } from "@/shared/lib/api-client"
import { fetchSession, logout, sessionKeys } from "@/shared/lib/session"

export function Topbar() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const role = useUiStore((state) => state.role)
  const toggleTheme = useUiStore((state) => state.toggleTheme)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const [mobileNav, setMobileNav] = useState(false)
  const session = useQuery({ queryKey: sessionKeys.current, queryFn: fetchSession, retry: false })
  const notifications = useQuery({
    queryKey: ["hospital", "notifications"],
    queryFn: () => api<{ id: string }[]>("/api/notifications"),
  })
  const items = visibleModules(role as Role).map((module) => ({
    id: module.id,
    label: module.label,
    href: appPath(module.path),
    group: module.group,
  }))

  return (
    <>
      <AppTopNav
        brand="MediCare HMS"
        logoLetter="M"
        homeHref={appPath("dashboard")}
        roleLabel={ROLE_LABEL[role as Role] ?? role}
        userName={session.data?.name}
        items={items}
        unread={notifications.data?.length ?? 0}
        onLogout={() => {
          void logout().finally(() => {
            queryClient.removeQueries({ queryKey: sessionKeys.current })
            navigate(appPath("login"), { replace: true })
          })
        }}
        onSearch={() => {
          const q = window.prompt("Search modules")
          if (!q) return
          const match = items.find((item) => item.label.toLowerCase().includes(q.toLowerCase()))
          if (match) navigate(match.href)
          else window.alert("No module matched")
        }}
        onToggleTheme={() => {
          toggleTheme()
          document.documentElement.classList.toggle("dark")
        }}
        onOpenNavigation={() => setMobileNav(true)}
        onCollapseSidebar={toggleSidebar}
      />
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>MediCare modules</SheetDescription>
          </SheetHeader>
          <Sidebar onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
