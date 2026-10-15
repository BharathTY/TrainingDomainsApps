import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { PageHeader } from "@/apps/hospital/components/PageHeader"
import { Button } from "@/components/ui/button"
import { api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"

const REPORTS = [
  ["appointments-today", "Today's appointments"],
  ["ward-occupancy", "Ward occupancy"],
  ["billing-summary", "Billing summary"],
] as const

export function ReportsPage() {
  const [name, setName] = useState<(typeof REPORTS)[number][0]>("appointments-today")
  const query = useQuery({
    queryKey: ["hospital", "report", name],
    queryFn: () => api<{ name: string; rows: Record<string, unknown>[] }>(`/api/reports/${name}`),
  })
  const rows = query.data?.rows ?? []
  const keys = rows[0] ? Object.keys(rows[0]) : []

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Reports"
        description="Derived from persisted MediCare records."
        actions={
          <a className="text-sm underline" href={appPath("secure/reports-vault")} target="_blank" rel="noopener noreferrer">
            Protected reports vault (Basic Auth)
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
      <div className="overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-sm">
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
            {rows.map((row, index) => (
              <tr key={index}>
                {keys.map((key) => (
                  <td key={key} className="border-b px-3 py-2">
                    {String(row[key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
