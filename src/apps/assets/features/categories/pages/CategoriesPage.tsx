import { z } from "zod"
import { CrudResourcePage, lookupOptions } from "@/apps/assets/features/shared/CrudResourcePage"

export function CategoriesPage() {
  return (
    <CrudResourcePage
      title="Asset categories"
      description="Configurable categories with asset counts. Activate or deactivate without deleting history."
      queryKey={["assets", "categories"]}
      path="/api/categories"
      moduleId="categories"
      createLabel="Add category"
      paged={false}
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Name" },
        { key: "assetCount", header: "Assets" },
        { key: "active", header: "Active" },
      ]}
      schema={z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        parentId: z.string().optional(),
        active: z.boolean().default(true),
      })}
      defaultValues={{ code: "", name: "", parentId: "", active: true }}
      toFormValues={(row) => ({
        code: String(row.code ?? ""),
        name: String(row.name ?? ""),
        parentId: String(row.parentId ?? ""),
        active: Boolean(row.active),
      })}
      fields={(lookups) => [
        { name: "code", label: "Code", type: "text" },
        { name: "name", label: "Name", type: "text" },
        { name: "parentId", label: "Parent category", type: "select", options: lookupOptions(lookups.categories) },
        { name: "active", label: "Active", type: "switch" },
      ]}
      mapPayload={(values) => ({
        ...values,
        parentId: values.parentId || null,
      })}
    />
  )
}
