import { z } from "zod"
import { CrudResourcePage } from "@/apps/assets/features/shared/CrudResourcePage"

export function VendorsPage() {
  return (
    <CrudResourcePage
      title="Vendors"
      description="Vendor master with contract dates and duplicate email checks."
      queryKey={["assets", "vendors"]}
      path="/api/vendors"
      moduleId="vendors"
      createLabel="Add vendor"
      columns={[
        { key: "vendorNo", header: "Vendor ID" },
        { key: "name", header: "Name" },
        { key: "contactPerson", header: "Contact" },
        { key: "email", header: "Email" },
        { key: "phone", header: "Phone" },
        { key: "serviceCategories", header: "Services" },
        { key: "contractEnd", header: "Contract end" },
      ]}
      schema={z.object({
        name: z.string().min(1),
        contactPerson: z.string().optional(),
        email: z.string().email(),
        phone: z.string().min(8),
        address: z.string().optional(),
        taxId: z.string().optional(),
        serviceCategories: z.string().optional(),
        contractStart: z.string().optional(),
        contractEnd: z.string().optional(),
      })}
      defaultValues={{
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
        taxId: "",
        serviceCategories: "IT",
        contractStart: "2025-01-01",
        contractEnd: "2026-12-31",
      }}
      toFormValues={(row) => ({
        name: String(row.name ?? ""),
        contactPerson: String(row.contactPerson ?? ""),
        email: String(row.email ?? ""),
        phone: String(row.phone ?? ""),
        address: String(row.address ?? ""),
        taxId: String(row.taxId ?? ""),
        serviceCategories: String(row.serviceCategories ?? ""),
        contractStart: String(row.contractStart ?? "").slice(0, 10),
        contractEnd: String(row.contractEnd ?? "").slice(0, 10),
      })}
      fields={() => [
        { name: "name", label: "Vendor name", type: "text" },
        { name: "contactPerson", label: "Contact person", type: "text" },
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "address", label: "Address", type: "textarea" },
        { name: "taxId", label: "Tax / registration ID", type: "text" },
        { name: "serviceCategories", label: "Service categories", type: "text" },
        { name: "contractStart", label: "Contract start", type: "date" },
        { name: "contractEnd", label: "Contract end", type: "date" },
      ]}
    />
  )
}
