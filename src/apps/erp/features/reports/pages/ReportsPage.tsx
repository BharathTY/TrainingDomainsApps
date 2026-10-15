import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { PageHeader } from "@/apps/erp/components/PageHeader"
import { Button } from "@/components/ui/button"
import { api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"

const REPORTS = [
  ["trial-balance", "Trial balance"],
  ["profit-and-loss", "Profit and loss"],
  ["balance-sheet", "Balance sheet"],
  ["ar-aging", "AR aging"],
  ["ap-aging", "AP aging"],
  ["inventory-valuation", "Inventory valuation"],
  ["low-stock", "Low stock"],
  ["payroll-register", "Payroll register"],
  ["budget-vs-actual", "Budget vs actual"],
  ["fixed-asset-register", "Fixed asset register"],
] as const

export function ReportsPage() {
  const [name, setName] = useState<(typeof REPORTS)[number][0]>("trial-balance")
  const query = useQuery({
    queryKey: ["erp", "report", name],
    queryFn: () => api<{ name: string; rows: Record<string, unknown>[] }>(`/api/reports/${name}`),
  })
  const rows = query.data?.rows ?? []
  const keys = rows[0] ? Object.keys(rows[0]) : []

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Reports"
        description="Derived from posted journals and operational ledgers. Tax figures are demo-configurable only."
        actions={
          <a className="text-sm underline" href={appPath("secure/trial-balance")} target="_blank" rel="noreferrer">
            Secure trial balance (Basic Auth)
          </a>
        }
      />
      <div className="flex flex-wrap gap-2">
        {REPORTS.map(([id, label]) => (
          <Button key={id} type="button" size="sm" variant={name === id ? "default" : "outline"} onClick={() => setName(id)}>
            {label}
          </Button>
        ))}
      </div>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading report…</p> : null}
      {query.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load report.
        </p>
      ) : null}
      <div className="overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="border-b border-border px-3 py-2 text-left font-medium">{REPORTS.find((r) => r[0] === name)?.[1]}</caption>
          <thead>
            <tr>
              {keys.map((key) => (
                <th key={key} scope="col" className="border-b border-border px-3 py-2 text-left">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {keys.map((key) => (
                  <td key={key} className="border-b border-border px-3 py-2">
                    {String(row[key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const header = keys.join(",")
          const body = rows.map((row) => keys.map((key) => JSON.stringify(row[key] ?? "")).join(",")).join("\n")
          const blob = new Blob([[header, body].join("\n")], { type: "text/csv" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `${name}.csv`
          a.click()
          URL.revokeObjectURL(url)
        }}
      >
        Export CSV
      </Button>
    </div>
  )
}
