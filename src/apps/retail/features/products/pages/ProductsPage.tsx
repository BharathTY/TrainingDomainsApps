import { z } from "zod"
import { CrudResourcePage, lookupOptions } from "@/apps/retail/features/shared/CrudResourcePage"

export function ProductsPage() {
  return (
    <CrudResourcePage
      title="Products"
      description="SKU catalog with pricing, tax, and reorder levels. Synthetic training data only."
      queryKey={["retail", "products"]}
      path="/api/products"
      moduleId="products"
      createLabel="Add product"
      deleteLabel="Retire"
      deleteDescription="Retire selected products? They become inactive in POS."
      detailPath="products"
      columns={[
        { key: "sku", header: "SKU" },
        { key: "name", header: "Name" },
        { key: "category", header: "Category" },
        { key: "brand", header: "Brand" },
        { key: "sellingPrice", header: "Price" },
        { key: "quantity", header: "Stock" },
        { key: "status", header: "Status" },
      ]}
      schema={z.object({
        name: z.string().min(1),
        sku: z.string().min(1),
        barcode: z.string().min(1),
        description: z.string().optional(),
        brand: z.string().optional(),
        categoryId: z.string().min(1),
        costPrice: z.coerce.number().nonnegative(),
        sellingPrice: z.coerce.number().positive(),
        taxRate: z.coerce.number().nonnegative(),
        discountEligible: z.boolean(),
        unit: z.string().min(1),
        reorderLevel: z.coerce.number().int().nonnegative(),
        status: z.enum(["active", "inactive"]),
        expiryDate: z.string().optional(),
        batchNo: z.string().optional(),
      })}
      defaultValues={{
        name: "",
        sku: "",
        barcode: "",
        description: "",
        brand: "",
        categoryId: "",
        costPrice: 100,
        sellingPrice: 150,
        taxRate: 18,
        discountEligible: true,
        unit: "pcs",
        reorderLevel: 10,
        status: "active",
        expiryDate: "",
        batchNo: "",
      }}
      toFormValues={(row) => ({
        name: String(row.name ?? ""),
        sku: String(row.sku ?? ""),
        barcode: String(row.barcode ?? ""),
        description: String(row.description ?? ""),
        brand: String(row.brand ?? ""),
        categoryId: String(row.categoryId ?? ""),
        costPrice: Number(row.costPrice ?? 0),
        sellingPrice: Number(row.sellingPrice ?? 0),
        taxRate: Number(row.taxRate ?? 18),
        discountEligible: Boolean(row.discountEligible ?? true),
        unit: String(row.unit ?? "pcs"),
        reorderLevel: Number(row.reorderLevel ?? 10),
        status: String(row.status ?? "active") as "active" | "inactive",
        expiryDate: String(row.expiryDate ?? "").slice(0, 10),
        batchNo: String(row.batchNo ?? ""),
      })}
      mapPayload={(values) => ({
        ...values,
        expiryDate: values.expiryDate ? String(values.expiryDate) : null,
        batchNo: values.batchNo || undefined,
      })}
      fields={(lookups) => [
        { name: "name", label: "Product name", type: "text" },
        { name: "sku", label: "SKU", type: "text" },
        { name: "barcode", label: "Barcode", type: "text" },
        { name: "brand", label: "Brand", type: "text" },
        { name: "categoryId", label: "Category", type: "select", options: lookupOptions(lookups.categories) },
        { name: "description", label: "Description", type: "textarea" },
        { name: "costPrice", label: "Cost price", type: "number" },
        { name: "sellingPrice", label: "Selling price", type: "number" },
        { name: "taxRate", label: "Tax rate (%)", type: "number" },
        { name: "unit", label: "Unit", type: "text" },
        { name: "reorderLevel", label: "Reorder level", type: "number" },
        { name: "expiryDate", label: "Expiry date", type: "date" },
        { name: "batchNo", label: "Batch no.", type: "text" },
        { name: "discountEligible", label: "Discount eligible", type: "switch" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ],
        },
      ]}
    />
  )
}
