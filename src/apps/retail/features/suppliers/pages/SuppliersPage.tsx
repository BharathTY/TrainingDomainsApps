import { z } from "zod"
import { CrudResourcePage } from "@/apps/retail/features/shared/CrudResourcePage"

export function SuppliersPage() {
  return (
    <CrudResourcePage
      title="Suppliers"
      description="Vendor master for purchase orders. Synthetic training data only."
      queryKey={["retail", "suppliers"]}
      path="/api/suppliers"
      moduleId="suppliers"
      createLabel="Add supplier"
      deleteLabel="Retire"
      columns={[
        { key: "supplierNo", header: "Supplier ID" },
        { key: "name", header: "Name" },
        { key: "contactPerson", header: "Contact" },
        { key: "email", header: "Email" },
        { key: "phone", header: "Phone" },
        { key: "paymentTerms", header: "Terms" },
      ]}
      schema={z.object({
        name: z.string().min(1),
        contactPerson: z.string().optional(),
        email: z.string().email(),
        phone: z.string().min(8),
        address: z.string().optional(),
        paymentTerms: z.string().min(1),
      })}
      defaultValues={{
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
        paymentTerms: "Net 30",
      }}
      toFormValues={(row) => ({
        name: String(row.name ?? ""),
        contactPerson: String(row.contactPerson ?? ""),
        email: String(row.email ?? ""),
        phone: String(row.phone ?? ""),
        address: String(row.address ?? ""),
        paymentTerms: String(row.paymentTerms ?? "Net 30"),
      })}
      fields={() => [
        { name: "name", label: "Supplier name", type: "text" },
        { name: "contactPerson", label: "Contact person", type: "text" },
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "address", label: "Address", type: "textarea" },
        { name: "paymentTerms", label: "Payment terms", type: "text" },
      ]}
    />
  )
}
