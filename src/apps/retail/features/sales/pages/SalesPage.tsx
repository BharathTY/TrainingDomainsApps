import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/apps/retail/components/PageHeader"
import { can } from "@/apps/retail/config/permissions"
import { asRows, loadPaged } from "@/apps/retail/features/catalog/api"
import { useUiStore } from "@/apps/retail/stores/ui-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { DataTable } from "@/shared/DataTable"
import { FormDrawer } from "@/shared/FormDrawer"
import { ApiError, api } from "@/shared/lib/api-client"

type SaleRow = {
  id: string
  saleNo: string
  store: string
  cashier: string
  status: string
  total: number
  paymentMethod: string
  createdAt: string
  customer?: string
}

type SaleDetail = {
  sale: Record<string, unknown>
  lines: { id: string; productId: string; product: string; sku: string; quantity: number; unitPrice: number; lineTotal: number; returnedQty: number }[]
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })

export function SalesPage() {
  const role = useUiStore((state) => state.role)
  const queryClient = useQueryClient()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnConfirm, setReturnConfirm] = useState(false)
  const [returnLines, setReturnLines] = useState<Record<string, number>>({})
  const [returnReason, setReturnReason] = useState("")
  const [returnDisposition, setReturnDisposition] = useState<"restock" | "damage">("restock")

  const canReturn = can(role, "sales", "create")

  const list = useQuery({ queryKey: ["retail", "sales"], queryFn: () => loadPaged<SaleRow>("/api/sales", { page: 1, pageSize: 100 }) })
  const detail = useQuery({
    queryKey: ["retail", "sale", detailId],
    queryFn: () => api<SaleDetail>(`/api/sales/${detailId}`),
    enabled: Boolean(detailId),
  })

  const returnSchema = z.object({
    reason: z.string().min(1),
    disposition: z.enum(["restock", "damage"]),
  })

  const processReturn = useMutation({
    mutationFn: () => {
      if (!detailId) throw new Error("No sale selected")
      const lines = (detail.data?.lines ?? [])
        .map((line) => ({ saleLineId: line.id, quantity: Number(returnLines[line.id] ?? 0) }))
        .filter((line) => line.quantity > 0)
      return api(`/api/sales/${detailId}/return`, {
        method: "POST",
        body: JSON.stringify({ reason: returnReason, disposition: returnDisposition, lines }),
      })
    },
    onSuccess: async () => {
      toast.success("Return processed")
      setReturnOpen(false)
      setReturnConfirm(false)
      setReturnLines({})
      setReturnReason("")
      await queryClient.invalidateQueries({ queryKey: ["retail", "sales"] })
      if (detailId) await queryClient.invalidateQueries({ queryKey: ["retail", "sale", detailId] })
      await queryClient.invalidateQueries({ queryKey: ["retail", "inventory"] })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Return failed"),
  })

  const columns = useMemo<ColumnDef<SaleRow, unknown>[]>(
    () => [
      { accessorKey: "saleNo", header: "Sale" },
      { accessorKey: "store", header: "Store" },
      { accessorKey: "customer", header: "Customer" },
      { accessorKey: "total", header: "Total", cell: ({ row }) => inr.format(Number(row.original.total)) },
      { accessorKey: "paymentMethod", header: "Payment" },
      { accessorKey: "status", header: "Status" },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button type="button" size="sm" variant="ghost" data-testid={`sale-view-${row.original.id}`} onClick={() => setDetailId(row.original.id)}>
            View
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Sales & returns" description="Completed POS transactions and return processing." />
      <DataTable
        columns={columns}
        data={asRows(list.data ?? [])}
        getRowId={(row) => row.id}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => void list.refetch()}
        searchPlaceholder="Search sales"
        filename="sales.csv"
        emptyTitle="No sales yet"
        emptyDescription="Complete a POS checkout to create sales."
      />

      <Sheet open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent className="w-[min(100%,32rem)] overflow-y-auto" data-testid="sale-detail-sheet">
          <SheetHeader>
            <SheetTitle>{String(detail.data?.sale.sale_no ?? detail.data?.sale.saleNo ?? "Sale")}</SheetTitle>
            <SheetDescription>
              Total {inr.format(Number(detail.data?.sale.total ?? 0))} · {String(detail.data?.sale.payment_method ?? detail.data?.sale.paymentMethod ?? "")}
            </SheetDescription>
          </SheetHeader>
          {detail.data ? (
            <div className="mt-4 space-y-3 text-sm">
              <table className="w-full">
                <caption className="sr-only">Sale lines</caption>
                <thead>
                  <tr>
                    <th scope="col">SKU</th>
                    <th scope="col">Product</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Returned</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.data.lines.map((line) => (
                    <tr key={line.id}>
                      <td>{line.sku}</td>
                      <td>{line.product}</td>
                      <td>{line.quantity}</td>
                      <td>{line.returnedQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {canReturn ? (
                <Button type="button" data-testid="sale-return-open" onClick={() => setReturnOpen(true)}>
                  Process return
                </Button>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <FormDrawer
        open={returnOpen}
        onOpenChange={setReturnOpen}
        title="Return items"
        description="Enter return quantities per line."
        schema={returnSchema}
        defaultValues={{ reason: "", disposition: "restock" }}
        fields={[
          { name: "reason", label: "Reason", type: "textarea" },
          {
            name: "disposition",
            label: "Disposition",
            type: "select",
            options: [
              { label: "Restock", value: "restock" },
              { label: "Damage (no restock)", value: "damage" },
            ],
          },
        ]}
        submitLabel="Review return"
        onSubmit={async (values) => {
          setReturnReason(values.reason)
          setReturnDisposition(values.disposition as "restock" | "damage")
          setReturnConfirm(true)
          setReturnOpen(false)
        }}
      />

      <ConfirmSheet
        open={returnConfirm}
        onOpenChange={setReturnConfirm}
        title="Confirm return?"
        description="Refund is calculated from unit prices on selected lines."
        confirmLabel="Submit return"
        onConfirm={async () => {
          await processReturn.mutateAsync()
        }}
      >
        {detail.data?.lines.map((line) => {
          const remaining = line.quantity - line.returnedQty
          return (
            <div key={line.id} className="grid gap-1">
              <Label htmlFor={`ret-${line.id}`}>
                {line.sku} · {line.product} (max {remaining})
              </Label>
              <Input
                id={`ret-${line.id}`}
                type="number"
                min={0}
                max={remaining}
                data-testid={`sale-return-qty-${line.id}`}
                value={returnLines[line.id] ?? ""}
                onChange={(e) => setReturnLines((prev) => ({ ...prev, [line.id]: Number(e.target.value) }))}
              />
            </div>
          )
        })}
      </ConfirmSheet>
    </div>
  )
}
