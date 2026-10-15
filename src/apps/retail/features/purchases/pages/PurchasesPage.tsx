import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/apps/retail/components/PageHeader"
import { can } from "@/apps/retail/config/permissions"
import { asRows, loadLookups, loadPaged } from "@/apps/retail/features/catalog/api"
import { lookupOptions } from "@/apps/retail/features/shared/CrudResourcePage"
import { useUiStore } from "@/apps/retail/stores/ui-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { DataTable } from "@/shared/DataTable"
import { FormDrawer } from "@/shared/FormDrawer"
import { ApiError, api } from "@/shared/lib/api-client"

type PoRow = {
  id: string
  poNo: string
  supplier: string
  store: string
  status: string
  expectedDelivery: string
  supplierId: string
  storeId: string
}

type PoDetail = {
  purchaseOrder: Record<string, unknown>
  lines: { id: string; productId: string; product: string; sku: string; quantity: number; receivedQty: number; unitCost: number }[]
}

export function PurchasesPage() {
  const role = useUiStore((state) => state.role)
  const storeId = useUiStore((state) => state.storeId)
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({})

  const canCreate = can(role, "purchases", "create")
  const canEdit = can(role, "purchases", "edit")

  const list = useQuery({ queryKey: ["retail", "purchases"], queryFn: () => loadPaged<PoRow>("/api/purchases") })
  const lookups = useQuery({ queryKey: ["retail", "lookups"], queryFn: loadLookups, staleTime: 60_000 })
  const detail = useQuery({
    queryKey: ["retail", "purchase", detailId],
    queryFn: () => api<PoDetail>(`/api/purchases/${detailId}`),
    enabled: Boolean(detailId),
  })

  const createSchema = z.object({
    supplierId: z.string().min(1),
    storeId: z.string().min(1),
    expectedDelivery: z.string().min(1),
    paymentTerms: z.string().min(1),
    notes: z.string().optional(),
    productId: z.string().min(1),
    quantity: z.coerce.number().int().positive(),
    unitCost: z.coerce.number().nonnegative(),
  })

  const createPo = useMutation({
    mutationFn: (values: z.infer<typeof createSchema>) =>
      api("/api/purchases", {
        method: "POST",
        body: JSON.stringify({
          supplierId: values.supplierId,
          storeId: values.storeId,
          expectedDelivery: values.expectedDelivery,
          paymentTerms: values.paymentTerms,
          notes: values.notes ?? "",
          lines: [{ productId: values.productId, quantity: values.quantity, unitCost: values.unitCost }],
        }),
      }),
    onSuccess: async () => {
      toast.success("Purchase order created")
      setCreateOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["retail", "purchases"] })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Create PO failed"),
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/purchases/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
    onSuccess: async () => {
      toast.success("PO status updated")
      await queryClient.invalidateQueries({ queryKey: ["retail", "purchases"] })
      if (detailId) await queryClient.invalidateQueries({ queryKey: ["retail", "purchase", detailId] })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Status update failed"),
  })

  const receivePo = useMutation({
    mutationFn: () => {
      if (!detailId || !detail.data) throw new Error("No PO selected")
      const lines = detail.data.lines
        .map((line) => ({
          lineId: line.id,
          quantity: Number(receiveQty[line.id] ?? 0),
        }))
        .filter((line) => line.quantity > 0)
      return api(`/api/purchases/${detailId}/receive`, { method: "POST", body: JSON.stringify({ lines }) })
    },
    onSuccess: async () => {
      toast.success("Goods received")
      setReceiveOpen(false)
      setReceiveQty({})
      await queryClient.invalidateQueries({ queryKey: ["retail", "purchases"] })
      if (detailId) await queryClient.invalidateQueries({ queryKey: ["retail", "purchase", detailId] })
      await queryClient.invalidateQueries({ queryKey: ["retail", "inventory"] })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Receive failed"),
  })

  const columns = useMemo<ColumnDef<PoRow, unknown>[]>(
    () => [
      { accessorKey: "poNo", header: "PO" },
      { accessorKey: "supplier", header: "Supplier" },
      { accessorKey: "store", header: "Store" },
      { accessorKey: "status", header: "Status" },
      { accessorKey: "expectedDelivery", header: "Expected" },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <Button type="button" size="sm" variant="ghost" data-testid={`po-view-${row.original.id}`} onClick={() => setDetailId(row.original.id)}>
              View
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const supplierOptions = lookupOptions(lookups.data?.suppliers)
  const storeOptions = lookupOptions(lookups.data?.stores)
  const productOptions = lookupOptions(lookups.data?.products)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Purchase orders"
        description="Create POs, advance status, and receive stock. Synthetic training data only."
        actions={
          canCreate ? (
            <Button type="button" data-testid="po-create-open" onClick={() => setCreateOpen(true)}>
              Create PO
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
        searchPlaceholder="Search purchase orders"
        filename="purchase-orders.csv"
        emptyTitle="No purchase orders"
        emptyDescription="Create a PO or reset demo data."
        onCreate={canCreate ? () => setCreateOpen(true) : undefined}
        createLabel="Create PO"
      />

      <FormDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create purchase order"
        description="Single-line PO for training; add more lines via API if needed."
        schema={createSchema}
        defaultValues={{
          supplierId: supplierOptions[0]?.value ?? "",
          storeId: storeId || storeOptions[0]?.value || "",
          expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          paymentTerms: "Net 30",
          notes: "",
          productId: productOptions[0]?.value ?? "",
          quantity: 10,
          unitCost: 100,
        }}
        fields={[
          { name: "supplierId", label: "Supplier", type: "select", options: supplierOptions },
          { name: "storeId", label: "Store", type: "select", options: storeOptions },
          { name: "expectedDelivery", label: "Expected delivery", type: "date" },
          { name: "paymentTerms", label: "Payment terms", type: "text" },
          { name: "notes", label: "Notes", type: "textarea" },
          { name: "productId", label: "Product", type: "select", options: productOptions },
          { name: "quantity", label: "Quantity", type: "number" },
          { name: "unitCost", label: "Unit cost", type: "number" },
        ]}
        submitLabel="Create PO"
        onSubmit={async (values) => {
          await createPo.mutateAsync(values)
        }}
      />

      <Sheet open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent className="w-[min(100%,32rem)] overflow-y-auto" data-testid="po-detail-sheet">
          <SheetHeader>
            <SheetTitle>{String(detail.data?.purchaseOrder.po_no ?? detail.data?.purchaseOrder.poNo ?? "Purchase order")}</SheetTitle>
            <SheetDescription>Status: {String(detail.data?.purchaseOrder.status ?? "")}</SheetDescription>
          </SheetHeader>
          {detail.data ? (
            <div className="mt-4 space-y-4 text-sm">
              <table className="w-full">
                <caption className="sr-only">PO lines</caption>
                <thead>
                  <tr>
                    <th scope="col">SKU</th>
                    <th scope="col">Product</th>
                    <th scope="col">Ordered</th>
                    <th scope="col">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.data.lines.map((line) => (
                    <tr key={line.id}>
                      <td>{line.sku}</td>
                      <td>{line.product}</td>
                      <td>{line.quantity}</td>
                      <td>{line.receivedQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" data-testid="po-submit" onClick={() => detailId && void setStatus.mutateAsync({ id: detailId, status: "submitted" })}>
                    Submit
                  </Button>
                  <Button type="button" size="sm" data-testid="po-approve" onClick={() => detailId && void setStatus.mutateAsync({ id: detailId, status: "approved" })}>
                    Approve
                  </Button>
                  <Button type="button" size="sm" variant="destructive" data-testid="po-cancel" onClick={() => detailId && void setStatus.mutateAsync({ id: detailId, status: "cancelled" })}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" variant="outline" data-testid="po-receive-open" onClick={() => setReceiveOpen(true)}>
                    Receive goods
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmSheet
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        title="Receive purchase order?"
        description="Enter quantities to receive into store stock."
        confirmLabel="Confirm receive"
        onConfirm={async () => {
          await receivePo.mutateAsync()
        }}
      >
        {detail.data?.lines.map((line) => {
          const remaining = line.quantity - line.receivedQty
          return (
            <div key={line.id} className="grid gap-1 py-2">
              <Label htmlFor={`recv-${line.id}`}>
                {line.sku} · {line.product} (remaining {remaining})
              </Label>
              <Input
                id={`recv-${line.id}`}
                type="number"
                min={0}
                max={remaining}
                data-testid={`po-receive-qty-${line.id}`}
                value={receiveQty[line.id] ?? ""}
                onChange={(e) => setReceiveQty((prev) => ({ ...prev, [line.id]: Number(e.target.value) }))}
              />
            </div>
          )
        })}
      </ConfirmSheet>
    </div>
  )
}
