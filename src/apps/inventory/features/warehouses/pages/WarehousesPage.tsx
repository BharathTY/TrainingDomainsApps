import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "@/apps/inventory/components/PageHeader"
import { listWarehouses } from "@/apps/inventory/features/catalog/api"
import { AppFrame } from "@/shared/frames"
import { api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"
import { TreeList, type TreeNode } from "@/shared/TreeList"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

type TreePayload = {
  zones: { id: string; name: string }[]
  racks: { id: string; zone_id: string; name: string }[]
  bins: { id: string; rack_id: string; name: string }[]
}

export function WarehousesPage() {
  const warehouses = useQuery({ queryKey: ["inventory", "warehouses"], queryFn: listWarehouses })
  const [warehouseId, setWarehouseId] = useState("")
  const [rackId, setRackId] = useState("")
  const activeId = warehouseId || warehouses.data?.[0]?.id || ""
  const tree = useQuery({
    queryKey: ["inventory", "warehouse-tree", activeId],
    queryFn: () => api<TreePayload>(`/api/warehouses/${activeId}/tree`),
    enabled: Boolean(activeId),
  })
  const bins = useQuery({
    queryKey: ["inventory", "bins", rackId],
    queryFn: () => new Promise<TreePayload["bins"]>((resolve) => {
      window.setTimeout(() => resolve((tree.data?.bins ?? []).filter((bin) => bin.rack_id === rackId)), 800)
    }),
    enabled: Boolean(rackId) && Boolean(tree.data),
  })
  const nodes = useMemo<TreeNode[]>(() => {
    const zones = tree.data?.zones ?? []
    const racks = tree.data?.racks ?? []
    return zones.map((zone) => ({
      id: zone.id,
      label: zone.name,
      children: racks.filter((rack) => rack.zone_id === zone.id).map((rack) => ({ id: rack.id, label: rack.name })),
    }))
  }, [tree.data])
  const active = warehouses.data?.find((row) => row.id === activeId)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Warehouses" description="Zones, racks, and bins." />
      <div className="flex flex-wrap gap-2">
        {(warehouses.data ?? []).map((row) => (
          <button key={row.id} type="button" className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={() => { setWarehouseId(row.id); setRackId("") }}>
            {row.name}
          </button>
        ))}
      </div>
      {active ? <p className="text-sm text-muted-foreground">{active.city} · {inr.format(Number(active.value))}</p> : null}
      <svg viewBox="0 0 320 80" className="h-24 w-full max-w-xl rounded-lg border border-border bg-card" role="img" aria-label="Warehouse map">
        {(tree.data?.racks ?? []).map((rack, index) => (
          <g key={rack.id} onClick={() => setRackId(rack.id)} className="cursor-pointer">
            <rect x={12 + (index % 8) * 38} y={16} width="32" height="48" rx="4" fill={rackId === rack.id ? "#5E2A6B" : "#EDE4F0"} />
            <text x={28 + (index % 8) * 38} y={44} textAnchor="middle" fontSize="10" fill={rackId === rack.id ? "#fff" : "#5E2A6B"}>{rack.name.replace("Rack ", "R")}</text>
          </g>
        ))}
      </svg>
      <TreeList nodes={nodes} selectedId={rackId} onSelect={setRackId} label="Warehouse locations" />
      <section>
        <h2 className="mb-2 text-sm font-semibold">Bin contents</h2>
        {bins.isLoading ? <p className="text-sm text-muted-foreground">Loading bins…</p> : null}
        <ul className="text-sm">
          {(bins.data ?? []).map((bin) => <li key={bin.id}>{bin.name}</li>)}
        </ul>
        <div className="mt-3">
          <AppFrame
            title="Warehouse map"
            srcdoc={`<iframe title="Rack" srcdoc="&lt;p&gt;Rack ${rackId || "map"}&lt;/p&gt;&lt;iframe title=&quot;Bin contents&quot; srcdoc=&quot;&lt;p&gt;Bin contents load here.&lt;/p&gt;&quot;&gt;&lt;/iframe&gt;"></iframe>`}
          />
        </div>
        <p className="mt-2 text-sm"><Link className="underline" to={appPath("reports")}>Open valuation</Link></p>
      </section>
    </div>
  )
}
