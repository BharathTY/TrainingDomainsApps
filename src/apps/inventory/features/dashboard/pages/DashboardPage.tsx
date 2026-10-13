import { useQuery } from "@tanstack/react-query"
import { loadDashboard } from "@/apps/inventory/features/dashboard/api"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

export function DashboardPage() {
  const query = useQuery({ queryKey: ["inventory", "dashboard"], queryFn: loadDashboard })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Stock value, alerts, and movement from the StockWise ledger.</p>
      </header>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading stock…</p> : null}
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
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Stock summary">
            <article className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Items</p>
              <p className="text-2xl font-semibold">{query.data.items}</p>
            </article>
            <article className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Stock value</p>
              <p className="text-2xl font-semibold">{inr.format(query.data.stockValue)}</p>
            </article>
            <article className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Low stock</p>
              <p className="text-2xl font-semibold">{query.data.lowStock}</p>
            </article>
            <article className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Near expiry</p>
              <p className="text-2xl font-semibold">{query.data.nearExpiry}</p>
            </article>
          </section>
          <section className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Stock value by warehouse</h2>
              <table className="mt-3 w-full text-sm">
                <caption className="sr-only">Value of stock held in each warehouse</caption>
                <thead>
                  <tr>
                    <th scope="col" className="border-b border-border py-2 text-left">Warehouse</th>
                    <th scope="col" className="border-b border-border py-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.warehouses.map((row) => (
                    <tr key={row.name}>
                      <td className="border-b border-border py-2">{row.name}</td>
                      <td className="border-b border-border py-2 text-right">{inr.format(row.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Inward vs outward</h2>
              <table className="mt-3 w-full text-sm">
                <caption className="sr-only">Quantity moved in and out by month</caption>
                <thead>
                  <tr>
                    <th scope="col" className="border-b border-border py-2 text-left">Month</th>
                    <th scope="col" className="border-b border-border py-2 text-right">Inward</th>
                    <th scope="col" className="border-b border-border py-2 text-right">Outward</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.trend.map((row) => (
                    <tr key={row.month}>
                      <td className="border-b border-border py-2">{row.month}</td>
                      <td className="border-b border-border py-2 text-right">{row.inward}</td>
                      <td className="border-b border-border py-2 text-right">{row.outward}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </section>
        </>
      ) : null}
    </div>
  )
}
