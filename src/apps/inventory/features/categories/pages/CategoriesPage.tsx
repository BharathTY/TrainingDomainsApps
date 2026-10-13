import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/apps/inventory/components/PageHeader"
import { listCategories } from "@/apps/inventory/features/catalog/api"
import { Button } from "@/components/ui/button"
import { FormDrawer } from "@/shared/FormDrawer"
import { TreeList, type TreeNode } from "@/shared/TreeList"
import { ApiError, api } from "@/shared/lib/api-client"

const schema = z.object({ name: z.string().min(1, "Name is required"), parentId: z.string().optional() })

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const categories = useQuery({ queryKey: ["inventory", "categories"], queryFn: listCategories })
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string>()
  const nodes = useMemo<TreeNode[]>(() => {
    const rows = categories.data ?? []
    const childrenOf = (parent: string | null): TreeNode[] =>
      rows.filter((row) => row.parent_id === parent).map((row) => ({ id: row.id, label: row.name, children: childrenOf(row.id) }))
    return childrenOf(null)
  }, [categories.data])
  const save = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => api("/api/categories", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => {
      toast("Category saved")
      await queryClient.invalidateQueries({ queryKey: ["inventory", "categories"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not save the category"),
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Categories" description="A tree of item categories." actions={<Button type="button" onClick={() => setOpen(true)}>New category</Button>} />
      {categories.isLoading ? <p className="text-sm text-muted-foreground">Loading categories…</p> : null}
      <TreeList nodes={nodes} selectedId={selected} onSelect={setSelected} label="Categories" />
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="New category"
        schema={schema}
        defaultValues={{ name: "", parentId: "none" }}
        fields={[
          { name: "name", label: "Name", type: "text" },
          { name: "parentId", label: "Parent", type: "select", options: [{ label: "None", value: "none" }, ...(categories.data ?? []).map((row) => ({ label: row.name, value: row.id }))] },
        ]}
        onSubmit={async (values) => {
          await save.mutateAsync({ name: values.name, parentId: values.parentId === "none" ? undefined : values.parentId })
        }}
      />
    </div>
  )
}
