import { lazy, Suspense, type ComponentType } from "react"
import { createBrowserRouter, Navigate } from "react-router-dom"
import { APPS } from "@/apps/registry"
import { Launcher } from "@/shell/Launcher"
import { LEGACY_REDIRECTS } from "@/shell/legacy-redirects"

function lazyApp(load: () => Promise<{ default: ComponentType }>) {
  const Page = lazy(load)
  return function AppRoute() {
    return (
      <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading…</p>}>
        <Page />
      </Suspense>
    )
  }
}

export const router = createBrowserRouter([
  { path: "/", element: <Launcher /> },
  ...LEGACY_REDIRECTS.map((item) => ({
    path: item.from,
    element: <Navigate to={item.to} replace />,
  })),
  ...APPS.map((app) => ({
    path: `${app.basePath}/*`,
    Component: lazyApp(app.loadRoutes),
  })),
  { path: "*", element: <Launcher /> },
])
