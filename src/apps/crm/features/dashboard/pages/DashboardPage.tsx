import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { PageHeader } from "@/apps/crm/components/PageHeader"
import { loadDashboard } from "@/apps/crm/features/api"
import { Button } from "@/components/ui/button"
import { appPath } from "@/shared/lib/app-context"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

function Kpi({ label, value, to }: { label: string; value: string | number; to?: string }) {
  const body = (
    <article className="rounded-lg border border-border bg-card p-4" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </article>
  )
  return to ? (
    <Link to={to} className="block hover:opacity-90">
      {body}
    </Link>
  ) : (
    body
  )
}

export function DashboardPage() {
  const query = useQuery({ queryKey: ["crm", "dashboard"], queryFn: loadDashboard })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Dashboard"
        description="Sales pipeline pulse from synthetic CRM data."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" data-testid="quick-add-lead">
              <Link to={appPath("leads?new=1")}>Add lead</Link>
            </Button>
            <Button asChild size="sm" variant="outline" data-testid="quick-add-contact">
              <Link to={appPath("contacts?new=1")}>Create contact</Link>
            </Button>
            <Button asChild size="sm" variant="outline" data-testid="quick-schedule">
              <Link to={appPath("activities?new=1")}>Schedule follow-up</Link>
            </Button>
          </div>
        }
      />

      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading dashboard…</p> : null}
      {query.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load dashboard.{" "}
          <button type="button" className="underline" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      ) : null}

      {query.data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key metrics">
            <Kpi label="Total leads" value={query.data.totalLeads} to={appPath("leads")} />
            <Kpi label="New leads" value={query.data.newLeads} to={appPath("leads?status=new")} />
            <Kpi label="Qualified" value={query.data.qualifiedLeads} to={appPath("leads?status=qualified")} />
            <Kpi label="Converted" value={query.data.convertedLeads} to={appPath("leads?status=converted")} />
            <Kpi label="Contacts" value={query.data.totalContacts} to={appPath("contacts")} />
            <Kpi label="Open opportunities" value={query.data.openOpportunities} to={appPath("pipeline")} />
            <Kpi label="Follow-ups today" value={query.data.followUpsToday} to={appPath("activities")} />
            <Kpi label="Overdue follow-ups" value={query.data.overdueFollowUps} to={appPath("activities?overdue=1")} />
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Conversion & pipeline</h2>
              <p className="mt-2 text-3xl font-semibold" data-testid="conversion-rate">
                {query.data.conversionRate}%
              </p>
              <p className="text-xs text-muted-foreground">Lead conversion rate</p>
              <table className="mt-3 w-full text-sm" data-testid="pipeline-summary">
                <caption className="sr-only">Pipeline by stage</caption>
                <thead>
                  <tr>
                    <th scope="col" className="border-b py-2 text-left">
                      Stage
                    </th>
                    <th scope="col" className="border-b py-2 text-right">
                      Deals
                    </th>
                    <th scope="col" className="border-b py-2 text-right">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.pipeline.map((row) => (
                    <tr key={row.stage}>
                      <td className="border-b py-2 capitalize">{row.stage.replaceAll("_", " ")}</td>
                      <td className="border-b py-2 text-right">{row.n}</td>
                      <td className="border-b py-2 text-right">{inr.format(row.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Upcoming meetings</h2>
              <ul className="mt-2 space-y-2 text-sm" data-testid="upcoming-meetings">
                {query.data.upcomingMeetings.length === 0 ? <li>No upcoming activities.</li> : null}
                {query.data.upcomingMeetings.map((m) => (
                  <li key={m.id} className="flex justify-between gap-2 border-b border-border py-1">
                    <span>
                      <Link className="font-medium underline" to={appPath("calendar")}>
                        {m.title}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {m.activityNo} · {m.activityType}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.startAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Recent activity</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {query.data.recentActivities.map((a) => (
                  <li key={a.id}>
                    <span className="font-medium">{a.action}</span> on {a.entityType} · {a.actor} ·{" "}
                    <span className="text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Recent notes</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {query.data.recentNotes.map((n) => (
                  <li key={n.id} className="border-b border-border py-1">
                    <span className="text-xs uppercase text-muted-foreground">{n.entityType}</span>
                    <p>{n.body}</p>
                    <p className="text-xs text-muted-foreground">{n.actor}</p>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </>
      ) : null}
    </div>
  )
}
