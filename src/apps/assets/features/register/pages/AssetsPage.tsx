import { z } from "zod"
import { CrudResourcePage, lookupOptions } from "@/apps/assets/features/shared/CrudResourcePage"

export function AssetsPage() {
  return (
    <CrudResourcePage
      title="Asset register"
      description="Full lifecycle register with serial uniqueness and status transitions. Synthetic data only."
      queryKey={["assets", "register"]}
      path="/api/register"
      moduleId="assets"
      createLabel="Register asset"
      deleteLabel="Retire"
      deleteDescription="Retire selected assets? They remain in reports as retired."
      detailPath="assets"
      columns={[
        { key: "assetNo", header: "Asset ID" },
        { key: "name", header: "Name" },
        { key: "assetTag", header: "Tag" },
        { key: "category", header: "Category" },
        { key: "serialNumber", header: "Serial" },
        { key: "status", header: "Status" },
        { key: "condition", header: "Condition" },
        { key: "assignedEmployee", header: "Assignee" },
        { key: "location", header: "Location" },
        { key: "bookValue", header: "Book value" },
      ]}
      schema={z.object({
        name: z.string().min(1),
        categoryId: z.string().min(1),
        manufacturer: z.string().optional(),
        modelNumber: z.string().optional(),
        serialNumber: z.string().min(1),
        description: z.string().optional(),
        purchaseDate: z.string().min(1),
        purchaseCost: z.coerce.number().nonnegative(),
        vendorId: z.string().optional(),
        warrantyStart: z.string().optional(),
        warrantyEnd: z.string().optional(),
        usefulLifeMonths: z.coerce.number().int().positive(),
        depreciationMethod: z.string().min(1),
        departmentId: z.string().optional(),
        assignedEmployeeId: z.string().optional(),
        locationId: z.string().optional(),
        condition: z.enum(["excellent", "good", "fair", "poor"]),
        status: z.enum(["active", "assigned", "under_maintenance", "retired"]),
        maintenanceFrequencyDays: z.coerce.number().int().positive(),
        lastMaintenanceDate: z.string().optional(),
        nextMaintenanceDate: z.string().optional(),
      })}
      defaultValues={{
        name: "",
        categoryId: "",
        manufacturer: "",
        modelNumber: "",
        serialNumber: "",
        description: "",
        purchaseDate: "2025-01-15",
        purchaseCost: 25000,
        vendorId: "",
        warrantyStart: "2025-01-15",
        warrantyEnd: "2027-01-15",
        usefulLifeMonths: 36,
        depreciationMethod: "straight_line",
        departmentId: "",
        assignedEmployeeId: "",
        locationId: "",
        condition: "good",
        status: "active",
        maintenanceFrequencyDays: 90,
        lastMaintenanceDate: "",
        nextMaintenanceDate: "",
      }}
      toFormValues={(row) => ({
        name: String(row.name ?? ""),
        categoryId: String(row.categoryId ?? ""),
        manufacturer: String(row.manufacturer ?? ""),
        modelNumber: String(row.modelNumber ?? ""),
        serialNumber: String(row.serialNumber ?? ""),
        description: String(row.description ?? ""),
        purchaseDate: String(row.purchaseDate ?? "").slice(0, 10),
        purchaseCost: Number(row.purchaseCost ?? 0),
        vendorId: String(row.vendorId ?? ""),
        warrantyStart: String(row.warrantyStart ?? "").slice(0, 10),
        warrantyEnd: String(row.warrantyEnd ?? "").slice(0, 10),
        usefulLifeMonths: Number(row.usefulLifeMonths ?? 36),
        depreciationMethod: String(row.depreciationMethod ?? "straight_line"),
        departmentId: String(row.departmentId ?? ""),
        assignedEmployeeId: String(row.assignedEmployeeId ?? ""),
        locationId: String(row.locationId ?? ""),
        condition: String(row.condition ?? "good"),
        status: String(row.status ?? "active"),
        maintenanceFrequencyDays: Number(row.maintenanceFrequencyDays ?? 90),
        lastMaintenanceDate: String(row.lastMaintenanceDate ?? "").slice(0, 10),
        nextMaintenanceDate: String(row.nextMaintenanceDate ?? "").slice(0, 10),
      })}
      fields={(lookups) => [
        { name: "name", label: "Asset name", type: "text" },
        { name: "categoryId", label: "Category", type: "select", options: lookupOptions(lookups.categories) },
        { name: "manufacturer", label: "Manufacturer", type: "text" },
        { name: "modelNumber", label: "Model number", type: "text" },
        { name: "serialNumber", label: "Serial number", type: "text" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "purchaseDate", label: "Purchase date", type: "date" },
        { name: "purchaseCost", label: "Purchase cost", type: "number" },
        { name: "vendorId", label: "Vendor", type: "select", options: lookupOptions(lookups.vendors) },
        { name: "warrantyStart", label: "Warranty start", type: "date" },
        { name: "warrantyEnd", label: "Warranty expiry", type: "date" },
        { name: "usefulLifeMonths", label: "Useful life (months)", type: "number" },
        {
          name: "depreciationMethod",
          label: "Depreciation method",
          type: "select",
          options: [
            { label: "Straight line", value: "straight_line" },
            { label: "Declining balance", value: "declining_balance" },
          ],
        },
        { name: "departmentId", label: "Department", type: "select", options: lookupOptions(lookups.departments) },
        { name: "assignedEmployeeId", label: "Assigned employee", type: "select", options: lookupOptions(lookups.employees) },
        { name: "locationId", label: "Location", type: "select", options: lookupOptions(lookups.locations) },
        {
          name: "condition",
          label: "Condition",
          type: "select",
          options: [
            { label: "Excellent", value: "excellent" },
            { label: "Good", value: "good" },
            { label: "Fair", value: "fair" },
            { label: "Poor", value: "poor" },
          ],
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { label: "Active", value: "active" },
            { label: "Assigned", value: "assigned" },
            { label: "Under maintenance", value: "under_maintenance" },
            { label: "Retired", value: "retired" },
          ],
        },
        { name: "maintenanceFrequencyDays", label: "Maintenance frequency (days)", type: "number" },
        { name: "lastMaintenanceDate", label: "Last maintenance", type: "date" },
        { name: "nextMaintenanceDate", label: "Next maintenance", type: "date" },
      ]}
    />
  )
}
