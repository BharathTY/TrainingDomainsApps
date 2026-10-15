import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/apps/hospital/components/PageHeader"
import { asRows, loadLookups, loadPaged } from "@/apps/hospital/features/catalog/api"
import { Button } from "@/components/ui/button"
import { FormDrawer } from "@/shared/FormDrawer"
import { DataTable } from "@/shared/DataTable"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { ApiError, api } from "@/shared/lib/api-client"
import type { ColumnDef } from "@tanstack/react-table"
import { can } from "@/apps/hospital/config/permissions"
import { useUiStore } from "@/apps/hospital/stores/ui-store"
import { lookupOptions } from "@/apps/hospital/features/shared/CrudResourcePage"

type Row = {
  id: string
  admissionNo: string
  patient: string
  ward: string
  bedNo: string
  status: string
  admittedAt: string
  wardId: string
  bedId: string
  patientId: string
  doctorId?: string
}

const admitSchema = z.object({
  patientId: z.string().min(1),
  wardId: z.string().min(1),
  bedId: z.string().min(1),
  doctorId: z.string().optional(),
  notes: z.string().optional(),
})

export function AdmissionsPage() {
  const role = useUiStore((state) => state.role)
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [dischargeId, setDischargeId] = useState<string | null>(null)
  const [transferId, setTransferId] = useState<string | null>(null)
  const list = useQuery({
    queryKey: ["hospital", "admissions"],
    queryFn: () => loadPaged<Row>("/api/admissions", { page: 1, pageSize: 100, status: "admitted" }),
  })
  const lookups = useQuery({ queryKey: ["hospital", "lookups"], queryFn: loadLookups })
  const canAdmit = can(role, "admissions", "admit")

  const admit = useMutation({
    mutationFn: (values: z.infer<typeof admitSchema>) => api("/api/admissions", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => {
      toast("Patient admitted")
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["hospital"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Admit failed"),
  })
  const discharge = useMutation({
    mutationFn: (id: string) => api(`/api/admissions/${id}/discharge`, { method: "POST", body: "{}" }),
    onSuccess: async () => {
      toast("Patient discharged")
      setDischargeId(null)
      await queryClient.invalidateQueries({ queryKey: ["hospital"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Discharge failed"),
  })
  const transfer = useMutation({
    mutationFn: (values: { id: string; wardId: string; bedId: string }) =>
      api(`/api/admissions/${values.id}/transfer`, { method: "POST", body: JSON.stringify({ wardId: values.wardId, bedId: values.bedId }) }),
    onSuccess: async () => {
      toast("Patient transferred")
      setTransferId(null)
      await queryClient.invalidateQueries({ queryKey: ["hospital"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Transfer failed"),
  })

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      { accessorKey: "admissionNo", header: "Admission #" },
      { accessorKey: "patient", header: "Patient" },
      { accessorKey: "ward", header: "Ward" },
      { accessorKey: "bedNo", header: "Bed" },
      { accessorKey: "status", header: "Status" },
      { accessorKey: "admittedAt", header: "Admitted" },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) =>
          canAdmit ? (
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="outline" onClick={() => setTransferId(row.original.id)}>
                Transfer
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => setDischargeId(row.original.id)}>
                Discharge
              </Button>
            </div>
          ) : null,
      },
    ],
    [canAdmit],
  )

  const availableBeds = (lookups.data?.beds ?? []).filter((b) => b.status === "available" || (transferId != null && b.id))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Admissions & discharges"
        description="One bed per active admission. Confirm before discharge or transfer."
        actions={
          canAdmit ? (
            <Button type="button" data-testid="admit-patient" onClick={() => setOpen(true)}>
              Admit patient
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
        searchPlaceholder="Search admissions"
        filename="admissions.csv"
        emptyTitle="No active admissions"
      />
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="Admit patient"
        schema={admitSchema}
        defaultValues={{ patientId: "", wardId: "", bedId: "", doctorId: "", notes: "" }}
        fields={[
          { name: "patientId", label: "Patient", type: "select", options: lookupOptions(lookups.data?.patients) },
          { name: "wardId", label: "Ward", type: "select", options: lookupOptions(lookups.data?.wards) },
          { name: "bedId", label: "Available bed", type: "select", options: lookupOptions(availableBeds) },
          { name: "doctorId", label: "Doctor", type: "select", options: lookupOptions(lookups.data?.doctors) },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSubmit={async (values) => {
          await admit.mutateAsync(values)
        }}
      />
      <ConfirmDialog
        open={Boolean(dischargeId)}
        onOpenChange={(open) => {
          if (!open) setDischargeId(null)
        }}
        title="Discharge patient?"
        description="The bed will become available and occupancy stats will update."
        confirmLabel="Discharge"
        onConfirm={async () => {
          if (!dischargeId) return
          await discharge.mutateAsync(dischargeId)
        }}
      />
      <FormDrawer
        open={Boolean(transferId)}
        onOpenChange={(open) => {
          if (!open) setTransferId(null)
        }}
        title="Transfer patient"
        description="Choose an available bed. Confirmation is required by policy."
        schema={z.object({ wardId: z.string().min(1), bedId: z.string().min(1) })}
        defaultValues={{ wardId: "", bedId: "" }}
        fields={[
          { name: "wardId", label: "Target ward", type: "select", options: lookupOptions(lookups.data?.wards) },
          { name: "bedId", label: "Target bed", type: "select", options: lookupOptions(lookups.data?.beds) },
        ]}
        submitLabel="Transfer"
        onSubmit={async (values) => {
          if (!transferId) return
          if (!window.confirm("Transfer this patient to the selected bed?")) return
          await transfer.mutateAsync({ id: transferId, wardId: values.wardId, bedId: values.bedId })
        }}
      />
    </div>
  )
}
