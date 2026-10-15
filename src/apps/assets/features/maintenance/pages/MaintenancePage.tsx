import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/apps/assets/components/PageHeader"
import { can } from "@/apps/assets/config/permissions"
import { asRows, loadLookups, loadPaged } from "@/apps/assets/features/catalog/api"
import { lookupOptions } from "@/apps/assets/features/shared/CrudResourcePage"
import { useUiStore } from "@/apps/assets/stores/ui-store"
import { Button } from "@/components/ui/button"
import { NativeDialog } from "@/shared/NativeDialog"
import { DataTable } from "@/shared/DataTable"
import { FormDrawer } from "@/shared/FormDrawer"
import { ApiError, api } from "@/shared/lib/api-client"

type Row = {
  id: string
  workOrderNo: string
  asset: string
  assetNo: string
  maintenanceType: string
  priority: string
  status: string
  scheduledAt: string
  estimatedCost: number
}

const schema = z.object({
  assetId: z.string().min(1),
  maintenanceType: z.enum(["preventive", "corrective"]),
  issueDescription: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]),
  scheduledAt: z.string().optional(),
  assignedTechnician: z.string().optional(),
  estimatedCost: z.coerce.number().nonnegative(),
})

const NEXT: Record<string, string[]> = {
  open: ["scheduled", "in_progress", "on_hold", "closed"],
  scheduled: ["in_progress", "on_hold", "closed"],
  in_progress: ["on_hold", "completed", "closed"],
  on_hold: ["scheduled", "in_progress", "closed"],
  completed: ["closed"],
  closed: [],
}

export function MaintenancePage() {
  const role = useUiStore((s) => s.role)
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [completeId, setCompleteId] = useState<string | null>(null)
  const canCreate = can(role, "maintenance", "create")
  const canEdit = can(role, "maintenance", "edit")
  const list = useQuery({
    queryKey: ["assets", "work-orders"],
    queryFn: () => loadPaged<Row>("/api/work-orders", { page: 1, pageSize: 100 }),
  })
  const lookups = useQuery({ queryKey: ["assets", "lookups"], queryFn: loadLookups })

  const create = useMutation({
    mutationFn: (values: Record<string, unknown>) => api("/api/work-orders", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => {
      toast.success("Work order created")
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["assets"] })
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Create failed"),
  })

  const setStatus = async (id: string, status: string, extra?: Record<string, unknown>) => {
    try {
      await api(`/api/work-orders/${id}/status`, { method: "POST", body: JSON.stringify({ status, ...extra }) })
      toast(`Status → ${status}`)
      await queryClient.invalidateQueries({ queryKey: ["assets", "work-orders"] })
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Transition failed")
    }
  }

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      { accessorKey: "workOrderNo", header: "WO" },
      { accessorKey: "assetNo", header: "Asset" },
      { accessorKey: "maintenanceType", header: "Type" },
      { accessorKey: "priority", header: "Priority" },
      { accessorKey: "status", header: "Status" },
      { accessorKey: "scheduledAt", header: "Scheduled" },
      { accessorKey: "estimatedCost", header: "Est. cost" },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) =>
          canEdit ? (
            <div className="flex flex-wrap gap-1">
              {(NEXT[row.original.status] ?? []).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid={`wo-${row.original.id}-${status}`}
                  onClick={() => {
                    if (status === "completed") {
                      setCompleteId(row.original.id)
                      return
                    }
                    void setStatus(row.original.id, status)
                  }}
                >
                  {status}
                </Button>
              ))}
            </div>
          ) : null,
      },
    ],
    [canEdit],
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Maintenance work orders"
        description="Preventive and corrective WO workflow with valid status transitions only."
        actions={
          canCreate ? (
            <Button type="button" data-testid="add-work-order" onClick={() => setOpen(true)}>
              Create work order
            </Button>
          ) : null
        }
      />
      <DataTable
        columns={columns}
        data={asRows(list.data ?? [])}
        getRowId={(row) => row.id}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => void list.refetch()}
        searchPlaceholder="Search work orders"
        filename="work-orders.csv"
        emptyTitle="No work orders"
        emptyDescription="Create a preventive or corrective work order."
      />
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="Create work order"
        description="Synthetic maintenance request."
        schema={schema}
        defaultValues={{
          assetId: "",
          maintenanceType: "preventive",
          issueDescription: "",
          priority: "medium",
          scheduledAt: "",
          assignedTechnician: "tech",
          estimatedCost: 1000,
        }}
        fields={[
          { name: "assetId", label: "Asset", type: "select", options: lookupOptions(lookups.data?.assets) },
          {
            name: "maintenanceType",
            label: "Type",
            type: "select",
            options: [
              { label: "Preventive", value: "preventive" },
              { label: "Corrective", value: "corrective" },
            ],
          },
          { name: "issueDescription", label: "Issue description", type: "textarea" },
          {
            name: "priority",
            label: "Priority",
            type: "select",
            options: [
              { label: "Low", value: "low" },
              { label: "Medium", value: "medium" },
              { label: "High", value: "high" },
              { label: "Critical", value: "critical" },
            ],
          },
          { name: "scheduledAt", label: "Scheduled (datetime)", type: "datetime-local" },
          { name: "assignedTechnician", label: "Technician", type: "text" },
          { name: "estimatedCost", label: "Estimated cost", type: "number" },
        ]}
        submitLabel="Create"
        onSubmit={async (values) => {
          await create.mutateAsync(values)
        }}
      />
      <NativeDialog open={Boolean(completeId)} onClose={() => setCompleteId(null)} title="Complete maintenance">
        <form
          className="space-y-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            if (!completeId) return
            void setStatus(completeId, "completed", {
              actualCost: Number(fd.get("actualCost") || 0),
              technicianNotes: String(fd.get("notes") || ""),
              partsReplaced: String(fd.get("parts") || ""),
            }).then(() => setCompleteId(null))
          }}
        >
          <label className="block">
            Actual cost
            <input name="actualCost" type="number" min={0} className="mt-1 h-9 w-full rounded-md border border-input px-2" required />
          </label>
          <label className="block">
            Technician notes
            <textarea name="notes" className="mt-1 w-full rounded-md border border-input px-2 py-1" rows={3} />
          </label>
          <label className="block">
            Parts replaced
            <input name="parts" type="text" className="mt-1 h-9 w-full rounded-md border border-input px-2" />
          </label>
          <Button type="submit">Mark completed</Button>
        </form>
      </NativeDialog>
    </div>
  )
}
