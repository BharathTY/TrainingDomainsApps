import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { PageHeader } from "@/apps/assets/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"

const REPORTS = [
  { id: "inventory", label: "Asset inventory" },
  { id: "warranty", label: "Warranty expiry" },
  { id: "depreciation", label: "Depreciation" },
  { id: "maintenance-costs", label: "Maintenance costs" },
  { id: "overdue", label: "Overdue work orders" },
  { id: "assignments", label: "Assignment history" },
  { id: "retired", label: "Retired assets" },
] as const

export function ReportsPage() {
  const [name, setName] = useState<(typeof REPORTS)[number]["id"]>("inventory")
  const [previewOpen, setPreviewOpen] = useState(false)
  const query = useQuery({
    queryKey: ["assets", "reports", name],
    queryFn: () => api<{ name: string; rows: Record<string, unknown>[] }>(`/api/reports/${name}`),
  })
  const rows = query.data?.rows ?? []
  const keys = rows[0] ? Object.keys(rows[0]) : []
  const previewRows = rows.slice(0, 12)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Reports & audit"
        description="Persisted inventory, warranty, depreciation, and maintenance reports."
        actions={
          <Button type="button" size="sm" variant="outline" data-testid="open-report-sheet" onClick={() => setPreviewOpen(true)}>
            Open report panel
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2">
        {REPORTS.map((report) => (
          <Button
            key={report.id}
            type="button"
            size="sm"
            variant={name === report.id ? "default" : "outline"}
            data-testid={`report-${report.id}`}
            onClick={() => setName(report.id)}
          >
            {report.label}
          </Button>
        ))}
        <a className="text-sm underline self-center" href={appPath("vendors")} target="_blank" rel="noopener noreferrer">
          Vendors in new tab
        </a>
      </div>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading report…</p> : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm" data-testid="report-table">
          <caption className="p-2 text-left text-xs text-muted-foreground">{name} report</caption>
          <thead>
            <tr className="border-b bg-muted/40">
              {keys.map((key) => (
                <th key={key} scope="col" className="px-2 py-1.5 text-left font-medium">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b">
                {keys.map((key) => (
                  <td key={key} className="px-2 py-1.5">
                    {String(row[key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="right" className="w-[min(100%,32rem)]" data-testid="report-preview-sheet">
          <SheetHeader>
            <SheetTitle>Report preview</SheetTitle>
            <SheetDescription>
              {REPORTS.find((r) => r.id === name)?.label ?? name} — first {previewRows.length} rows
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">Report preview</caption>
              <thead>
                <tr className="border-b bg-muted/40">
                  {keys.map((key) => (
                    <th key={key} scope="col" className="px-2 py-1.5 text-left font-medium">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={index} className="border-b">
                    {keys.map((key) => (
                      <td key={key} className="px-2 py-1.5">
                        {String(row[key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
            Close panel
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  )
}
