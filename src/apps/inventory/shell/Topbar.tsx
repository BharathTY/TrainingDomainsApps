import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { MODULES, ROLE_LABEL, type Role } from "@/apps/inventory/config/permissions"
import { useUiStore } from "@/apps/inventory/stores/ui-store"
import { AppTopNav } from "@/shared/AppTopNav"
import { appPath, useApp } from "@/shared/lib/app-context"
import { fetchSession, logout, sessionKeys } from "@/shared/lib/session"

export function Topbar() {
  const app = useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const role = useUiStore((state) => state.role)
  const toggleTheme = useUiStore((state) => state.toggleTheme)
  const session = useQuery({ queryKey: sessionKeys.current, queryFn: fetchSession, retry: false })

  return (
    <AppTopNav
      brand={app.name}
      logoLetter="S"
      homeHref={appPath("dashboard")}
      roleLabel={ROLE_LABEL[role as Role] ?? role}
      userName={session.data?.name}
      items={MODULES.map((module) => ({ id: module.id, label: module.label, href: appPath(module.path) }))}
      unread={0}
      onLogout={() => {
        void logout().finally(() => {
          queryClient.removeQueries({ queryKey: sessionKeys.current })
          navigate(appPath("login"), { replace: true })
        })
      }}
      onSearch={() => undefined}
      onToggleTheme={() => {
        toggleTheme()
        document.documentElement.classList.toggle("dark")
      }}
      onOpenNavigation={() => undefined}
      onCollapseSidebar={() => undefined}
    />
  )
}
