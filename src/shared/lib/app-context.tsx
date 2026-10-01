import { createContext, useContext, useEffect, type ReactNode } from "react"
import type { AppMeta } from "@/apps/meta"
import { bindActiveApp } from "@/shared/lib/active-app"

export { activeApp, activeAppId, appPath } from "@/shared/lib/active-app"

const AppContext = createContext<AppMeta | null>(null)

export function AppProvider({ app, children }: { app: AppMeta; children: ReactNode }) {
  bindActiveApp(app)

  useEffect(() => {
    document.title = app.name
    const icon = document.querySelector<HTMLLinkElement>("link[rel='icon']") ?? document.createElement("link")
    icon.rel = "icon"
    icon.type = "image/svg+xml"
    icon.href = `/favicons/${app.id}.svg`
    if (!icon.parentElement) document.head.appendChild(icon)
    const theme = document.querySelector<HTMLMetaElement>("meta[name='theme-color']") ?? document.createElement("meta")
    theme.name = "theme-color"
    theme.content = app.themeColor
    if (!theme.parentElement) document.head.appendChild(theme)
    document.documentElement.style.setProperty("--app-accent", app.themeColor)
    document.documentElement.style.setProperty("--app-primary", app.themeColor)
    try {
      const raw = localStorage.getItem("sms-ui")
      const mode = raw ? (JSON.parse(raw) as { state?: { theme?: string } }).state?.theme : "light"
      document.documentElement.classList.toggle("dark", mode === "dark")
    } catch {
      /* keep the default theme */
    }
  }, [app])

  return <AppContext.Provider value={app}>{children}</AppContext.Provider>
}

export function useApp() {
  const app = useContext(AppContext)
  if (!app) throw new Error("useApp must be used inside an app")
  return app
}
