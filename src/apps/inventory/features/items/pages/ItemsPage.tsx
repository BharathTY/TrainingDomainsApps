import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/apps/inventory/components/PageHeader"
import { listCategories, listItems, listSuppliers, type ItemRow } from "@/apps/inventory/features/catalog/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/shared/DataTable"
import { FileUpload } from "@/shared/FileUpload"
import { FormDrawer } from "@/shared/FormDrawer"
import { ApiError, api } from "@/shared/lib/api-client"
import { parseCsv } from "@/shared/lib/csv"
import { appPath } from "@/shared/lib/app-context"

const schema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  barcode: z.string().min(1, "Barcode is required"),
  categoryId: z.string().min(1, "Choose a category"),
  supplierId: z.string().min(1, "Choose a supplier"),
  uom: z.string().min(1, "Unit is required"),
  reorderLevel: z.coerce.number().int().min(0),
  unitCost: z.coerce.number().positive("Cost is required"),
})

export function ItemsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const items = useQuery({ queryKey: ["inventory", "items"], queryFn: listItems })
  const categories = useQuery({ queryKey: ["inventory", "categories"], queryFn: listCategories })
  const suppliers = useQuery({ queryKey: ["inventory", "suppliers"], queryFn: listSuppliers })
  const [open, setOpen] = useState(false)
  const [scan, setScan] = useState("")
  const save = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => api("/api/items", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => {
      toast("Item saved")
      await queryClient.invalidateQueries({ queryKey: ["inventory", "items"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not save the item"),
  })
  const columns = useMemo<ColumnDef<ItemRow, unknown>[]>(
    () => [
      { accessorKey: "sku", header: "SKU", cell: ({ row }) => <Link className="underline" to={appPath(`items/${row.original.id}`)}>{row.original.sku}</Link> },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "barcode", header: "Barcode" },
      { accessorKey: "categoryName", header: "Category" },
      { accessorKey: "uom", header: "UoM" },
      { accessorKey: "reorderLevel", header: "Reorder" },
      { accessorKey: "onHand", header: "On hand" },
    ],
    [],
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Items"
        description="SKUs, barcodes, and reorder levels."
        actions={
          <Button type="button" onClick={() => setOpen(true)}>
            New item
          </Button>
        }
      />
      <form
        className="flex max-w-sm items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const match = items.data?.find((item) => item.barcode === scan.trim())
          if (!match) {
            window.alert("No item for that barcode")
            return
          }
          navigate(appPath(`items/${match.id}`))
        }}
      >
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="barcode-scan">Scan barcode</Label>
          <Input id="barcode-scan" name="barcode-scan" value={scan} autoComplete="off" onChange={(event) => setScan(event.target.value)} placeholder="Scan and press Enter" />
        </div>
        <Button type="submit" variant="outline">Find</Button>
      </form>
      <FileUpload
        id="items-csv"
        label="Import CSV"
        onSelect={(file) => {
          if (!file) return
          void file.text().then(async (text) => {
            const [header, ...body] = parseCsv(text)
            if (!header || header[0]?.toLowerCase() !== "sku") {
              toast("CSV needs columns sku, name, barcode, categoryId, supplierId, uom, reorderLevel, unitCost")
              return
            }
            for (const cells of body) {
              const [sku, name, barcode, categoryId, supplierId, uom, reorderLevel, unitCost] = cells
              if (!sku || !name || !barcode || !categoryId || !supplierId) continue
              await api("/api/items", { method: "POST", body: JSON.stringify({ sku, name, barcode, categoryId, supplierId, uom: uom || "Nos", reorderLevel: Number(reorderLevel || 0), unitCost: Number(unitCost || 1) }) })
            }
            toast("Import finished")
            await queryClient.invalidateQueries({ queryKey: ["inventory", "items"] })
          })
        }}
      />
      <DataTable
        columns={columns}
        data={items.data ?? []}
        getRowId={(row) => row.id}
        isLoading={items.isLoading}
        isError={items.isError}
        onRetry={() => void items.refetch()}
        searchPlaceholder="Search items"
        filename="items.csv"
        onCreate={() => setOpen(true)}
        createLabel="New item"
        emptyTitle="No items"
        emptyDescription="Add an SKU to start the catalogue."
      />
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="New item"
        schema={schema}
        defaultValues={{ sku: "", name: "", barcode: "", categoryId: "", supplierId: "", uom: "Nos", reorderLevel: 10, unitCost: 100 }}
        fields={[
          { name: "sku", label: "SKU", type: "text" },
          { name: "name", label: "Name", type: "text" },
          { name: "barcode", label: "Barcode", type: "text" },
          { name: "categoryId", label: "Category", type: "select", options: (categories.data ?? []).map((row) => ({ label: row.name, value: row.id })) },
          { name: "supplierId", label: "Supplier", type: "select", options: (suppliers.data ?? []).map((row) => ({ label: row.name, value: row.id })) },
          { name: "uom", label: "Unit", type: "select", options: ["Nos", "Kg", "L", "Box"].map((unit) => ({ label: unit, value: unit })) },
          { name: "reorderLevel", label: "Reorder level", type: "number" },
          { name: "unitCost", label: "Unit cost", type: "number" },
        ]}
        onSubmit={async (values) => {
          await save.mutateAsync(values)
        }}
      />
    </div>
  )
}
