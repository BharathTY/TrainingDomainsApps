import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/apps/inventory/components/PageHeader"
import { listItems, listWarehouses } from "@/apps/inventory/features/catalog/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Modal } from "@/shared/Modal"
import { ApiError, api } from "@/shared/lib/api-client"

export function TransfersPage() {
  const queryClient = useQueryClient()
  const warehouses = useQuery({ queryKey: ["inventory", "warehouses"], queryFn: listWarehouses })
  const items = useQuery({ queryKey: ["inventory", "items"], queryFn: listItems })
  const transfers = useQuery({ queryKey: ["inventory", "transfers"], queryFn: () => api<{ id: string; fromWarehouse: string; toWarehouse: string; status: string; movedOn: string }[]>("/api/transfers") })
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [fromWarehouseId, setFromWarehouseId] = useState("")
  const [toWarehouseId, setToWarehouseId] = useState("")
  const [itemId, setItemId] = useState("")
  const [qty, setQty] = useState("1")
  const [movedOn, setMovedOn] = useState("2026-10-01")
  const save = useMutation({
    mutationFn: () => api("/api/transfers", { method: "POST", body: JSON.stringify({ fromWarehouseId, toWarehouseId, movedOn, lines: [{ itemId, qty: Number(qty) }] }) }),
    onSuccess: async () => {
      toast("Transfer posted")
      setOpen(false)
      setStep(1)
      await queryClient.invalidateQueries({ queryKey: ["inventory"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not transfer stock"),
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Transfers" description="Move stock between warehouses." actions={<Button type="button" onClick={() => setOpen(true)}>New transfer</Button>} />
      <table className="w-full text-sm">
        <caption className="mb-2 text-left">Transfers</caption>
        <thead><tr><th scope="col" className="border-b py-2 text-left">Date</th><th scope="col" className="border-b py-2 text-left">From</th><th scope="col" className="border-b py-2 text-left">To</th><th scope="col" className="border-b py-2 text-left">Status</th></tr></thead>
        <tbody>
          {(transfers.data ?? []).map((row) => (
            <tr key={row.id}><td className="border-b py-2">{String(row.movedOn).slice(0, 10)}</td><td className="border-b py-2">{row.fromWarehouse}</td><td className="border-b py-2">{row.toWarehouse}</td><td className="border-b py-2">{row.status}</td></tr>
          ))}
        </tbody>
      </table>
      <Modal open={open} title={`Transfer · step ${step} of 2`} onClose={() => setOpen(false)}>
        {step === 1 ? (
          <div className="grid gap-2">
            <Label htmlFor="from-wh">From</Label>
            <select id="from-wh" className="h-10 rounded-md border border-border bg-background px-2 text-sm" value={fromWarehouseId} onChange={(event) => setFromWarehouseId(event.target.value)}>
              <option value="">Choose</option>
              {(warehouses.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
            <Label htmlFor="to-wh">To</Label>
            <select id="to-wh" className="h-10 rounded-md border border-border bg-background px-2 text-sm" value={toWarehouseId} onChange={(event) => setToWarehouseId(event.target.value)}>
              <option value="">Choose</option>
              {(warehouses.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
            <Button type="button" onClick={() => setStep(2)}>Next</Button>
          </div>
        ) : (
          <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); save.mutate() }}>
            <Label htmlFor="transfer-item">Item</Label>
            <select id="transfer-item" className="h-10 rounded-md border border-border bg-background px-2 text-sm" value={itemId} onChange={(event) => setItemId(event.target.value)} required>
              <option value="">Choose</option>
              {(items.data ?? []).slice(0, 80).map((row) => <option key={row.id} value={row.id}>{row.sku}</option>)}
            </select>
            <Label htmlFor="transfer-qty">Quantity</Label>
            <Input id="transfer-qty" type="number" min={1} value={qty} onChange={(event) => setQty(event.target.value)} />
            <Label htmlFor="transfer-date">Moved on</Label>
            <Input id="transfer-date" type="date" value={movedOn} onChange={(event) => setMovedOn(event.target.value)} />
            <Button type="submit" disabled={save.isPending}>Post transfer</Button>
          </form>
        )}
      </Modal>
    </div>
  )
}
