import { z } from "zod"
import { CrudResourcePage } from "@/apps/retail/features/shared/CrudResourcePage"

function toLocalInput(value: unknown) {
  const raw = String(value ?? "")
  if (!raw) return ""
  return raw.slice(0, 16)
}

export function PromotionsPage() {
  return (
    <CrudResourcePage
      title="Promotions"
      description="Coupons and timed offers for POS checkout. Synthetic training data only."
      queryKey={["retail", "promotions"]}
      path="/api/promotions"
      moduleId="promotions"
      paged={false}
      createLabel="Add promotion"
      deleteLabel="Disable"
      columns={[
        { key: "promoNo", header: "Promo ID" },
        { key: "name", header: "Name" },
        { key: "promoType", header: "Type" },
        { key: "value", header: "Value" },
        { key: "couponCode", header: "Coupon" },
        { key: "startsAt", header: "Starts" },
        { key: "endsAt", header: "Ends" },
        { key: "status", header: "Status" },
      ]}
      schema={z.object({
        name: z.string().min(1),
        promoType: z.enum(["percent", "fixed"]),
        value: z.coerce.number().positive(),
        couponCode: z.string().optional(),
        minPurchase: z.coerce.number().nonnegative(),
        usageLimit: z.coerce.number().int().positive().optional().or(z.literal("")),
        startsAt: z.string().min(1),
        endsAt: z.string().min(1),
        status: z.enum(["active", "scheduled", "expired", "disabled"]),
      })}
      defaultValues={{
        name: "",
        promoType: "percent",
        value: 10,
        couponCode: "",
        minPurchase: 0,
        usageLimit: "",
        startsAt: "",
        endsAt: "",
        status: "active",
      }}
      toFormValues={(row) => ({
        name: String(row.name ?? ""),
        promoType: String(row.promoType ?? "percent") as "percent" | "fixed",
        value: Number(row.value ?? 0),
        couponCode: String(row.couponCode ?? ""),
        minPurchase: Number(row.minPurchase ?? 0),
        usageLimit: row.usageLimit == null ? "" : Number(row.usageLimit),
        startsAt: toLocalInput(row.startsAt),
        endsAt: toLocalInput(row.endsAt),
        status: String(row.status ?? "active") as "active" | "scheduled" | "expired" | "disabled",
      })}
      mapPayload={(values) => ({
        name: values.name,
        promoType: values.promoType,
        value: values.value,
        couponCode: values.couponCode || undefined,
        minPurchase: values.minPurchase,
        usageLimit: values.usageLimit === "" || values.usageLimit == null ? null : Number(values.usageLimit),
        startsAt: String(values.startsAt),
        endsAt: String(values.endsAt),
        status: values.status,
      })}
      fields={() => [
        { name: "name", label: "Promotion name", type: "text" },
        {
          name: "promoType",
          label: "Type",
          type: "select",
          options: [
            { label: "Percent off", value: "percent" },
            { label: "Fixed amount", value: "fixed" },
          ],
        },
        { name: "value", label: "Value", type: "number" },
        { name: "couponCode", label: "Coupon code", type: "text" },
        { name: "minPurchase", label: "Minimum purchase", type: "number" },
        { name: "usageLimit", label: "Usage limit (optional)", type: "number" },
        { name: "startsAt", label: "Starts at", type: "datetime-local" },
        { name: "endsAt", label: "Ends at", type: "datetime-local" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { label: "Active", value: "active" },
            { label: "Scheduled", value: "scheduled" },
            { label: "Expired", value: "expired" },
            { label: "Disabled", value: "disabled" },
          ],
        },
      ]}
    />
  )
}
