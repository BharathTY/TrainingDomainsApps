import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/apps/inventory/components/PageHeader"
import { listItems, listReasonCodes, listWarehouses } from "@/apps/inventory/features/catalog/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { NativeDialog } from "@/shared/NativeDialog"
import { OtpModal } from "@/shared/OtpModal"
import { ReauthModal } from "@/shared/ReauthModal"
import { ApiError, api } from "@/shared/lib/api-client"
import { fetchSession } from "@/shared/lib/session"

type Adjustment = { id: string; sku: string; name: string; warehouse: string; qty: number; reasonCode: string; adjustedOn: string }

export function AdjustmentsPage() {
  const queryClient = useQueryClient()
  const warehouses = useQuery({ queryKey: ["inventory", "warehouses"], queryFn: listWarehouses })
  const items = useQuery({ queryKey: ["inventory", "items"], queryFn: listItems })
  const reasons = useQuery({ queryKey: ["inventory", "reasons"], queryFn: listReasonCodes })
  const rows = useQuery({ queryKey: ["inventory", "adjustments"], queryFn: () => api<Adjustment[]>("/api/adjustments") })
  const [warehouseId, setWarehouseId] = useState("")
  const [itemId, setItemId] = useState("")
  const [qty, setQty] = useState("-1")
  const [reasonCode, setReasonCode] = useState("DAMAGE")
  const [adjustedOn, setAdjustedOn] = useState("2026-10-01")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reauthOpen, setReauthOpen] = useState(false)
  const [otpOpen, setOtpOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const save = useMutation({
    mutationFn: (body: { warehouseId: string; itemId: string; qty: number; reasonCode: string; adjustedOn: string }) =>
      api("/api/adjustments", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      toast("Adjustment posted")
      await queryClient.invalidateQueries({ queryKey: ["inventory"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not adjust stock"),
  })

  function ask() {
    const note = window.prompt("Reason note", "Count variance")
    if (note === null) return
    if (reasonCode === "WRITEOFF") {
      setReauthOpen(true)
      return
    }
    setConfirmOpen(true)
  }

  const payload = { warehouseId, itemId, qty: Number(qty), reasonCode, adjustedOn }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Adjustments" description="Correct stock with a reason code." actions={<Button type="button" variant="outline" onClick={() => setQuickOpen(true)}>Quick adjust</Button>} />
      <form className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); ask() }}>
        <div className="grid gap-1.5">
          <Label htmlFor="adj-warehouse">Warehouse</Label>
          <select id="adj-warehouse" className="h-10 rounded-md border border-border bg-background px-2 text-sm" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} required>
            <option value="">Choose</option>
            {(warehouses.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="adj-item">Item</Label>
          <select id="adj-item" className="h-10 rounded-md border border-border bg-background px-2 text-sm" value={itemId} onChange={(event) => setItemId(event.target.value)} required>
            <option value="">Choose</option>
            {(items.data ?? []).slice(0, 80).map((row) => <option key={row.id} value={row.id}>{row.sku}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="adj-qty">Quantity change</Label>
          <Input id="adj-qty" type="number" value={qty} onChange={(event) => setQty(event.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="adj-reason">Reason</Label>
          <select id="adj-reason" className="h-10 rounded-md border border-border bg-background px-2 text-sm" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)}>
            {(reasons.data ?? []).map((row) => <option key={row.code} value={row.code}>{row.label}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="adj-date">Date</Label>
          <Input id="adj-date" type="date" value={adjustedOn} onChange={(event) => setAdjustedOn(event.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">Post adjustment</Button>
          <Button type="button" variant="outline" onClick={() => setOtpOpen(true)}>Bulk adjust</Button>
        </div>
      </form>
      <table className="w-full text-sm">
        <caption className="mb-2 text-left">Adjustments</caption>
        <thead><tr><th scope="col" className="border-b py-2 text-left">Date</th><th scope="col" className="border-b py-2 text-left">SKU</th><th scope="col" className="border-b py-2 text-left">Reason</th><th scope="col" className="border-b py-2 text-right">Qty</th></tr></thead>
        <tbody>
          {(rows.data ?? []).map((row) => (
            <tr key={row.id}><td className="border-b py-2">{String(row.adjustedOn).slice(0, 10)}</td><td className="border-b py-2">{row.sku}</td><td className="border-b py-2">{row.reasonCode}</td><td className="border-b py-2 text-right">{row.qty}</td></tr>
          ))}
        </tbody>
      </table>
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Post this adjustment?" description="The quantity change is written to the ledger." confirmLabel="Post" onConfirm={async () => {
        await save.mutateAsync(payload)
      }} />
      <ReauthModal open={reauthOpen} onClose={() => setReauthOpen(false)} onSubmit={(password) => {
        void fetchSession().then((session) => api("/api/login", { method: "POST", body: JSON.stringify({ username: session.username, password }) })).then(() => {
          setReauthOpen(false)
          setConfirmOpen(true)
        }).catch(() => toast("Password did not match"))
      }} />
      <OtpModal open={otpOpen} onClose={() => setOtpOpen(false)} onSubmit={(code) => {
        if (code !== "123456") {
          toast("The code is 123456")
          return
        }
        setOtpOpen(false)
        if (!window.confirm("Apply this adjustment to the selected item?")) return
        save.mutate(payload)
      }} />
      <NativeDialog open={quickOpen} title="Quick adjust" onClose={() => setQuickOpen(false)}>
        <p>Use the form to post a counted variance, damage, expiry, or write-off.</p>
      </NativeDialog>
    </div>
  )
}
