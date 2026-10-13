import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/apps/inventory/components/PageHeader"
import { listItems, listWarehouses } from "@/apps/inventory/features/catalog/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChildWindowPicker, postPick } from "@/shared/ChildWindowPicker"
import { DatePicker } from "@/shared/DatePicker"
import { Modal } from "@/shared/Modal"
import { NativeDialog } from "@/shared/NativeDialog"
import { ApiError, api } from "@/shared/lib/api-client"

type Line = { key: string; itemId: string; qty: string; batchNo: string; manufacturedOn: string; expiresOn: string }

export function GrnPage() {
  const queryClient = useQueryClient()
  const warehouses = useQuery({ queryKey: ["inventory", "warehouses"], queryFn: listWarehouses })
  const items = useQuery({ queryKey: ["inventory", "items"], queryFn: listItems })
  const [warehouseId, setWarehouseId] = useState("")
  const [receivedOn, setReceivedOn] = useState("2026-10-01")
  const [lines, setLines] = useState<Line[]>([])
  const [batchOpen, setBatchOpen] = useState(false)
  const [nativeOpen, setNativeOpen] = useState(false)
  const [draft, setDraft] = useState({ batchNo: "", manufacturedOn: "2026-09-01", expiresOn: "2027-09-01", qty: "10" })
  const save = useMutation({
    mutationFn: () => api("/api/grns", {
      method: "POST",
      body: JSON.stringify({
        warehouseId: warehouseId || warehouses.data?.[0]?.id,
        receivedOn,
        lines: lines.map((line) => ({ ...line, qty: Number(line.qty) })),
      }),
    }),
    onSuccess: async () => {
      toast("Goods received")
      setLines([])
      await queryClient.invalidateQueries({ queryKey: ["inventory"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not receive stock"),
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Stock in" description="Goods receipt against a purchase order." />
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="grn-warehouse">Warehouse</Label>
          <select id="grn-warehouse" name="warehouse" className="h-10 rounded-md border border-border bg-background px-2 text-sm" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
            <option value="">Choose</option>
            {(warehouses.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </div>
        <DatePicker id="grn-date" label="Received on" value={receivedOn} onChange={setReceivedOn} />
        <ChildWindowPicker id="grn-item" label="Item" popupPath="pick-item" value="" onPick={(itemId) => {
          const item = items.data?.find((row) => row.id === itemId)
          setLines((current) => [...current, { key: crypto.randomUUID(), itemId, qty: "1", batchNo: item?.sku ?? "BATCH", manufacturedOn: "2026-09-01", expiresOn: "2027-09-01" }])
        }} />
      </div>
      <table className="w-full text-sm">
        <caption className="mb-2 text-left">Receipt lines</caption>
        <thead><tr><th scope="col" className="border-b py-2 text-left">Item</th><th scope="col" className="border-b py-2 text-left">Qty</th><th scope="col" className="border-b py-2 text-left">Batch</th></tr></thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.key}>
              <td className="border-b py-2">{items.data?.find((item) => item.id === line.itemId)?.sku ?? line.itemId}</td>
              <td className="border-b py-2"><Input id={`qty-${line.key}`} name={`qty-${line.key}`} type="number" value={line.qty} onChange={(event) => setLines((current) => current.map((row) => row.key === line.key ? { ...row, qty: event.target.value } : row))} /></td>
              <td className="border-b py-2">{line.batchNo}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setBatchOpen(true)}>Add batch</Button>
        <Button type="button" variant="outline" onClick={() => setNativeOpen(true)}>Quick batch</Button>
        <Button type="button" disabled={lines.length === 0 || save.isPending} onClick={() => save.mutate()}>Receive</Button>
      </div>
      <Modal open={batchOpen} title="Add a batch" onClose={() => setBatchOpen(false)}>
        <form className="grid gap-2" onSubmit={(event) => {
          event.preventDefault()
          if (draft.expiresOn <= draft.manufacturedOn) {
            toast("Expiry must be after the manufacture date")
            return
          }
          const itemId = lines[0]?.itemId || items.data?.[0]?.id || ""
          if (!itemId) return
          setLines((current) => [...current, { key: crypto.randomUUID(), itemId, qty: draft.qty, batchNo: draft.batchNo, manufacturedOn: draft.manufacturedOn, expiresOn: draft.expiresOn }])
          setBatchOpen(false)
        }}>
          <Label htmlFor="batch-no">Batch</Label>
          <Input id="batch-no" value={draft.batchNo} onChange={(event) => setDraft({ ...draft, batchNo: event.target.value })} />
          <DatePicker id="mfg" label="Manufactured" value={draft.manufacturedOn} onChange={(value) => setDraft({ ...draft, manufacturedOn: value })} />
          <DatePicker id="exp" label="Expires" value={draft.expiresOn} onChange={(value) => setDraft({ ...draft, expiresOn: value })} />
          <Button type="submit">Add line</Button>
        </form>
      </Modal>
      <NativeDialog open={nativeOpen} title="Quick batch" onClose={() => setNativeOpen(false)}>
        <p>Use Add batch to capture manufacture and expiry dates.</p>
      </NativeDialog>
    </div>
  )
}

export function PickItemPage() {
  const items = useQuery({ queryKey: ["inventory", "items"], queryFn: listItems })
  return (
    <main className="grid gap-2 p-4">
      <h1 className="text-lg font-semibold">Select item</h1>
      <ul className="grid gap-1">
        {(items.data ?? []).slice(0, 40).map((item) => (
          <li key={item.id}>
            <button type="button" className="text-left text-sm underline" onClick={() => postPick("grn-item", item.id)}>{item.sku} {item.name}</button>
          </li>
        ))}
      </ul>
    </main>
  )
}
