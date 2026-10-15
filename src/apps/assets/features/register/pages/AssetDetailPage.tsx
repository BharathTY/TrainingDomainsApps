import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { PageHeader } from "@/apps/assets/components/PageHeader"
import { Tabs } from "@/shared/Tabs"
import { api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"

type Detail = {
  asset: Record<string, unknown>
  assignments: { assignmentNo: string; assignedAt: string; employee: string; reason: string; active: boolean }[]
  workOrders: { id: string; workOrderNo: string; maintenanceType: string; status: string; priority: string }[]
  activity: { action: string; details: string; actor: string; createdAt: string }[]
}

export function AssetDetailPage() {
  const { assetId = "" } = useParams()
  const query = useQuery({
    queryKey: ["assets", "register", assetId],
    queryFn: () => api<Detail>(`/api/register/${assetId}`),
    enabled: Boolean(assetId),
  })
  const asset = query.data?.asset

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title={asset ? String(asset.name) : "Asset detail"}
        description="Profile tabs, work orders, and assignment history."
        actions={
          <div className="flex flex-wrap gap-2 text-sm">
            <Link className="underline" to={appPath("assets")}>Back to register</Link>
            <a className="underline" href={appPath(`assets/${assetId}`)} target="_blank" rel="noopener noreferrer" data-testid="open-asset-tab">
              Open in new tab
            </a>
          </div>
        }
      />
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {query.isError ? <p className="text-sm text-destructive" role="alert">Asset not found.</p> : null}
      {asset ? (
        <article data-asset-id={String(asset.id)} data-testid="asset-detail">
          <Tabs
            tabs={[
              {
                id: "overview",
                label: "Overview",
                content: (
                  <dl className="grid gap-2 sm:grid-cols-2 text-sm">
                    <div><dt className="text-muted-foreground">Asset ID</dt><dd>{String(asset.assetNo)}</dd></div>
                    <div><dt className="text-muted-foreground">Tag</dt><dd>{String(asset.assetTag)}</dd></div>
                    <div><dt className="text-muted-foreground">Serial</dt><dd>{String(asset.serialNumber)}</dd></div>
                    <div><dt className="text-muted-foreground">Status</dt><dd data-status={String(asset.status)}>{String(asset.status)}</dd></div>
                    <div><dt className="text-muted-foreground">Category</dt><dd>{String(asset.category)}</dd></div>
                    <div><dt className="text-muted-foreground">Book value</dt><dd>{String(asset.bookValue)}</dd></div>
                  </dl>
                ),
              },
              {
                id: "specs",
                label: "Specifications",
                content: (
                  <div className="text-sm space-y-1">
                    <p><strong>Manufacturer:</strong> {String(asset.manufacturer)}</p>
                    <p><strong>Model:</strong> {String(asset.modelNumber)}</p>
                    <p><em>{String(asset.description)}</em></p>
                  </div>
                ),
              },
              {
                id: "assignments",
                label: "Assignments",
                content: (
                  <table className="w-full text-sm">
                    <caption className="sr-only">Assignment history</caption>
                    <thead><tr><th scope="col">No</th><th scope="col">Employee</th><th scope="col">Date</th><th scope="col">Active</th></tr></thead>
                    <tbody>
                      {(query.data?.assignments ?? []).map((row) => (
                        <tr key={row.assignmentNo}>
                          <td>{row.assignmentNo}</td>
                          <td>{row.employee}</td>
                          <td>{String(row.assignedAt).slice(0, 10)}</td>
                          <td>{row.active ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ),
              },
              {
                id: "maintenance",
                label: "Maintenance",
                content: (
                  <ul className="space-y-1 text-sm">
                    {(query.data?.workOrders ?? []).map((row) => (
                      <li key={row.id}>
                        <Link className="underline" to={appPath("maintenance")} target="_blank" rel="noopener noreferrer">
                          {row.workOrderNo}
                        </Link>{" "}
                        — {row.maintenanceType} / {row.status}
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                id: "activity",
                label: "Audit",
                content: (
                  <ul className="space-y-1 text-sm">
                    {(query.data?.activity ?? []).map((row, i) => (
                      <li key={`${row.createdAt}-${i}`}><strong>{row.action}</strong> — {row.details}</li>
                    ))}
                  </ul>
                ),
              },
            ]}
          />
        </article>
      ) : null}
    </div>
  )
}
