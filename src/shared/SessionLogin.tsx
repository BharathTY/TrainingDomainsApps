import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { LoginScreen, type LoginAccount } from "@/shared/LoginScreen"
import { appPath, useApp } from "@/shared/lib/app-context"
import { ApiError } from "@/shared/lib/api-client"
import { fetchSession, login, sessionKeys, type SessionUser } from "@/shared/lib/session"

function safeReturn(base: string, value: string | null) {
  if (!value || !value.startsWith(`${base}/`) || value.startsWith(`${base}/login`)) return appPath("dashboard")
  return value
}

export function SessionLogin({ users, onSignedIn }: { users: LoginAccount[]; onSignedIn?: (user: SessionUser) => void }) {
  const app = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const session = useQuery({ queryKey: sessionKeys.current, queryFn: fetchSession, retry: false })
  const [formError, setFormError] = useState("")
  const destination = safeReturn(app.basePath, new URLSearchParams(location.search).get("returnUrl"))

  if (session.isLoading) return <p className="p-6 text-sm text-muted-foreground">Checking session…</p>
  if (session.data) return <Navigate to={appPath("dashboard")} replace />

  return (
    <LoginScreen
      users={users}
      error={formError}
      onSubmit={async (values) => {
        setFormError("")
        try {
          const user = await login(values)
          onSignedIn?.(user)
          queryClient.setQueryData(sessionKeys.current, user)
          navigate(destination, { replace: true })
        } catch (error) {
          setFormError(error instanceof ApiError ? error.message : "Could not sign in")
        }
      }}
    />
  )
}
