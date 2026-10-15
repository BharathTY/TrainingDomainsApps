import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { loadDashboard } from "@/apps/assets/features/catalog/api"
import { appPath } from "@/shared/lib/app-context"
import { Button } from "@/components/ui/button"

function Kpi({ label, value, to }: { label: string; value: string | number; to?: string }) {
  const body = (
    <article className="rounded-lg border border-border bg-card p-4" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </article>
  )
  return to ? <Link to={to} className="block hover:opacity-90">{body}</Link> : body
}

export function DashboardPage() {
  const query = useQuery({ queryKey: ["assets", "dashboard"], queryFn: loadDashboard })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Enterprise asset register overview from persisted synthetic data.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" asChild>
            <Link to={appPath("assets")} data-testid="quick-register-asset">Register asset</Link>
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to={appPath("maintenance")} data-testid="quick-schedule-maintenance">Schedule maintenance</Link>
          </Button>
        </div>
      </header>
      {query.isLoading ? <p className="text-sm text-muted-foreground" aria-live="polite">Loading dashboard…</p> : null}
      {query.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load dashboard.{" "}
          <button type="button" className="underline" onClick={() => void query.refetch()}>Retry</button>
        </p>
      ) : null}
      {query.data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key metrics">
            <Kpi label="Total assets" value={query.data.totalAssets} to={appPath("assets")} />
            <Kpi label="Active" value={query.data.active} to={appPath("assets")} />
            <Kpi label="Assigned" value={query.data.assigned} to={appPath("assignments")} />
            <Kpi label="Under maintenance" value={query.data.underMaintenance} to={appPath("maintenance")} />
            <Kpi label="Retired" value={query.data.retired} to={appPath("reports")} />
            <Kpi label="Overdue WO" value={query.data.overdueMaintenance} to={appPath("maintenance")} />
            <Kpi label="Warranty alerts" value={query.data.warrantyAlerts} to={appPath("reports")} />
            <Kpi label="Book value" value={`₹${Math.round(query.data.bookValue).toLocaleString("en-IN")}`} to={appPath("reports")} />
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Assets by category</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {query.data.byCategory.map((row) => (
                  <li key={row.name} className="flex justify-between gap-2">
                    <span>{row.name}</span>
                    <strong>{row.n}</strong>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Upcoming maintenance</h2>
              <table className="mt-2 w-full text-sm">
                <caption className="sr-only">Upcoming work orders</caption>
                <thead>
                  <tr>
                    <th scope="col" className="text-left">WO</th>
                    <th scope="col" className="text-left">Asset</th>
                    <th scope="col" className="text-left">When</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.upcomingMaintenance.map((row) => (
                    <tr key={row.id} data-wo-id={row.id}>
                      <td>{row.workOrderNo}</td>
                      <td>{row.asset}</td>
                      <td>{String(row.scheduledAt).slice(0, 16).replace("T", " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Recent transactions</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {query.data.recentTransactions.map((row) => (
                <li key={row.id}>
                  <strong>{row.action}</strong> {row.details ?? ""} <small className="text-muted-foreground">({row.actor})</small>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : null}
    </div>
  )
}
