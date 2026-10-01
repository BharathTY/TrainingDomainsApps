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
import { checkInVisitor, checkOutVisitor, listVisitors, visitorsKeys } from "@/apps/schoolmanagement/features/visitors/api"
import { visitorSchema, type VisitorValues } from "@/apps/schoolmanagement/features/visitors/schemas"
import type { Visitor } from "@/apps/schoolmanagement/features/visitors/types"
import { ApiError } from "@/shared/lib/api-client"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

const defaults: VisitorValues = { name: "", purpose: "", whom: "", inAt: "2026-09-30T09:00" }

export function VisitorsPage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "visitors", "view")
  const canCreate = can(role, "visitors", "create")
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: visitorsKeys.all, queryFn: listVisitors, enabled: allowed })
  const [open, setOpen] = useState(false)
  const refresh = () => queryClient.invalidateQueries({ queryKey: visitorsKeys.all })
  const checkIn = useMutation({
    mutationFn: checkInVisitor,
    onSuccess: async () => {
      toast("Visitor checked in")
      await refresh()
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not check in the visitor"),
  })
  const checkOut = useMutation({
    mutationFn: checkOutVisitor,
    onSuccess: async () => {
      toast("Visitor checked out")
      await refresh()
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not check out the visitor"),
  })
  const columns = useMemo<ColumnDef<Visitor, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Visitor" },
      { accessorKey: "purpose", header: "Purpose" },
      { accessorKey: "whom", header: "To meet" },
      { accessorKey: "inAt", header: "In" },
      {
        id: "out",
        header: "Out",
        enableHiding: false,
        cell: ({ row }) =>
          row.original.outAt ? (
            row.original.outAt
          ) : canCreate ? (
            <Button type="button" variant="outline" size="sm" onClick={() => checkOut.mutate(row.original.id)}>
              Check out
            </Button>
          ) : (
            "Inside"
          ),
      },
    ],
    [canCreate, checkOut],
  )

  if (!allowed) return <EmptyState title="No access" description="Your account cannot open this module." />

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Visitors"
        description="Gate register for the day."
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setOpen(true)}>
              Check in
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
        searchPlaceholder="Search visitors"
        filename="visitors.csv"
        onCreate={canCreate ? () => setOpen(true) : undefined}
        createLabel="Check in"
        emptyTitle="No visitors"
        emptyDescription="Check in a visitor at the gate."
      />
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="Visitor check-in"
        schema={visitorSchema}
        defaultValues={defaults}
        fields={[
          { name: "name", label: "Visitor", type: "text" },
          { name: "purpose", label: "Purpose", type: "text" },
          { name: "whom", label: "To meet", type: "text" },
          { name: "inAt", label: "In at", type: "text", placeholder: "2026-09-30T09:00" },
        ]}
        submitLabel="Check in"
        onSubmit={async (values) => {
          await checkIn.mutateAsync(values)
        }}
      />
    </div>
  )
}
