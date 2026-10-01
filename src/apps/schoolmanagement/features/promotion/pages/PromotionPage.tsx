import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"
import { toast } from "sonner"
import { DataTable } from "@/shared/DataTable"
import { EmptyState } from "@/shared/EmptyState"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { can } from "@/apps/schoolmanagement/config/permissions"
import { decidePromotion, listPromotion, promotionKeys } from "@/apps/schoolmanagement/features/promotion/api"
import type { PromotionRow } from "@/apps/schoolmanagement/features/promotion/types"
import { ApiError } from "@/shared/lib/api-client"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

const DECISION_LABEL = { pending: "Pending", promoted: "Promoted", detained: "Detained" } as const

export function PromotionPage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "promotion", "view")
  const canEdit = can(role, "promotion", "edit")
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: promotionKeys.all, queryFn: listPromotion, enabled: allowed })
  const save = useMutation({
    mutationFn: ({ ids, decision }: { ids: string[]; decision: "promoted" | "detained" }) => decidePromotion(ids, decision),
    onSuccess: async (_result, variables) => {
      toast(variables.decision === "promoted" ? "Marked promoted" : "Marked detained")
      await queryClient.invalidateQueries({ queryKey: promotionKeys.all })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not save the decision"),
  })
  const columns = useMemo<ColumnDef<PromotionRow, unknown>[]>(
    () => [
      { accessorKey: "admissionNo", header: "Admission" },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "className", header: "Class" },
      { accessorKey: "section", header: "Section" },
      { id: "decision", header: "Decision", accessorFn: (row) => DECISION_LABEL[row.decision] },
    ],
    [],
  )

  if (!allowed) return <EmptyState title="No access" description="Your account cannot open this module." />

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Promotion" description="Year-end promotion and detention for students on roll." />
      <DataTable
        columns={columns}
        data={query.data ?? []}
        getRowId={(row) => row.studentId}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        searchPlaceholder="Search students"
        filename="promotion.csv"
        emptyTitle="No students"
        emptyDescription="There are no active students to promote."
        bulkActions={
          canEdit
            ? [
                { id: "promote", label: "Promote", onClick: (ids) => save.mutate({ ids, decision: "promoted" }) },
                { id: "detain", label: "Detain", onClick: (ids) => save.mutate({ ids, decision: "detained" }) },
              ]
            : []
        }
      />
    </div>
  )
}
