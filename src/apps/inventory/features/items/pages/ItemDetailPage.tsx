import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import { PageHeader } from "@/apps/inventory/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppFrame } from "@/shared/frames"
import { api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"
import { openAppPopup } from "@/shared/popup"

type Detail = {
  item: {
    id: string
    sku: string
    name: string
    barcode: string
    categoryName: string
    supplierName: string
    supplierCity: string
    supplierPhone: string
    uom: string
    reorderLevel: number
    unitCost: number
  }
  stock: { warehouse: string; qty: number }[]
  batches: { id: string; batchNo: string; manufacturedOn: string; expiresOn: string; qty: number }[]
  movements: { id: string; direction: string; qty: number; occurredOn: string; warehouse: string }[]
}

export function ItemDetailPage() {
  const { itemId = "" } = useParams()
  const query = useQuery({
    queryKey: ["inventory", "item", itemId],
    queryFn: () => api<Detail>(`/api/items/${itemId}`),
    enabled: Boolean(itemId),
  })
  const item = query.data?.item

  useEffect(() => {
    if (customElements.get("stock-badge")) return
    customElements.define(
      "stock-badge",
      class extends HTMLElement {
        connectedCallback() {
          const root = this.attachShadow({ mode: "open" })
          root.innerHTML = `<span style="font: 600 12px sans-serif">${this.getAttribute("label") ?? ""}</span>`
        }
      },
    )
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title={item ? `${item.sku} · ${item.name}` : "Item"}
        description={item ? `${item.categoryName} · ${item.uom}` : "Loading the item."}
        actions={
          <Button type="button" variant="outline" onClick={() => openAppPopup(`items/${itemId}/label`, { width: 420, height: 280 })}>
            Print label
          </Button>
        }
      />
      {query.isError ? <p className="text-sm text-destructive">Could not load this item.</p> : null}
      {item ? (
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="stock">Stock by warehouse</TabsTrigger>
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="movements">Movements</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <p>Barcode {item.barcode}. Reorder at {item.reorderLevel}. Unit cost ₹{item.unitCost}.</p>
            <div
              ref={(node) => {
                if (!node || node.childElementCount > 0) return
                const badge = document.createElement("stock-badge")
                badge.setAttribute("label", item.sku)
                node.appendChild(badge)
              }}
            />
            <div className="mt-4">
              <AppFrame title="Barcode label preview" src={`items/${itemId}/label`} />
            </div>
          </TabsContent>
          <TabsContent value="stock">
            <table className="w-full text-sm">
              <caption className="mb-2 text-left">Quantity on hand</caption>
              <thead><tr><th scope="col" className="border-b py-2 text-left">Warehouse</th><th scope="col" className="border-b py-2 text-right">Qty</th></tr></thead>
              <tbody>
                {query.data?.stock.map((row) => (
                  <tr key={row.warehouse}><td className="border-b py-2">{row.warehouse}</td><td className="border-b py-2 text-right">{row.qty}</td></tr>
                ))}
              </tbody>
            </table>
          </TabsContent>
          <TabsContent value="batches">
            <table className="w-full text-sm">
              <caption className="mb-2 text-left">Batches</caption>
              <thead><tr><th scope="col" className="border-b py-2 text-left">Batch</th><th scope="col" className="border-b py-2 text-left">Made</th><th scope="col" className="border-b py-2 text-left">Expires</th><th scope="col" className="border-b py-2 text-right">Qty</th></tr></thead>
              <tbody>
                {query.data?.batches.map((row) => (
                  <tr key={row.id}><td className="border-b py-2">{row.batchNo}</td><td className="border-b py-2">{String(row.manufacturedOn).slice(0, 10)}</td><td className="border-b py-2">{String(row.expiresOn).slice(0, 10)}</td><td className="border-b py-2 text-right">{row.qty}</td></tr>
                ))}
              </tbody>
            </table>
          </TabsContent>
          <TabsContent value="movements">
            <table className="w-full text-sm">
              <caption className="mb-2 text-left">Recent movements</caption>
              <thead><tr><th scope="col" className="border-b py-2 text-left">Date</th><th scope="col" className="border-b py-2 text-left">Warehouse</th><th scope="col" className="border-b py-2 text-left">Direction</th><th scope="col" className="border-b py-2 text-right">Qty</th></tr></thead>
              <tbody>
                {query.data?.movements.map((row) => (
                  <tr key={row.id}><td className="border-b py-2">{String(row.occurredOn).slice(0, 10)}</td><td className="border-b py-2">{row.warehouse}</td><td className="border-b py-2">{row.direction}</td><td className="border-b py-2 text-right">{row.qty}</td></tr>
                ))}
              </tbody>
            </table>
          </TabsContent>
          <TabsContent value="suppliers">
            <p>{item.supplierName}, {item.supplierCity}</p>
            <p>{item.supplierPhone}</p>
            <p className="mt-3"><Link className="underline" to={appPath("suppliers")}>All suppliers</Link></p>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  )
}

export function LabelPage() {
  const { itemId = "" } = useParams()
  const query = useQuery({ queryKey: ["inventory", "item", itemId], queryFn: () => api<Detail>(`/api/items/${itemId}`), enabled: Boolean(itemId) })
  const item = query.data?.item
  return (
    <main className="grid gap-3 p-6">
      <h1 className="text-lg font-semibold">Barcode label</h1>
      <p className="font-mono text-2xl">{item?.barcode ?? "…"}</p>
      <p>{item ? `${item.sku} ${item.name}` : "Loading"}</p>
      <button type="button" className="h-9 w-fit rounded-md border border-border px-3 text-sm" onClick={() => window.print()}>Print</button>
    </main>
  )
}
