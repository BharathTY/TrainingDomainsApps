import { useQuery } from "@tanstack/react-query"
import { ROLE_LABEL, type Role } from "@/apps/erp/config/permissions"
import { loadDashboard } from "@/apps/erp/features/catalog/api"
import { useUiStore } from "@/apps/erp/stores/ui-store"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </article>
  )
}

export function DashboardPage() {
  const role = useUiStore((state) => state.role)
  const query = useQuery({ queryKey: ["erp", "dashboard"], queryFn: loadDashboard })
  const financeRoles = ["sysadmin", "orgadmin", "finmgr", "accountant", "auditor"]
  const hrRoles = ["sysadmin", "orgadmin", "hrmgr", "hrexec", "deptmgr", "employee", "auditor"]
  const opsRoles = ["sysadmin", "orgadmin", "procmgr", "whmgr", "salesmgr", "auditor", "deptmgr"]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {ROLE_LABEL[role as Role] ?? role} KPIs from persisted ERP transactions (not decorative placeholders).
        </p>
      </header>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading KPIs…</p> : null}
      {query.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load the dashboard.{" "}
          <button type="button" className="underline" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      ) : null}
      {query.data ? (
        <>
          {financeRoles.includes(role) ? (
            <section className="space-y-3" aria-label="Finance dashboard">
              <h2 className="text-sm font-semibold">Finance</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi label="Revenue (posted)" value={inr.format(query.data.finance.revenue)} />
                <Kpi label="Expenses (posted)" value={inr.format(query.data.finance.expenses)} />
                <Kpi label="Cash & bank" value={inr.format(query.data.finance.cashBank)} />
                <Kpi label="Pending approvals" value={query.data.finance.pendingApprovals} />
                <Kpi label="AR balance" value={inr.format(query.data.finance.arBalance)} />
                <Kpi label="AR aging (overdue)" value={inr.format(query.data.finance.arAging)} />
                <Kpi label="AP balance" value={inr.format(query.data.finance.apBalance)} />
                <Kpi label="AP aging (overdue)" value={inr.format(query.data.finance.apAging)} />
              </div>
            </section>
          ) : null}
          {hrRoles.includes(role) ? (
            <section className="space-y-3" aria-label="HR dashboard">
              <h2 className="text-sm font-semibold">Human resources</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi label="Employees" value={query.data.hr.totalEmployees} />
                <Kpi label="New joiners (30d)" value={query.data.hr.newJoiners} />
                <Kpi label="Exits" value={query.data.hr.exits} />
                <Kpi label="Leave pending" value={query.data.hr.pendingLeaves} />
              </div>
            </section>
          ) : null}
          {opsRoles.includes(role) ? (
            <section className="space-y-3" aria-label="Operations dashboard">
              <h2 className="text-sm font-semibold">Operations</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi label="Open POs" value={query.data.operations.openPurchaseOrders} />
                <Kpi label="Pending GRNs" value={query.data.operations.pendingGoodsReceipts} />
                <Kpi label="Low stock SKUs" value={query.data.operations.lowStock} />
                <Kpi label="Open sales orders" value={query.data.operations.openSalesOrders} />
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
