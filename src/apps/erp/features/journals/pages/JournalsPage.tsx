import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/apps/erp/components/PageHeader"
import { asRows, loadPaged } from "@/apps/erp/features/catalog/api"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/shared/DataTable"
import { FormDrawer } from "@/shared/FormDrawer"
import { ApiError, api } from "@/shared/lib/api-client"

const journalSchema = z.object({
  journalDate: z.string().min(1),
  amount: z.coerce.number().positive(),
  memo: z.string().optional(),
})

type JournalRow = {
  id: string
  journalNo: string
  journalDate: string
  status: string
  memo: string
  debit: number
  credit: number
  createdBy: string
  version: number
}

export function JournalsPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<JournalRow | null>(null)
  const list = useQuery({
    queryKey: ["erp", "journals"],
    queryFn: () => loadPaged<JournalRow>("/api/journals", { page: 1, pageSize: 100 }),
  })
  const detail = useQuery({
    queryKey: ["erp", "journals", selected?.id],
    queryFn: () =>
      api<{
        journal: { id: string; status: string; version: number }
        lines: { accountCode: string; accountName: string; debit: number; credit: number }[]
        totals: { debit: number; credit: number }
      }>(`/api/journals/${selected!.id}`),
    enabled: Boolean(selected),
  })
  const post = useMutation({
    mutationFn: (row: JournalRow) =>
      api(`/api/journals/${row.id}/post`, { method: "POST", body: JSON.stringify({ version: row.version }) }),
    onSuccess: async () => {
      toast("Journal posted")
      await queryClient.invalidateQueries({ queryKey: ["erp", "journals"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Post failed"),
  })
  const reverse = useMutation({
    mutationFn: (id: string) => api(`/api/journals/${id}/reverse`, { method: "POST", body: "{}" }),
    onSuccess: async () => {
      toast("Reversal created")
      await queryClient.invalidateQueries({ queryKey: ["erp", "journals"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Reverse failed"),
  })
  const create = useMutation({
    mutationFn: (body: unknown) => api("/api/journals", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      toast("Draft journal saved")
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["erp", "journals"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not save"),
  })
  const columns = useMemo<ColumnDef<JournalRow, unknown>[]>(
    () => [
      { accessorKey: "journalNo", header: "Journal #" },
      { accessorKey: "journalDate", header: "Date" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <span className="rounded border px-1.5 py-0.5 text-xs">{row.original.status}</span>,
      },
      { accessorKey: "debit", header: "Debit" },
      { accessorKey: "credit", header: "Credit" },
      { accessorKey: "createdBy", header: "Created by" },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <Button type="button" size="sm" variant="outline" onClick={() => setSelected(row.original)}>
              View
            </Button>
            {row.original.status !== "posted" ? (
              <Button type="button" size="sm" onClick={() => post.mutate(row.original)}>
                Post
              </Button>
            ) : (
              <Button type="button" size="sm" variant="secondary" onClick={() => reverse.mutate(row.original.id)}>
                Reverse
              </Button>
            )}
          </div>
        ),
      },
    ],
    [post, reverse],
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Journals"
        description="Double-entry journals. Posted entries cannot be edited — use reverse/adjust."
        actions={
          <Button type="button" onClick={() => setOpen(true)}>
            New journal
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={asRows(list.data ?? [])}
        getRowId={(row) => row.id}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => void list.refetch()}
        searchPlaceholder="Search journals"
        filename="journals.csv"
        emptyTitle="No journals"
      />
      {selected && detail.data ? (
        <section className="rounded-lg border border-border bg-card p-4" aria-label="Journal detail">
          <h2 className="text-sm font-semibold">
            {selected.journalNo} · debit {detail.data.totals.debit} / credit {detail.data.totals.credit}
          </h2>
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Journal lines</caption>
            <thead>
              <tr>
                <th scope="col" className="border-b py-2 text-left">Account</th>
                <th scope="col" className="border-b py-2 text-right">Debit</th>
                <th scope="col" className="border-b py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {detail.data.lines.map((line, index) => (
                <tr key={`${line.accountCode}-${index}`}>
                  <td className="border-b py-2">
                    {line.accountCode} {line.accountName}
                  </td>
                  <td className="border-b py-2 text-right">{line.debit}</td>
                  <td className="border-b py-2 text-right">{line.credit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="New balanced journal"
        description="Server rejects unbalanced drafts."
        schema={journalSchema}
        defaultValues={{ journalDate: "2026-10-14", amount: 1000, memo: "Practice journal" }}
        fields={[
          { name: "journalDate", label: "Journal date", type: "date" },
          { name: "amount", label: "Amount", type: "number" },
          { name: "memo", label: "Memo", type: "text" },
        ]}
        onSubmit={async (values) => {
          await create.mutateAsync({
            journalDate: values.journalDate,
            memo: values.memo ?? "",
            lines: [
              { accountId: "acc-5200", debit: values.amount, credit: 0, memo: "Expense" },
              { accountId: "acc-1010", debit: 0, credit: values.amount, memo: "Bank" },
            ],
          })
        }}
      />
    </div>
  )
}
