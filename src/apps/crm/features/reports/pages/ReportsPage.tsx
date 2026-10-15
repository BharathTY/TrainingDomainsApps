import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/apps/crm/components/PageHeader"
import { Tabs } from "@/shared/Tabs"
import { api } from "@/shared/lib/api-client"
import { downloadCsv } from "@/shared/lib/csv"
import { Button } from "@/components/ui/button"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

export function ReportsPage() {
  const query = useQuery({
    queryKey: ["crm", "reports"],
    queryFn: () =>
      api<{
        leadsByStatus: { status: string; n: number }[]
        leadsBySource: { source: string; n: number }[]
        activitiesByOwner: { owner: string; n: number }[]
        opportunitiesByStage: { stage: string; n: number; value: number }[]
        activityStats: { completed: number; overdue: number; planned: number }
        conversionRate: number
        closedValue: number
        pipelineValue: number
      }>("/api/reports"),
  })

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <PageHeader
        title="Reports"
        description="Lead conversion, activities, and pipeline value summaries."
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!query.data}
            onClick={() => {
              if (!query.data) return
              downloadCsv("crm-leads-by-status.csv", [
                ["Status", "Count"],
                ...query.data.leadsByStatus.map((r) => [r.status, String(r.n)]),
              ])
            }}
          >
            Export CSV
          </Button>
        }
      />

      {query.data ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-lg border border-border p-3"><p className="text-sm text-muted-foreground">Conversion rate</p><p className="text-2xl font-semibold">{query.data.conversionRate}%</p></article>
          <article className="rounded-lg border border-border p-3"><p className="text-sm text-muted-foreground">Pipeline value</p><p className="text-2xl font-semibold">{inr.format(query.data.pipelineValue)}</p></article>
          <article className="rounded-lg border border-border p-3"><p className="text-sm text-muted-foreground">Closed won</p><p className="text-2xl font-semibold">{inr.format(query.data.closedValue)}</p></article>
          <article className="rounded-lg border border-border p-3"><p className="text-sm text-muted-foreground">Overdue activities</p><p className="text-2xl font-semibold">{query.data.activityStats.overdue}</p></article>
        </section>
      ) : null}

      <Tabs
        tabs={[
          {
            id: "leads",
            label: "Lead reports",
            content: (
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <table className="w-full"><caption className="text-left font-medium mb-2">By status</caption><tbody>
                  {(query.data?.leadsByStatus ?? []).map((r) => (
                    <tr key={r.status} className="border-b"><td className="py-1 capitalize">{r.status}</td><td className="py-1 text-right">{r.n}</td></tr>
                  ))}
                </tbody></table>
                <table className="w-full"><caption className="text-left font-medium mb-2">By source</caption><tbody>
                  {(query.data?.leadsBySource ?? []).map((r) => (
                    <tr key={r.source} className="border-b"><td className="py-1">{r.source}</td><td className="py-1 text-right">{r.n}</td></tr>
                  ))}
                </tbody></table>
              </div>
            ),
          },
          {
            id: "activities",
            label: "Activity reports",
            content: (
              <div className="grid gap-3 text-sm">
                <p>Completed: {query.data?.activityStats.completed ?? 0} · Planned: {query.data?.activityStats.planned ?? 0} · Overdue: {query.data?.activityStats.overdue ?? 0}</p>
                <table className="w-full"><caption className="text-left font-medium mb-2">By owner</caption><tbody>
                  {(query.data?.activitiesByOwner ?? []).map((r) => (
                    <tr key={r.owner} className="border-b"><td className="py-1">{r.owner}</td><td className="py-1 text-right">{r.n}</td></tr>
                  ))}
                </tbody></table>
              </div>
            ),
          },
          {
            id: "sales",
            label: "Sales reports",
            content: (
              <table className="w-full text-sm"><caption className="text-left font-medium mb-2">Opportunities by stage</caption>
                <thead><tr><th className="text-left py-1">Stage</th><th className="text-right py-1">Count</th><th className="text-right py-1">Value</th></tr></thead>
                <tbody>
                  {(query.data?.opportunitiesByStage ?? []).map((r) => (
                    <tr key={r.stage} className="border-b">
                      <td className="py-1 capitalize">{r.stage.replaceAll("_", " ")}</td>
                      <td className="py-1 text-right">{r.n}</td>
                      <td className="py-1 text-right">{inr.format(r.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ),
          },
        ]}
      />
    </div>
  )
}
