import { Navigate } from "react-router-dom"
import { ROLES, type Role } from "@/apps/crm/config/permissions"
import { AppShell } from "@/apps/crm/shell/AppShell"
import { useUiStore } from "@/apps/crm/stores/ui-store"
import { useRequiredSession } from "@/shared/SessionGuard"

export function RequireSession() {
  const { query, loginPath } = useRequiredSession()
  const role = useUiStore((state) => state.role)
  const setRole = useUiStore((state) => state.setRole)
  if (query.data && ROLES.includes(query.data.role as Role) && query.data.role !== role) setRole(query.data.role as Role)
  if (query.isLoading) return <p className="p-6 text-sm text-muted-foreground">Checking session…</p>
  if (!query.data) return <Navigate to={loginPath} replace />
  return <AppShell />
}
