import { useEffect, useState } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Sidebar } from "@/apps/banking/shell/Sidebar"
import { Topbar } from "@/apps/banking/shell/Topbar"
import { useUiStore } from "@/apps/banking/stores/ui-store"
import { CookieBanner } from "@/shared/CookieBanner"
import { SessionTimeout } from "@/shared/SessionTimeout"
import { appPath } from "@/shared/lib/app-context"
import { logout, sessionKeys } from "@/shared/lib/session"

export function AppShell() {
  const theme = useUiStore((state) => state.theme)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [cookieOk, setCookieOk] = useState(() => localStorage.getItem("banking-cookie-consent") === "1")
  const [timeoutOpen, setTimeoutOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  useEffect(() => {
    const id = window.setTimeout(() => setTimeoutOpen(true), 10 * 60 * 1000)
    const bump = () => {
      window.clearTimeout(id)
    }
    window.addEventListener("pointerdown", bump, { once: true })
    return () => {
      window.clearTimeout(id)
      window.removeEventListener("pointerdown", bump)
    }
  }, [])

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
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
        Demo National Bank — synthetic training data only. Not a real financial institution.
      </footer>
      {cookieOk ? null : (
        <CookieBanner
          onAccept={() => {
            localStorage.setItem("banking-cookie-consent", "1")
            setCookieOk(true)
          }}
        />
      )}
      <SessionTimeout
        open={timeoutOpen}
        onContinue={() => setTimeoutOpen(false)}
        onSignOut={() => {
          void logout().finally(() => {
            queryClient.removeQueries({ queryKey: sessionKeys.current })
            navigate(appPath("login"), { replace: true })
          })
        }}
      />
    </div>
  )
}
