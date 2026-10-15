import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/apps/hospital/components/PageHeader"
import { asRows, loadPaged } from "@/apps/hospital/features/catalog/api"
import { can } from "@/apps/hospital/config/permissions"
import { useUiStore } from "@/apps/hospital/stores/ui-store"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/shared/DataTable"
import { ApiError, api } from "@/shared/lib/api-client"

type Row = { id: string; invoiceNo: string; patient: string; amount: number; taxAmount: number; status: string; issuedOn: string }

export function BillingPage() {
  const role = useUiStore((state) => state.role)
  const queryClient = useQueryClient()
  const list = useQuery({
    queryKey: ["hospital", "billing"],
    queryFn: () => loadPaged<Row>("/api/billing", { page: 1, pageSize: 100 }),
  })
  const pay = useMutation({
    mutationFn: (id: string) => api(`/api/billing/${id}/pay`, { method: "POST", body: JSON.stringify({ method: "upi" }) }),
    onSuccess: async () => {
      toast("Payment recorded")
      await queryClient.invalidateQueries({ queryKey: ["hospital", "billing"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Payment failed"),
  })
  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      { accessorKey: "invoiceNo", header: "Invoice #" },
      { accessorKey: "patient", header: "Patient" },
      { accessorKey: "amount", header: "Amount" },
      { accessorKey: "taxAmount", header: "Tax" },
      { accessorKey: "status", header: "Status" },
      { accessorKey: "issuedOn", header: "Issued" },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) =>
          can(role, "billing", "edit") && row.original.status !== "paid" ? (
            <Button type="button" size="sm" onClick={() => pay.mutate(row.original.id)}>
              Record payment
            </Button>
          ) : null,
      },
    ],
    [role, pay],
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Billing & payments" description="Simulated invoices only. Protected vault: /hospital/secure/billing-vault" />
      <DataTable
        columns={columns}
        data={asRows(list.data ?? [])}
        getRowId={(row) => row.id}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => void list.refetch()}
        searchPlaceholder="Search invoices"
        filename="billing.csv"
        emptyTitle="No invoices"
      />
    </div>
  )
}
