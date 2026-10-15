import { z } from "zod"
import { CrudResourcePage } from "@/apps/retail/features/shared/CrudResourcePage"

export function CustomersPage() {
  return (
    <CrudResourcePage
      title="Customers"
      description="Loyalty tiers and contact details for POS. Synthetic training data only."
      queryKey={["retail", "customers"]}
      path="/api/customers"
      moduleId="customers"
      createLabel="Add customer"
      deleteLabel="Retire"
      columns={[
        { key: "customerNo", header: "Customer ID" },
        { key: "name", header: "Name" },
        { key: "phone", header: "Phone" },
        { key: "email", header: "Email" },
        { key: "tier", header: "Tier" },
        { key: "loyaltyPoints", header: "Points" },
      ]}
      schema={z.object({
        name: z.string().min(1),
        phone: z.string().min(8),
        email: z.string().email().optional().or(z.literal("")),
        tier: z.enum(["silver", "gold", "platinum"]),
        birthday: z.string().optional(),
        membershipExpiry: z.string().optional(),
      })}
      defaultValues={{
        name: "",
        phone: "",
        email: "",
        tier: "silver",
        birthday: "",
        membershipExpiry: "",
      }}
      toFormValues={(row) => ({
        name: String(row.name ?? ""),
        phone: String(row.phone ?? ""),
        email: String(row.email ?? ""),
        tier: String(row.tier ?? "silver") as "silver" | "gold" | "platinum",
        birthday: String(row.birthday ?? "").slice(0, 10),
        membershipExpiry: String(row.membershipExpiry ?? "").slice(0, 10),
      })}
      mapPayload={(values) => ({
        ...values,
        email: values.email || "",
        birthday: values.birthday || null,
        membershipExpiry: values.membershipExpiry || null,
      })}
      fields={() => [
        { name: "name", label: "Full name", type: "text" },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "email", label: "Email", type: "email" },
        {
          name: "tier",
          label: "Tier",
          type: "select",
          options: [
            { label: "Silver", value: "silver" },
            { label: "Gold", value: "gold" },
            { label: "Platinum", value: "platinum" },
          ],
        },
        { name: "birthday", label: "Birthday", type: "date" },
        { name: "membershipExpiry", label: "Membership expiry", type: "date" },
      ]}
    />
  )
}
