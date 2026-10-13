import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/apps/inventory/components/PageHeader"
import { listItems, listWarehouses } from "@/apps/inventory/features/catalog/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, api } from "@/shared/lib/api-client"

export function IssuesPage() {
  const queryClient = useQueryClient()
  const warehouses = useQuery({ queryKey: ["inventory", "warehouses"], queryFn: listWarehouses })
  const items = useQuery({ queryKey: ["inventory", "items"], queryFn: listItems })
  const issues = useQuery({ queryKey: ["inventory", "issues"], queryFn: () => api<{ id: string; sku: string; name: string; warehouse: string; qty: number; issuedOn: string }[]>("/api/issues") })
  const [warehouseId, setWarehouseId] = useState("")
  const [itemId, setItemId] = useState("")
  const [qty, setQty] = useState("1")
  const [issuedOn, setIssuedOn] = useState("2026-10-01")
  const save = useMutation({
    mutationFn: () => api<{ belowReorder: boolean }>("/api/issues", { method: "POST", body: JSON.stringify({ warehouseId, itemId, qty: Number(qty), issuedOn }) }),
    onSuccess: async (result) => {
      if (result.belowReorder) window.alert("On-hand is now at or below the reorder level")
      toast("Stock issued")
      await queryClient.invalidateQueries({ queryKey: ["inventory"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not issue stock"),
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Stock out" description="Issue quantity from a warehouse." />
      <form className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); save.mutate() }}>
        <div className="grid gap-1.5">
          <Label htmlFor="issue-warehouse">Warehouse</Label>
          <select id="issue-warehouse" name="warehouse" className="h-10 rounded-md border border-border bg-background px-2 text-sm" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} required>
            <option value="">Choose</option>
            {(warehouses.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="issue-item">Item</Label>
          <select id="issue-item" name="item" className="h-10 rounded-md border border-border bg-background px-2 text-sm" value={itemId} onChange={(event) => setItemId(event.target.value)} required>
            <option value="">Choose</option>
            {(items.data ?? []).slice(0, 80).map((row) => <option key={row.id} value={row.id}>{row.sku} {row.name}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="issue-qty">Quantity</Label>
          <Input id="issue-qty" name="qty" type="number" min={1} value={qty} onChange={(event) => setQty(event.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="issue-date">Issued on</Label>
          <Input id="issue-date" name="issuedOn" type="date" value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} />
        </div>
        <Button type="submit" disabled={save.isPending}>Issue</Button>
      </form>
      <table className="w-full text-sm">
        <caption className="mb-2 text-left">Recent issues</caption>
        <thead><tr><th scope="col" className="border-b py-2 text-left">Date</th><th scope="col" className="border-b py-2 text-left">SKU</th><th scope="col" className="border-b py-2 text-left">Warehouse</th><th scope="col" className="border-b py-2 text-right">Qty</th></tr></thead>
        <tbody>
          {(issues.data ?? []).map((row) => (
            <tr key={row.id}><td className="border-b py-2">{String(row.issuedOn).slice(0, 10)}</td><td className="border-b py-2">{row.sku}</td><td className="border-b py-2">{row.warehouse}</td><td className="border-b py-2 text-right">{row.qty}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
