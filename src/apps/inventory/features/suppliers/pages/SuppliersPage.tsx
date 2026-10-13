import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/apps/inventory/components/PageHeader"
import { listSuppliers } from "@/apps/inventory/features/catalog/api"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/shared/DataTable"
import { FormDrawer } from "@/shared/FormDrawer"
import { AppFrame } from "@/shared/frames"
import { ApiError, api } from "@/shared/lib/api-client"

type Supplier = { id: string; name: string; city: string; phone: string; email: string }
const schema = z.object({
  name: z.string().min(1, "Name is required"),
  city: z.string().min(1, "City is required"),
  phone: z.string().regex(/^[6-9][0-9]{9}$/, "Enter a 10-digit mobile"),
  email: z.string().email("Enter an email"),
})

export function SuppliersPage() {
  const queryClient = useQueryClient()
  const suppliers = useQuery({ queryKey: ["inventory", "suppliers"], queryFn: listSuppliers })
  const [open, setOpen] = useState(false)
  const save = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => api("/api/suppliers", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => {
      toast("Supplier saved")
      await queryClient.invalidateQueries({ queryKey: ["inventory", "suppliers"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not save the supplier"),
  })
  const columns = useMemo<ColumnDef<Supplier, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "city", header: "City" },
      { accessorKey: "phone", header: "Phone" },
      { accessorKey: "email", header: "Email" },
    ],
    [],
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Suppliers" description="Who the distributor buys from." actions={<Button type="button" onClick={() => setOpen(true)}>New supplier</Button>} />
      <DataTable columns={columns} data={suppliers.data ?? []} getRowId={(row) => row.id} isLoading={suppliers.isLoading} isError={suppliers.isError} onRetry={() => void suppliers.refetch()} searchPlaceholder="Search suppliers" filename="suppliers.csv" onCreate={() => setOpen(true)} createLabel="New supplier" emptyTitle="No suppliers" emptyDescription="Add a supplier." />
      <section>
        <h2 className="mb-2 text-sm font-semibold">Supplier catalogue</h2>
        <AppFrame title="Supplier catalogue" src="frames/catalogue.html" delayMs={1200} />
      </section>
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="New supplier"
        schema={schema}
        defaultValues={{ name: "", city: "", phone: "", email: "" }}
        fields={[
          { name: "name", label: "Name", type: "text" },
          { name: "city", label: "City", type: "text" },
          { name: "phone", label: "Phone", type: "tel" },
          { name: "email", label: "Email", type: "email" },
        ]}
        onSubmit={async (values) => {
          await save.mutateAsync(values)
        }}
      />
    </div>
  )
}
