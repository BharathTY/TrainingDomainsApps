import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/apps/inventory/components/PageHeader"
import { listWarehouses } from "@/apps/inventory/features/catalog/api"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CalendarView } from "@/shared/CalendarView"
import { DatePicker } from "@/shared/DatePicker"
import { ApiError, api } from "@/shared/lib/api-client"

type Count = { id: string; warehouse: string; scheduledOn: string; status: string }

export function CountsPage() {
  const queryClient = useQueryClient()
  const warehouses = useQuery({ queryKey: ["inventory", "warehouses"], queryFn: listWarehouses })
  const counts = useQuery({ queryKey: ["inventory", "counts"], queryFn: () => api<Count[]>("/api/cycle-counts") })
  const [warehouseId, setWarehouseId] = useState("")
  const [scheduledOn, setScheduledOn] = useState("2026-10-20")
  const save = useMutation({
    mutationFn: () => api("/api/cycle-counts", { method: "POST", body: JSON.stringify({ warehouseId, scheduledOn }) }),
    onSuccess: async () => {
      toast("Count scheduled")
      await queryClient.invalidateQueries({ queryKey: ["inventory", "counts"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not schedule the count"),
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Cycle count" description="Schedule a warehouse count." />
      <CalendarView month={scheduledOn.slice(0, 7)} />
      <form className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); save.mutate() }}>
        <div className="grid gap-1.5">
          <Label htmlFor="count-warehouse">Warehouse</Label>
          <select id="count-warehouse" className="h-10 rounded-md border border-border bg-background px-2 text-sm" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} required>
            <option value="">Choose</option>
            {(warehouses.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </div>
        <DatePicker id="count-date" label="Scheduled on" value={scheduledOn} onChange={setScheduledOn} />
        <div className="flex items-end"><Button type="submit" disabled={save.isPending}>Schedule</Button></div>
      </form>
      <table className="w-full text-sm">
        <caption className="mb-2 text-left">Count sheets</caption>
        <thead><tr><th scope="col" className="border-b py-2 text-left">Date</th><th scope="col" className="border-b py-2 text-left">Warehouse</th><th scope="col" className="border-b py-2 text-left">Status</th></tr></thead>
        <tbody>
          {(counts.data ?? []).map((row) => (
            <tr key={row.id}><td className="border-b py-2">{String(row.scheduledOn).slice(0, 10)}</td><td className="border-b py-2">{row.warehouse}</td><td className="border-b py-2">{row.status}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
