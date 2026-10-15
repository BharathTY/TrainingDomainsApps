import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useState } from "react"
import { PageHeader } from "@/apps/banking/components/PageHeader"
import { loadDashboard, maskAccountNo } from "@/apps/banking/features/api"
import { useUiStore } from "@/apps/banking/stores/ui-store"
import { Button } from "@/components/ui/button"
import { Modal } from "@/shared/Modal"
import { appPath } from "@/shared/lib/app-context"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

export function DashboardPage() {
  const mask = useUiStore((s) => s.maskAccounts)
  const query = useQuery({ queryKey: ["banking", "dashboard"], queryFn: loadDashboard })
  const [announce, setAnnounce] = useState<{ title: string; body: string } | null>(null)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Dashboard"
        description={
          query.data?.customer
            ? `Welcome, ${query.data.customer.fullName} · ${query.data.customer.branchName}`
            : "Personalized banking overview from synthetic demo data."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" data-testid="quick-transfer">
              <Link to={appPath("transfers")}>Transfer</Link>
            </Button>
            <Button asChild size="sm" variant="outline" data-testid="quick-statement">
              <Link to={appPath("statements")}>Statements</Link>
            </Button>
            <Button asChild size="sm" variant="outline" data-testid="quick-accounts">
              <Link to={appPath("accounts")}>Accounts</Link>
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
          <p className="text-xs text-muted-foreground" data-testid="last-login">
            Last login:{" "}
            {query.data.lastLoginAt
              ? new Date(query.data.lastLoginAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
              : "First session"}
          </p>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key metrics">
            <article className="rounded-lg border border-border bg-card p-4" data-testid="kpi-total-balance">
              <p className="text-sm text-muted-foreground">Total balance</p>
              <p className="text-2xl font-semibold">{inr.format(query.data.totalBalance)}</p>
            </article>
            {query.data.accounts
              .filter((a) => a.status === "active" && ["savings", "current"].includes(a.accountType))
              .slice(0, 3)
              .map((a) => (
                <article key={a.id} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground capitalize">{a.accountType.replace("_", " ")}</p>
                  <p className="text-lg font-semibold">{inr.format(a.balance)}</p>
                  <p className="text-xs text-muted-foreground">{maskAccountNo(a.accountNo, mask)}</p>
                </article>
              ))}
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Recent transactions</h2>
              <ul className="mt-2 space-y-2 text-sm" data-testid="dashboard-recent-txns">
                {query.data.recentTransactions.map((t) => (
                  <li key={t.id} className="flex justify-between gap-2 border-b border-border py-1">
                    <span>
                      <span className="font-medium">{t.description}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t.account} · {t.txnRef}
                      </span>
                    </span>
                    <span className={t.txnType === "credit" ? "text-emerald-700" : "text-rose-700"}>
                      {t.txnType === "credit" ? "+" : "-"}
                      {inr.format(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">7-day activity</h2>
              <table className="mt-3 w-full text-sm" data-testid="dashboard-activity-chart">
                <caption className="sr-only">Daily credits and debits</caption>
                <thead>
                  <tr>
                    <th scope="col" className="border-b py-2 text-left">
                      Day
                    </th>
                    <th scope="col" className="border-b py-2 text-right">
                      Credits
                    </th>
                    <th scope="col" className="border-b py-2 text-right">
                      Debits
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.activityChart.map((row) => (
                    <tr key={row.day}>
                      <td className="border-b py-2">{row.day}</td>
                      <td className="border-b py-2 text-right">{inr.format(row.credits)}</td>
                      <td className="border-b py-2 text-right">{inr.format(row.debits)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Upcoming scheduled transfers</h2>
              <ul className="mt-2 space-y-1 text-sm" data-testid="dashboard-scheduled">
                {query.data.upcomingTransfers.length === 0 ? <li>No upcoming schedules.</li> : null}
                {query.data.upcomingTransfers.map((s) => (
                  <li key={s.id}>
                    <Link className="underline" to={appPath("scheduled")}>
                      {s.scheduleNo}
                    </Link>{" "}
                    · {inr.format(s.amount)} · {s.executeDate} {String(s.executeTime).slice(0, 5)} · {s.frequency}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Announcements</h2>
              <ul className="mt-2 space-y-2 text-sm" data-testid="dashboard-announcements">
                {query.data.announcements.map((a) => (
                  <li key={a.id}>
                    <button type="button" className="text-left underline" onClick={() => setAnnounce(a)}>
                      {a.title}
                    </button>
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{a.severity}</span>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </>
      ) : null}

      <Modal open={Boolean(announce)} title={announce?.title ?? "Announcement"} onClose={() => setAnnounce(null)}>
        <p className="text-sm">{announce?.body}</p>
        <Button type="button" className="mt-3" onClick={() => setAnnounce(null)}>
          Acknowledge
        </Button>
      </Modal>
    </div>
  )
}
