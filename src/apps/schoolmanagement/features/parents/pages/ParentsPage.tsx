import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"
import { DataTable } from "@/shared/DataTable"
import { EmptyState } from "@/shared/EmptyState"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { can } from "@/apps/schoolmanagement/config/permissions"
import { listGuardians, parentsKeys } from "@/apps/schoolmanagement/features/parents/api"
import type { GuardianRow } from "@/apps/schoolmanagement/features/parents/types"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function ParentsPage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "parents", "view")
  const query = useQuery({ queryKey: parentsKeys.all, queryFn: listGuardians, enabled: allowed })
  const columns = useMemo<ColumnDef<GuardianRow, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Guardian" },
      { accessorKey: "phone", header: "Phone" },
      { accessorKey: "children", header: "Children" },
    ],
    [],
  )

  if (!allowed) return <EmptyState title="No access" description="Your account cannot open this module." />

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Parents" description="Guardians linked to students on roll." />
      <DataTable
        columns={columns}
        data={query.data ?? []}
        getRowId={(row) => row.id}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        searchPlaceholder="Search guardians"
        filename="parents.csv"
        emptyTitle="No guardians"
        emptyDescription="Student records do not list a guardian yet."
      />
    </div>
  )
}
