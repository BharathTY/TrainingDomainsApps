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
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { DataTable } from "@/shared/DataTable"
import { FormDrawer } from "@/shared/FormDrawer"
import { ApiError, api } from "@/shared/lib/api-client"

type StockRow = {
  id: string
  store: string
  storeId: string
  productId: string
  sku: string
  product: string
  quantity: number
  reorderLevel: number
  costPrice: number
  valuation: number
}

export function InventoryPage() {
  const role = useUiStore((state) => state.role)
  const storeId = useUiStore((state) => state.storeId)
  const queryClient = useQueryClient()
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [confirmAdjust, setConfirmAdjust] = useState<Record<string, unknown> | null>(null)
  const canEdit = can(role, "inventory", "edit")

  const list = useQuery({
    queryKey: ["retail", "inventory", storeId],
    queryFn: () => loadPaged<StockRow>("/api/inventory", storeId ? { storeId } : undefined),
  })
  const lookups = useQuery({ queryKey: ["retail", "lookups"], queryFn: loadLookups, staleTime: 60_000 })

  const adjustSchema = z.object({
    storeId: z.string().min(1),
    productId: z.string().min(1),
    quantity: z.coerce.number().int(),
    reason: z.string().min(1),
    movementType: z.enum(["stock_in", "stock_out", "adjustment", "damage", "expiry"]),
  })

  const transferSchema = z.object({
    fromStoreId: z.string().min(1),
    toStoreId: z.string().min(1),
    productId: z.string().min(1),
    quantity: z.coerce.number().int().positive(),
    reason: z.string().min(1),
  })

  const adjust = useMutation({
    mutationFn: (body: z.infer<typeof adjustSchema>) =>
      api("/api/inventory/adjust", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      toast.success("Stock adjusted")
      setConfirmAdjust(null)
      await queryClient.invalidateQueries({ queryKey: ["retail", "inventory"] })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Adjust failed"),
  })

  const transfer = useMutation({
    mutationFn: (body: z.infer<typeof transferSchema>) =>
      api("/api/inventory/transfer", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      toast.success("Stock transferred")
      await queryClient.invalidateQueries({ queryKey: ["retail", "inventory"] })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Transfer failed"),
  })

  const columns = useMemo<ColumnDef<StockRow, unknown>[]>(
    () => [
      { accessorKey: "sku", header: "SKU" },
      { accessorKey: "product", header: "Product" },
      { accessorKey: "store", header: "Store" },
      { accessorKey: "quantity", header: "Qty" },
      { accessorKey: "reorderLevel", header: "Reorder" },
      { accessorKey: "valuation", header: "Value" },
    ],
    [],
  )

  const storeOptions = lookupOptions(lookups.data?.stores)
  const productOptions = lookupOptions(lookups.data?.products)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Inventory"
        description="Store stock levels, adjustments, and transfers. Synthetic training data only."
        actions={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" data-testid="inventory-adjust-open" onClick={() => setAdjustOpen(true)}>
                Adjust stock
              </Button>
              <Button type="button" variant="outline" data-testid="inventory-transfer-open" onClick={() => setTransferOpen(true)}>
                Transfer stock
              </Button>
              <Button
                type="button"
                variant="secondary"
                data-testid="inventory-training-prompt"
                onClick={() => {
                  const productId = lookups.data?.products[0]?.id
                  if (!productId) {
                    toast.error("No products in lookups")
                    return
                  }
                  const reason = window.prompt("Training: enter adjustment reason")
                  if (!reason?.trim()) return
                  void adjust.mutateAsync({
                    storeId: storeId || storeOptions[0]?.value || "",
                    productId,
                    quantity: 1,
                    reason: reason.trim(),
                    movementType: "adjustment",
                  })
                }}
              >
                Training: prompt adjust (+1)
              </Button>
            </div>
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
        searchPlaceholder="Search inventory"
        filename="inventory.csv"
        emptyTitle="No stock rows"
        emptyDescription="Reset demo data from Settings if the catalog is empty."
      />

      <FormDrawer
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        title="Adjust stock"
        description="Use signed quantity for adjustments; stock in/out apply absolute values."
        schema={adjustSchema}
        defaultValues={{
          storeId: storeId || "",
          productId: "",
          quantity: 1,
          reason: "",
          movementType: "adjustment",
        }}
        fields={[
          { name: "storeId", label: "Store", type: "select", options: storeOptions },
          { name: "productId", label: "Product", type: "select", options: productOptions },
          { name: "quantity", label: "Quantity", type: "number" },
          {
            name: "movementType",
            label: "Movement type",
            type: "select",
            options: [
              { label: "Adjustment", value: "adjustment" },
              { label: "Stock in", value: "stock_in" },
              { label: "Stock out", value: "stock_out" },
              { label: "Damage", value: "damage" },
              { label: "Expiry", value: "expiry" },
            ],
          },
          { name: "reason", label: "Reason", type: "textarea" },
        ]}
        submitLabel="Review adjust"
        onSubmit={async (values) => {
          setConfirmAdjust(values)
          setAdjustOpen(false)
        }}
      />

      <ConfirmSheet
        open={Boolean(confirmAdjust)}
        onOpenChange={(next) => {
          if (!next) setConfirmAdjust(null)
        }}
        title="Confirm stock adjustment?"
        description="This updates store stock and writes a movement record."
        confirmLabel="Apply adjustment"
        onConfirm={async () => {
          if (!confirmAdjust) return
          await adjust.mutateAsync(confirmAdjust as z.infer<typeof adjustSchema>)
        }}
      />

      <FormDrawer
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title="Transfer stock"
        description="Move quantity between stores with a documented reason."
        schema={transferSchema}
        defaultValues={{
          fromStoreId: storeId || "",
          toStoreId: "",
          productId: "",
          quantity: 1,
          reason: "",
        }}
        fields={[
          { name: "fromStoreId", label: "From store", type: "select", options: storeOptions },
          { name: "toStoreId", label: "To store", type: "select", options: storeOptions },
          { name: "productId", label: "Product", type: "select", options: productOptions },
          { name: "quantity", label: "Quantity", type: "number" },
          { name: "reason", label: "Reason", type: "textarea" },
        ]}
        submitLabel="Transfer"
        onSubmit={async (values) => {
          await transfer.mutateAsync(values)
        }}
      />
    </div>
  )
}
