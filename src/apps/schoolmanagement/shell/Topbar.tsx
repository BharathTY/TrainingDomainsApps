import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Sidebar } from "@/apps/schoolmanagement/shell/Sidebar"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ROLE_LABEL, visibleModules } from "@/apps/schoolmanagement/config/permissions"
import { logout, sessionKeys } from "@/apps/schoolmanagement/features/auth/api"
import { AppTopNav } from "@/shared/AppTopNav"
import { appPath, useApp } from "@/shared/lib/app-context"
import type { SessionUser } from "@/apps/schoolmanagement/features/auth/demo-users"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function Topbar() {
  const role = useUiStore((state) => state.role)
  const permissionVersion = useUiStore((state) => state.permissionVersion)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const app = useApp()
  const session = queryClient.getQueryData<SessionUser>(sessionKeys.current)
  const toggleTheme = useUiStore((state) => state.toggleTheme)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const setCommandOpen = useUiStore((state) => state.setCommandOpen)
  const [mobileNav, setMobileNav] = useState(false)
  const [unread, setUnread] = useState(3)
  void permissionVersion
  const items = visibleModules(role).map((module) => ({
    id: module.id,
    label: module.label,
    href: appPath(module.path),
    group: module.group,
  }))

  function signOut() {
    void logout().finally(() => {
      queryClient.removeQueries({ queryKey: sessionKeys.current })
      navigate(appPath("login"), { replace: true })
    })
  }

  return (
    <>
      <AppTopNav
        brand={app.name}
        logoLetter={app.name.slice(0, 1)}
        homeHref={appPath("dashboard")}
        roleLabel={ROLE_LABEL[role]}
        userName={session?.name}
        items={items}
        unread={unread}
        onLogout={signOut}
        onSearch={() => setCommandOpen(true)}
        onToggleTheme={toggleTheme}
        onOpenNavigation={() => {
          setUnread(0)
          setMobileNav(true)
        }}
        onCollapseSidebar={toggleSidebar}
      />
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Modules for the current role.</SheetDescription>
          </SheetHeader>
          <Sidebar onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
