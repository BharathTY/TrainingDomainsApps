import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Route, Routes, useNavigate } from "react-router-dom"
import { appMeta } from "@/apps/meta"
import { AppNotFound } from "@/shell/AppNotFound"
import { Button } from "@/components/ui/button"
import { SessionGuard } from "@/shared/SessionGuard"
import { SessionLogin } from "@/shared/SessionLogin"
import type { LoginAccount } from "@/shared/LoginScreen"
import { appPath, AppProvider, useApp } from "@/shared/lib/app-context"
import { logout, sessionKeys, fetchSession } from "@/shared/lib/session"

function StubDashboard() {
  const app = useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useQuery({ queryKey: sessionKeys.current, queryFn: fetchSession, retry: false })

  return (
    <main className="mx-auto grid max-w-3xl gap-4 p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{app.name}</p>
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          data-testid="logout"
          onClick={() => {
            void logout().finally(() => {
              queryClient.removeQueries({ queryKey: sessionKeys.current })
              navigate(appPath("login"), { replace: true })
            })
          }}
        >
          Log out
        </Button>
      </header>
      <p className="text-sm text-muted-foreground">
        Signed in as {session.data?.name ?? "…"}. {app.description}
      </p>
    </main>
  )
}

export function PracticeApp({ appId, users }: { appId: string; users: LoginAccount[] }) {
  return (
    <AppProvider app={appMeta(appId)}>
      <Routes>
        <Route index element={<SessionLogin users={users} />} />
        <Route path="login" element={<SessionLogin users={users} />} />
        <Route element={<SessionGuard />}>
          <Route path="dashboard" element={<StubDashboard />} />
          <Route path="*" element={<AppNotFound />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
