import { useQuery } from "@tanstack/react-query"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useApp } from "@/shared/lib/app-context"
import { fetchSession, sessionKeys } from "@/shared/lib/session"

export function useRequiredSession() {
  const location = useLocation()
  const app = useApp()
  const query = useQuery({ queryKey: sessionKeys.current, queryFn: fetchSession, retry: false })
  const returnUrl = encodeURIComponent(`${location.pathname}${location.search}`)
  const loginPath = `${app.basePath}/login?returnUrl=${returnUrl}`
  return { query, loginPath }
}

export function SessionGuard() {
  const { query, loginPath } = useRequiredSession()
  if (query.isLoading) return <p className="p-6 text-sm text-muted-foreground">Checking session…</p>
  if (!query.data) return <Navigate to={loginPath} replace />
  return <Outlet />
}
