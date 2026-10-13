import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/apps/inventory/components/PageHeader"
import { listItems, listSuppliers, listWarehouses } from "@/apps/inventory/features/catalog/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/shared/DatePicker"
import { ApiError, api } from "@/shared/lib/api-client"

type Reorder = { id: string; sku: string; name: string; reorderLevel: number; onHand: number; supplier: string }
type Order = { id: string; supplier: string; warehouse: string; status: string; expectedOn: string }

export function OrdersPage() {
  const queryClient = useQueryClient()
  const reorder = useQuery({ queryKey: ["inventory", "reorder"], queryFn: () => api<Reorder[]>("/api/reorder") })
  const orders = useQuery({ queryKey: ["inventory", "orders"], queryFn: () => api<Order[]>("/api/purchase-orders") })
  const suppliers = useQuery({ queryKey: ["inventory", "suppliers"], queryFn: listSuppliers })
  const warehouses = useQuery({ queryKey: ["inventory", "warehouses"], queryFn: listWarehouses })
  const items = useQuery({ queryKey: ["inventory", "items"], queryFn: listItems })
  const [supplierId, setSupplierId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [itemId, setItemId] = useState("")
  const [qty, setQty] = useState("20")
  const [expectedOn, setExpectedOn] = useState("2026-10-15")
  const save = useMutation({
    mutationFn: () => api("/api/purchase-orders", { method: "POST", body: JSON.stringify({ supplierId, warehouseId, expectedOn, lines: [{ itemId, qty: Number(qty) }] }) }),
    onSuccess: async () => {
      toast("Purchase order created")
      await queryClient.invalidateQueries({ queryKey: ["inventory", "orders"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not create the order"),
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Purchase orders" description="Reorder suggestions and expected delivery dates." />
      <section>
        <h2 className="mb-2 text-sm font-semibold">Below reorder</h2>
        <table className="w-full text-sm">
          <caption className="sr-only">Items at or below reorder</caption>
          <thead><tr><th scope="col" className="border-b py-2 text-left">SKU</th><th scope="col" className="border-b py-2 text-left">Item</th><th scope="col" className="border-b py-2 text-left">Supplier</th><th scope="col" className="border-b py-2 text-right">On hand</th><th scope="col" className="border-b py-2 text-right">Reorder</th></tr></thead>
          <tbody>
            {(reorder.data ?? []).map((row) => (
              <tr key={row.id}><td className="border-b py-2">{row.sku}</td><td className="border-b py-2">{row.name}</td><td className="border-b py-2">{row.supplier}</td><td className="border-b py-2 text-right">{row.onHand}</td><td className="border-b py-2 text-right">{row.reorderLevel}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <form className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); save.mutate() }}>
        <div className="grid gap-1.5">
          <Label htmlFor="po-supplier">Supplier</Label>
          <select id="po-supplier" className="h-10 rounded-md border border-border bg-background px-2 text-sm" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required>
            <option value="">Choose</option>
            {(suppliers.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="po-warehouse">Warehouse</Label>
          <select id="po-warehouse" className="h-10 rounded-md border border-border bg-background px-2 text-sm" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} required>
            <option value="">Choose</option>
            {(warehouses.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="po-item">Item</Label>
          <select id="po-item" className="h-10 rounded-md border border-border bg-background px-2 text-sm" value={itemId} onChange={(event) => setItemId(event.target.value)} required>
            <option value="">Choose</option>
            {(items.data ?? []).slice(0, 80).map((row) => <option key={row.id} value={row.id}>{row.sku}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="po-qty">Quantity</Label>
          <Input id="po-qty" type="number" min={1} value={qty} onChange={(event) => setQty(event.target.value)} />
        </div>
        <DatePicker id="po-expected" label="Expected on" value={expectedOn} onChange={setExpectedOn} />
        <div className="flex items-end"><Button type="submit" disabled={save.isPending}>Create order</Button></div>
      </form>
      <table className="w-full text-sm">
        <caption className="mb-2 text-left">Open orders</caption>
        <thead><tr><th scope="col" className="border-b py-2 text-left">Supplier</th><th scope="col" className="border-b py-2 text-left">Warehouse</th><th scope="col" className="border-b py-2 text-left">Expected</th><th scope="col" className="border-b py-2 text-left">Status</th></tr></thead>
        <tbody>
          {(orders.data ?? []).map((row) => (
            <tr key={row.id}><td className="border-b py-2">{row.supplier}</td><td className="border-b py-2">{row.warehouse}</td><td className="border-b py-2">{String(row.expectedOn).slice(0, 10)}</td><td className="border-b py-2">{row.status}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
