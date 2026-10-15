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
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { DataTable } from "@/shared/DataTable"
import { FormDrawer } from "@/shared/FormDrawer"
import { ApiError, api } from "@/shared/lib/api-client"

type Row = {
  id: string
  assignmentNo: string
  assetId: string
  assetNo: string
  asset: string
  employee: string
  department: string
  location: string
  assignedAt: string
  approvalStatus: string
  active: boolean
}

const assignSchema = z.object({
  assetId: z.string().min(1),
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
  assignedAt: z.string().min(1),
  reason: z.string().optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]),
})

const transferSchema = z.object({
  employeeId: z.string().min(1),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
  assignedAt: z.string().min(1),
  reason: z.string().min(1, "Transfer reason is required"),
  approvalStatus: z.enum(["pending", "approved", "rejected"]),
})

export function AssignmentsPage() {
  const role = useUiStore((s) => s.role)
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [transferRow, setTransferRow] = useState<Row | null>(null)
  const [returnRow, setReturnRow] = useState<Row | null>(null)
  const canCreate = can(role, "assignments", "create")
  const canEdit = can(role, "assignments", "edit")
  const list = useQuery({ queryKey: ["assets", "assignments"], queryFn: () => loadPaged<Row>("/api/assignments", { page: 1, pageSize: 100 }) })
  const lookups = useQuery({ queryKey: ["assets", "lookups"], queryFn: loadLookups })

  const create = useMutation({
    mutationFn: (values: Record<string, unknown>) => api("/api/assignments", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => {
      toast.success("Asset assigned")
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["assets"] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Assign failed"),
  })

  const transfer = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      if (!transferRow) throw new Error("No assignment selected")
      return api(`/api/assignments/${transferRow.id}/transfer`, {
        method: "POST",
        body: JSON.stringify({
          assetId: transferRow.assetId,
          ...values,
        }),
      })
    },
    onSuccess: async () => {
      toast.success("Asset transferred")
      setTransferRow(null)
      await queryClient.invalidateQueries({ queryKey: ["assets"] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Transfer failed"),
  })

  const returnAsset = useMutation({
    mutationFn: async () => {
      if (!returnRow) return
      await api(`/api/assignments/${returnRow.id}/return`, { method: "POST", body: "{}" })
    },
    onSuccess: async () => {
      toast.success("Asset returned to pool")
      setReturnRow(null)
      await queryClient.invalidateQueries({ queryKey: ["assets"] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Return failed"),
  })

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      { accessorKey: "assignmentNo", header: "Assignment" },
      { accessorKey: "assetNo", header: "Asset" },
      { accessorKey: "employee", header: "Employee" },
      { accessorKey: "location", header: "Location" },
      { accessorKey: "assignedAt", header: "Assigned" },
      { accessorKey: "approvalStatus", header: "Approval" },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) =>
          row.original.active && canEdit ? (
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid={`transfer-${row.original.id}`}
                onClick={() => setTransferRow(row.original)}
              >
                Transfer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                data-testid={`return-${row.original.id}`}
                onClick={() => setReturnRow(row.original)}
              >
                Return
              </Button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">{row.original.active ? "—" : "Closed"}</span>
          ),
      },
    ],
    [canEdit],
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Assignments & transfers"
        description="One active assignment per asset. Transfer and return open a side panel."
        actions={
          canCreate ? (
            <Button type="button" data-testid="add-assignment" onClick={() => setOpen(true)}>
              Assign asset
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
        searchPlaceholder="Search assignments"
        filename="assignments.csv"
        emptyTitle="No assignments"
        emptyDescription="Assign an asset to an employee or department."
      />

      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="Assign asset"
        description="Choose the asset, assignee, and location."
        schema={assignSchema}
        defaultValues={{
          assetId: "",
          employeeId: "",
          departmentId: "",
          locationId: "",
          assignedAt: new Date().toISOString().slice(0, 10),
          reason: "",
          approvalStatus: "approved",
        }}
        fields={[
          { name: "assetId", label: "Asset", type: "select", options: lookupOptions(lookups.data?.assets) },
          { name: "employeeId", label: "Employee", type: "select", options: lookupOptions(lookups.data?.employees) },
          { name: "departmentId", label: "Department", type: "select", options: lookupOptions(lookups.data?.departments) },
          { name: "locationId", label: "Location", type: "select", options: lookupOptions(lookups.data?.locations) },
          { name: "assignedAt", label: "Assigned date", type: "date" },
          { name: "reason", label: "Reason", type: "textarea" },
          {
            name: "approvalStatus",
            label: "Approval",
            type: "select",
            options: [
              { label: "Approved", value: "approved" },
              { label: "Pending", value: "pending" },
              { label: "Rejected", value: "rejected" },
            ],
          },
        ]}
        submitLabel="Assign"
        onSubmit={async (values) => {
          await create.mutateAsync(values)
        }}
      />

      <FormDrawer
        open={Boolean(transferRow)}
        onOpenChange={(next) => {
          if (!next) setTransferRow(null)
        }}
        title="Transfer asset"
        description={
          transferRow
            ? `Move ${transferRow.assetNo} · ${transferRow.asset} from ${transferRow.employee || "current holder"}.`
            : "Transfer to a new employee or location."
        }
        schema={transferSchema}
        defaultValues={{
          employeeId: "",
          departmentId: transferRow?.department ? "" : "",
          locationId: "",
          assignedAt: new Date().toISOString().slice(0, 10),
          reason: "",
          approvalStatus: "approved",
        }}
        fields={[
          { name: "employeeId", label: "New employee", type: "select", options: lookupOptions(lookups.data?.employees) },
          { name: "departmentId", label: "Department", type: "select", options: lookupOptions(lookups.data?.departments) },
          { name: "locationId", label: "Location", type: "select", options: lookupOptions(lookups.data?.locations) },
          { name: "assignedAt", label: "Transfer date", type: "date" },
          { name: "reason", label: "Transfer reason", type: "textarea", placeholder: "Why is this asset moving?" },
          {
            name: "approvalStatus",
            label: "Approval",
            type: "select",
            options: [
              { label: "Approved", value: "approved" },
              { label: "Pending", value: "pending" },
              { label: "Rejected", value: "rejected" },
            ],
          },
        ]}
        submitLabel="Confirm transfer"
        onSubmit={async (values) => {
          await transfer.mutateAsync(values)
        }}
      />

      <ConfirmSheet
        open={Boolean(returnRow)}
        onOpenChange={(next) => {
          if (!next) setReturnRow(null)
        }}
        title="Return asset to pool"
        description="This ends the active assignment and marks the asset available again."
        confirmLabel="Return asset"
        tone="destructive"
        onConfirm={async () => {
          await returnAsset.mutateAsync()
        }}
      >
        {returnRow ? (
          <dl className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Assignment</dt>
              <dd className="font-medium">{returnRow.assignmentNo}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Asset</dt>
              <dd className="font-medium">
                {returnRow.assetNo} · {returnRow.asset}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Current holder</dt>
              <dd className="font-medium">{returnRow.employee || "—"}</dd>
            </div>
          </dl>
        ) : null}
      </ConfirmSheet>
    </div>
  )
}
