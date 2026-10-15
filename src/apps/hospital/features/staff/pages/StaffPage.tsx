import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"
import { PageHeader } from "@/apps/hospital/components/PageHeader"
import { asRows, loadPaged } from "@/apps/hospital/features/catalog/api"
import { DataTable } from "@/shared/DataTable"

type Row = { id: string; staffNo: string; firstName: string; lastName: string; role: string; email: string; phone: string; status: string }

export function StaffPage() {
  const list = useQuery({
    queryKey: ["hospital", "staff"],
    queryFn: () => loadPaged<Row>("/api/staff"),
  })
  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      { accessorKey: "staffNo", header: "Staff #" },
      { accessorKey: "firstName", header: "First name" },
      { accessorKey: "lastName", header: "Last name" },
      { accessorKey: "role", header: "Role" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "phone", header: "Phone" },
      { accessorKey: "status", header: "Status" },
    ],
    [],
  )
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Staff" description="Hospital staff directory linked to demo login roles." />
      <DataTable
        columns={columns}
        data={asRows(list.data ?? [])}
        getRowId={(row) => row.id}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => void list.refetch()}
        searchPlaceholder="Search staff"
        filename="staff.csv"
        emptyTitle="No staff"
      />
    </div>
  )
}
