import { useEffect } from "react"
import { Link } from "react-router-dom"
import { APP_META } from "@/apps/meta"

const USER_MANAGEMENT_PORTAL = {
  id: "user-management",
  name: "User Management Portal",
  description: "Users, roles, and access.",
  themeColor: "#1d4ed8",
  href: "http://103.182.211.220:5555/",
  external: true,
} as const

type Card = {
  id: string
  name: string
  description: string
  themeColor: string
  href?: string
  external?: boolean
}

const cards: Card[] = APP_META.map((app) => ({
  id: app.id,
  name: app.name,
  description: app.description,
  themeColor: app.themeColor,
  href: app.enabled ? app.basePath : undefined,
}))
cards.splice(cards.findIndex((card) => card.id === "schoolmanagement") + 1, 0, USER_MANAGEMENT_PORTAL)

export function Launcher() {
  useEffect(() => {
    document.title = "Practice apps"
  }, [])

  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-6">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">Practice apps</h1>
        <p className="text-sm text-muted-foreground">Choose an app. Each one signs in on its own.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((app) => (
          <li key={app.id} data-testid={`app-card-${app.id}`} className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-md text-xs font-semibold text-white" style={{ background: app.themeColor }}>
                {app.name.slice(0, 1)}
              </span>
              <h2 className="text-sm font-semibold">
                {app.href ? (
                  app.external ? (
                    <a className="underline" href={app.href}>
                      {app.name}
                    </a>
                  ) : (
                    <Link className="underline" to={app.href}>
                      {app.name}
                    </Link>
                  )
                ) : (
                  app.name
                )}
              </h2>
            </div>
            <p className="mb-4 min-h-10 text-sm text-muted-foreground">{app.description}</p>
            {app.href ? null : (
              <button type="button" className="text-sm text-muted-foreground" disabled>
                Coming soon
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}
