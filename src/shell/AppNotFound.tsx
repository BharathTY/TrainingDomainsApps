import { Link } from "react-router-dom"
import { appPath, useApp } from "@/shared/lib/app-context"

export function AppNotFound() {
  const app = useApp()
  return (
    <main className="mx-auto grid max-w-lg gap-3 p-6">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">This page is not part of {app.name}.</p>
      <Link className="text-sm font-medium underline" to={appPath("dashboard")}>
        Back to dashboard
      </Link>
    </main>
  )
}
