import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { PageHeader } from "@/apps/retail/components/PageHeader"
import { loadDashboard, loadLookups } from "@/apps/retail/features/catalog/api"
import { useUiStore } from "@/apps/retail/stores/ui-store"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const storeId = useUiStore((state) => state.storeId)
  const setStoreId = useUiStore((state) => state.setStoreId)
  const lookups = useQuery({ queryKey: ["retail", "lookups"], queryFn: loadLookups, staleTime: 60_000 })
  const query = useQuery({
    queryKey: ["retail", "dashboard", storeId],
    queryFn: () => loadDashboard(storeId || undefined),
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Dashboard"
        description="Retail RMS KPIs from persisted synthetic store data."
        actions={
          <div className="grid gap-1">
            <Label htmlFor="dashboard-store">Store</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger id="dashboard-store" className="w-[220px]" data-testid="dashboard-store-select">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent>
                {(lookups.data?.stores ?? []).map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.code} · {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Loading dashboard…
        </p>
      ) : null}
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
            <Kpi label="Today sales" value={inr.format(query.data.todaySales)} to={appPath("sales")} />
            <Kpi label="Transactions" value={query.data.todayTransactions} to={appPath("pos")} />
            <Kpi label="Average order" value={inr.format(query.data.averageOrderValue)} to={appPath("sales")} />
            <Kpi label="Out of stock SKUs" value={query.data.outOfStock} to={appPath("inventory")} />
            <Kpi label="Pending POs" value={query.data.pendingPurchaseOrders} to={appPath("purchases")} />
          </section>
          <section className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Low stock</h2>
              <table className="mt-3 w-full text-sm" data-testid="dashboard-low-stock">
                <caption className="sr-only">Products at or below reorder level</caption>
                <thead>
                  <tr>
                    <th scope="col" className="border-b py-2 text-left">
                      SKU
                    </th>
                    <th scope="col" className="border-b py-2 text-left">
                      Product
                    </th>
                    <th scope="col" className="border-b py-2 text-right">
                      Qty
                    </th>
                    <th scope="col" className="border-b py-2 text-left">
                      Store
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.lowStock.map((row) => (
                    <tr key={`${row.id}-${row.store}`}>
                      <td className="border-b py-2">{row.sku}</td>
                      <td className="border-b py-2">
                        <Link className="underline" to={appPath(`products/${row.id}`)}>
                          {row.name}
                        </Link>
                      </td>
                      <td className="border-b py-2 text-right">{row.quantity}</td>
                      <td className="border-b py-2">{row.store}</td>
                    </tr>
                  ))}
                  {query.data.lowStock.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-muted-foreground">
                        No low-stock alerts.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </article>
            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">7-day revenue</h2>
              <table className="mt-3 w-full text-sm" data-testid="dashboard-sales-chart">
                <caption className="sr-only">Daily revenue chart data</caption>
                <thead>
                  <tr>
                    <th scope="col" className="border-b py-2 text-left">
                      Day
                    </th>
                    <th scope="col" className="border-b py-2 text-right">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.salesChart.map((row) => (
                    <tr key={row.day}>
                      <td className="border-b py-2">{row.day}</td>
                      <td className="border-b py-2 text-right">{inr.format(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </section>
          <section className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Recent sales</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {query.data.recentSales.map((row) => (
                  <li key={row.id}>
                    <Link className="underline" to={appPath("sales")}>
                      {row.saleNo}
                    </Link>{" "}
                    · {inr.format(row.total)} · {row.paymentMethod}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Recent returns</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {query.data.recentReturns.map((row) => (
                  <li key={row.id}>
                    {row.returnNo} · {inr.format(row.refundAmount)}
                  </li>
                ))}
                {query.data.recentReturns.length === 0 ? <li>No returns yet.</li> : null}
              </ul>
            </article>
          </section>
        </>
      ) : null}
    </div>
  )
}
