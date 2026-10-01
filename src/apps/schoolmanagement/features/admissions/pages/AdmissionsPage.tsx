import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { DataTable } from "@/shared/DataTable"
import { EmptyState } from "@/shared/EmptyState"
import { FormDrawer } from "@/shared/FormDrawer"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { Button } from "@/components/ui/button"
import { can } from "@/apps/schoolmanagement/config/permissions"
import { admissionsKeys, createEnquiry, listEnquiries } from "@/apps/schoolmanagement/features/admissions/api"
import { enquirySchema, type EnquiryValues } from "@/apps/schoolmanagement/features/admissions/schemas"
import type { Enquiry } from "@/apps/schoolmanagement/features/admissions/types"
import { ApiError } from "@/shared/lib/api-client"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

const STATUS_LABEL = { new: "New", contacted: "Contacted", admitted: "Admitted" } as const
const defaults: EnquiryValues = { name: "", phone: "", className: "1" }

export function AdmissionsPage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "admissions", "view")
  const canCreate = can(role, "admissions", "create")
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: admissionsKeys.all, queryFn: listEnquiries, enabled: allowed })
  const [open, setOpen] = useState(false)
  const save = useMutation({
    mutationFn: createEnquiry,
    onSuccess: async () => {
      toast("Enquiry saved")
      await queryClient.invalidateQueries({ queryKey: admissionsKeys.all })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not save the enquiry"),
  })
  const columns = useMemo<ColumnDef<Enquiry, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "phone", header: "Phone" },
      { accessorKey: "className", header: "Class" },
      { id: "status", header: "Status", accessorFn: (row) => STATUS_LABEL[row.status] },
      { accessorKey: "appliedOn", header: "Applied" },
    ],
    [],
  )

  if (!allowed) return <EmptyState title="No access" description="Your account cannot open this module." />

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Admissions"
        description="Enquiries and new applications."
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setOpen(true)}>
              New enquiry
            </Button>
          ) : null
        }
      />
      <DataTable
        columns={columns}
        data={query.data ?? []}
        getRowId={(row) => row.id}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        searchPlaceholder="Search enquiries"
        filename="admissions.csv"
        onCreate={canCreate ? () => setOpen(true) : undefined}
        createLabel="New enquiry"
        emptyTitle="No enquiries"
        emptyDescription="Record an admission enquiry."
      />
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="New enquiry"
        schema={enquirySchema}
        defaultValues={defaults}
        fields={[
          { name: "name", label: "Name", type: "text" },
          { name: "phone", label: "Phone", type: "tel" },
          { name: "className", label: "Class", type: "select", options: Array.from({ length: 12 }, (_, index) => ({ label: `Class ${index + 1}`, value: String(index + 1) })) },
        ]}
        submitLabel="Save enquiry"
        onSubmit={async (values) => {
          await save.mutateAsync(values)
        }}
      />
    </div>
  )
}
