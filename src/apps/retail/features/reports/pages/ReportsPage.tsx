import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { PageHeader } from "@/apps/retail/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { downloadCsv } from "@/shared/lib/csv"
import { api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"

const REPORTS = [
  ["daily-sales", "Daily sales"],
  ["low-stock", "Low stock"],
  ["expiry", "Expiry watch"],
  ["returns", "Returns"],
] as const

type ReportName = (typeof REPORTS)[number][0]

export function ReportsPage() {
  const [name, setName] = useState<ReportName>("daily-sales")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [previewOpen, setPreviewOpen] = useState(false)

  const query = useQuery({
    queryKey: ["retail", "report", name],
    queryFn: () => api<{ name: string; rows: Record<string, unknown>[] }>(`/api/reports/${name}`),
  })

  const filteredRows = useMemo(() => {
    const rows = query.data?.rows ?? []
    if (!fromDate && !toDate) return rows
    return rows.filter((row) => {
      const day = String(row.day ?? row.expiryDate ?? row.createdAt ?? "").slice(0, 10)
      if (!day) return true
      if (fromDate && day < fromDate) return false
      if (toDate && day > toDate) return false
      return true
    })
  }, [query.data?.rows, fromDate, toDate])

  const keys = filteredRows[0] ? Object.keys(filteredRows[0]) : []

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Reports"
        description="Operational reports from persisted retail data."
        actions={
          <a className="text-sm underline" href={appPath("secure/cash-drawer")} target="_blank" rel="noopener noreferrer">
            Protected cash drawer (Basic Auth)
          </a>
        }
      />
      <div className="flex flex-wrap gap-2">
        {REPORTS.map(([id, label]) => (
          <Button key={id} type="button" size="sm" variant={name === id ? "default" : "outline"} data-testid={`report-${id}`} onClick={() => setName(id)}>
            {label}
          </Button>
        ))}
      </div>
      <section className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="report-from">From date</Label>
          <Input id="report-from" type="date" data-testid="report-from-date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="report-to">To date</Label>
          <Input id="report-to" type="date" data-testid="report-to-date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Button
            type="button"
            variant="outline"
            data-testid="report-export-csv"
            disabled={filteredRows.length === 0}
            onClick={() =>
              downloadCsv(`${name}.csv`, [
                keys,
                ...filteredRows.map((row) => keys.map((key) => String(row[key] ?? ""))),
              ])
            }
          >
            Export CSV
          </Button>
          <Button type="button" data-testid="report-preview" onClick={() => setPreviewOpen(true)}>
            Preview panel
          </Button>
        </div>
      </section>
      <div className="overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-sm" data-testid="report-table">
          <caption className="border-b px-3 py-2 text-left font-medium">{REPORTS.find((r) => r[0] === name)?.[1]}</caption>
          <thead>
            <tr>
              {keys.map((key) => (
                <th key={key} scope="col" className="border-b px-3 py-2 text-left">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <tr key={index}>
                {keys.map((key) => (
                  <td key={key} className="border-b px-3 py-2">
                    {String(row[key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(keys.length, 1)} className="px-3 py-4 text-muted-foreground">
                  No rows for this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="right" className="w-[min(100%,28rem)]" data-testid="report-preview-sheet">
          <SheetHeader>
            <SheetTitle>{REPORTS.find((r) => r[0] === name)?.[1]}</SheetTitle>
            <SheetDescription>
              {filteredRows.length} row(s){fromDate || toDate ? ` · filtered ${fromDate || "…"} to ${toDate || "…"}` : ""}
            </SheetDescription>
          </SheetHeader>
          <pre className="mt-4 max-h-[70vh] overflow-auto rounded border border-border bg-muted/30 p-3 text-xs">{JSON.stringify(filteredRows.slice(0, 20), null, 2)}</pre>
        </SheetContent>
      </Sheet>
    </div>
  )
}
