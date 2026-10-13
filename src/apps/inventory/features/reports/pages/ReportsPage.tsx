import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { PageHeader } from "@/apps/inventory/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePicker } from "@/shared/DatePicker"
import { AppFrame } from "@/shared/frames"
import { api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"
import { downloadCsv } from "@/shared/lib/csv"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

export function ReportsPage() {
  const [asOn, setAsOn] = useState("2026-10-01")
  const ledger = useQuery({
    queryKey: ["inventory", "ledger", asOn],
    queryFn: () => api<{ occurredOn: string; sku: string; name: string; warehouse: string; direction: string; qty: number }[]>(`/api/reports/ledger?asOn=${asOn}`),
  })
  const valuation = useQuery({
    queryKey: ["inventory", "valuation"],
    queryFn: () => api<{
      weightedAverage: { sku: string; name: string; qty: number; value: number }[]
      fifo: { sku: string; name: string; batchNo: string; qty: number; value: number }[]
    }>("/api/reports/valuation"),
  })
  const ageing = useQuery({ queryKey: ["inventory", "ageing"], queryFn: () => api<{ bucket: string; qty: number }[]>("/api/reports/ageing") })
  const expiry = useQuery({ queryKey: ["inventory", "expiry"], queryFn: () => api<{ sku: string; name: string; batchNo: string; expiresOn: string; qty: number; warehouse: string }[]>("/api/reports/expiry") })
  const movements = useQuery({ queryKey: ["inventory", "movements"], queryFn: () => api<{ occurredOn: string; sku: string; warehouse: string; direction: string; qty: number }[]>("/api/reports/movements") })
  const valuationDoc = (valuation.data?.weightedAverage ?? [])
    .slice(0, 12)
    .map((row) => `<tr><td>${row.sku}</td><td style="text-align:right">${row.qty}</td><td style="text-align:right">${Math.round(row.value)}</td></tr>`)
    .join("")

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Reports"
        description="Ledger, valuation, ageing, expiry, and movement."
        actions={
          <Button type="button" variant="outline" onClick={() => window.open(appPath("reports"), "_blank", "noopener")}>
            Open in a new tab
          </Button>
        }
      />
      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="valuation">Valuation</TabsTrigger>
          <TabsTrigger value="ageing">Ageing</TabsTrigger>
          <TabsTrigger value="expiry">Near expiry</TabsTrigger>
          <TabsTrigger value="movements">Movement</TabsTrigger>
        </TabsList>
        <TabsContent value="ledger">
          <div className="mb-3 flex items-end gap-2">
            <DatePicker id="as-on" label="As on" value={asOn} onChange={setAsOn} />
            <Button type="button" variant="outline" onClick={() => downloadCsv("ledger.csv", [["Date", "SKU", "Warehouse", "Direction", "Qty"], ...(ledger.data ?? []).map((row) => [String(row.occurredOn).slice(0, 10), row.sku, row.warehouse, row.direction, String(row.qty)])])}>Export CSV</Button>
          </div>
          <table className="w-full text-sm">
            <caption className="mb-2 text-left">Stock ledger</caption>
            <thead><tr><th scope="col" className="border-b py-2 text-left">Date</th><th scope="col" className="border-b py-2 text-left">SKU</th><th scope="col" className="border-b py-2 text-left">Warehouse</th><th scope="col" className="border-b py-2 text-left">Direction</th><th scope="col" className="border-b py-2 text-right">Qty</th></tr></thead>
            <tbody>
              {(ledger.data ?? []).slice(0, 40).map((row, index) => (
                <tr key={`${row.sku}-${index}`}><td className="border-b py-2">{String(row.occurredOn).slice(0, 10)}</td><td className="border-b py-2">{row.sku}</td><td className="border-b py-2">{row.warehouse}</td><td className="border-b py-2">{row.direction}</td><td className="border-b py-2 text-right">{row.qty}</td></tr>
              ))}
            </tbody>
          </table>
        </TabsContent>
        <TabsContent value="valuation">
          <h2 className="mb-2 text-sm font-semibold">Weighted average</h2>
          <table className="mb-4 w-full text-sm">
            <caption className="sr-only">Weighted average valuation</caption>
            <thead><tr><th scope="col" className="border-b py-2 text-left">SKU</th><th scope="col" className="border-b py-2 text-right">Qty</th><th scope="col" className="border-b py-2 text-right">Value</th></tr></thead>
            <tbody>
              {(valuation.data?.weightedAverage ?? []).slice(0, 20).map((row) => (
                <tr key={row.sku}><td className="border-b py-2">{row.sku}</td><td className="border-b py-2 text-right">{row.qty}</td><td className="border-b py-2 text-right">{inr.format(row.value)}</td></tr>
              ))}
            </tbody>
          </table>
          <h2 className="mb-2 text-sm font-semibold">FIFO</h2>
          <table className="mb-4 w-full text-sm">
            <caption className="sr-only">FIFO valuation by oldest batch</caption>
            <thead><tr><th scope="col" className="border-b py-2 text-left">SKU</th><th scope="col" className="border-b py-2 text-left">Batch</th><th scope="col" className="border-b py-2 text-right">Qty</th><th scope="col" className="border-b py-2 text-right">Value</th></tr></thead>
            <tbody>
              {(valuation.data?.fifo ?? []).slice(0, 20).map((row) => (
                <tr key={`${row.sku}-${row.batchNo}`}><td className="border-b py-2">{row.sku}</td><td className="border-b py-2">{row.batchNo}</td><td className="border-b py-2 text-right">{row.qty}</td><td className="border-b py-2 text-right">{inr.format(row.value)}</td></tr>
              ))}
            </tbody>
          </table>
          <AppFrame title="Valuation preview" srcdoc={`<table><caption>Stock valuation</caption><thead><tr><th>SKU</th><th>Qty</th><th>Value</th></tr></thead><tbody>${valuationDoc}</tbody></table>`} />
          <p className="mt-3 text-sm">The secure valuation page is at <a className="underline" href={appPath("secure/stock-valuation")}>stock valuation</a>.</p>
        </TabsContent>
        <TabsContent value="ageing">
          <table className="w-full text-sm">
            <caption className="mb-2 text-left">Age buckets</caption>
            <thead><tr><th scope="col" className="border-b py-2 text-left">Bucket</th><th scope="col" className="border-b py-2 text-right">Qty</th></tr></thead>
            <tbody>
              {(ageing.data ?? []).map((row) => <tr key={row.bucket}><td className="border-b py-2">{row.bucket}</td><td className="border-b py-2 text-right">{row.qty}</td></tr>)}
            </tbody>
          </table>
        </TabsContent>
        <TabsContent value="expiry">
          <table className="w-full text-sm">
            <caption className="mb-2 text-left">Batches expiring within 90 days</caption>
            <thead><tr><th scope="col" className="border-b py-2 text-left">SKU</th><th scope="col" className="border-b py-2 text-left">Batch</th><th scope="col" className="border-b py-2 text-left">Warehouse</th><th scope="col" className="border-b py-2 text-left">Expires</th><th scope="col" className="border-b py-2 text-right">Qty</th></tr></thead>
            <tbody>
              {(expiry.data ?? []).slice(0, 30).map((row) => (
                <tr key={`${row.sku}-${row.batchNo}`}><td className="border-b py-2">{row.sku}</td><td className="border-b py-2">{row.batchNo}</td><td className="border-b py-2">{row.warehouse}</td><td className="border-b py-2">{String(row.expiresOn).slice(0, 10)}</td><td className="border-b py-2 text-right">{row.qty}</td></tr>
              ))}
            </tbody>
          </table>
        </TabsContent>
        <TabsContent value="movements">
          <table className="w-full text-sm">
            <caption className="mb-2 text-left">Recent movement</caption>
            <thead><tr><th scope="col" className="border-b py-2 text-left">Date</th><th scope="col" className="border-b py-2 text-left">SKU</th><th scope="col" className="border-b py-2 text-left">Warehouse</th><th scope="col" className="border-b py-2 text-left">Direction</th><th scope="col" className="border-b py-2 text-right">Qty</th></tr></thead>
            <tbody>
              {(movements.data ?? []).slice(0, 30).map((row, index) => (
                <tr key={`${row.sku}-${index}`}><td className="border-b py-2">{String(row.occurredOn).slice(0, 10)}</td><td className="border-b py-2">{row.sku}</td><td className="border-b py-2">{row.warehouse}</td><td className="border-b py-2">{row.direction}</td><td className="border-b py-2 text-right">{row.qty}</td></tr>
              ))}
            </tbody>
          </table>
        </TabsContent>
      </Tabs>
    </div>
  )
}
