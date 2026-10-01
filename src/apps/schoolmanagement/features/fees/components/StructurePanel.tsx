import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { EmptyState } from "@/shared/EmptyState"
import { FormDrawer } from "@/shared/FormDrawer"
import { Button } from "@/components/ui/button"
import { formatInr } from "@/apps/schoolmanagement/features/dashboard/format"
import { archiveConcessions, archiveHeads, archiveInstallments, createConcession, createHead, createInstallment, feeKeys, fetchStructure, restoreConcessions, restoreHeads, restoreInstallments, updateConcession, updateHead, updateInstallment } from "@/apps/schoolmanagement/features/fees/api"
import { shareTotal } from "@/apps/schoolmanagement/features/fees/ledger"
import { concessionSchema, headSchema, installmentSchema, type ConcessionValues, type HeadValues, type InstallmentValues } from "@/apps/schoolmanagement/features/fees/schemas"
import type { FeeConcession, FeeHead, FeeInstallment } from "@/apps/schoolmanagement/features/fees/types"
import { ApiError } from "@/shared/lib/api-client"

const classOptions = ["all", ...Array.from({ length: 12 }, (_, index) => String(index + 1))].map((value) => ({
  label: value === "all" ? "All classes" : `Class ${value}`,
  value,
}))
const classOnly = classOptions.filter((option) => option.value !== "all")
const blankHead: HeadValues = { name: "", className: "6", amount: 1000 }
const blankInstallment: InstallmentValues = { name: "", dueDate: "2026-12-15", sharePercent: 10 }
const blankConcession: ConcessionValues = { className: "6", label: "", percent: 10 }

export function StructurePanel({ canEdit, canDelete }: { canEdit: boolean; canDelete: boolean }) {
  const query = useQuery({ queryKey: feeKeys.structure, queryFn: fetchStructure })
  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading the fee structure…</p>
  if (query.isError) return <EmptyState title="Could not load the fee structure" description="Heads and installments did not load." actionLabel="Retry" onAction={() => void query.refetch()} />
  if (!query.data) return null
  const shares = shareTotal(query.data.installments)
  return (
    <div className="grid gap-6">
      <p className={shares === 100 ? "text-sm text-muted-foreground" : "text-sm text-destructive"} role="status">
        Installment shares total {shares}%. Dues use these shares when they total 100%.
      </p>
      <HeadList rows={query.data.heads} canEdit={canEdit} canDelete={canDelete} />
      <InstallmentList rows={query.data.installments} canEdit={canEdit} canDelete={canDelete} />
      <ConcessionList rows={query.data.concessions} canEdit={canEdit} canDelete={canDelete} />
    </div>
  )
}

function HeadList({ rows, canEdit, canDelete }: { rows: FeeHead[]; canEdit: boolean; canDelete: boolean }) {
  return (
    <CrudList
      title="Heads"
      rows={rows.map((row) => ({ id: row.id, label: row.name, detail: `${row.className === "all" ? "All classes" : `Class ${row.className}`} · ${formatInr(row.amount)}` }))}
      canEdit={canEdit}
      canDelete={canDelete}
      addLabel="Add head"
      editor={(editing, open, setOpen, setEditing) => (
        <HeadDrawer rows={rows} editingId={editing} open={open} setOpen={setOpen} onDone={() => setEditing(null)} />
      )}
      archive={archiveHeads}
      restore={restoreHeads}
      noun="heads"
    />
  )
}

function HeadDrawer({ rows, editingId, open, setOpen, onDone }: { rows: FeeHead[]; editingId: string | null; open: boolean; setOpen: (open: boolean) => void; onDone: () => void }) {
  const queryClient = useQueryClient()
  const editing = rows.find((row) => row.id === editingId) ?? null
  const defaults = useMemo<HeadValues>(() => (editing ? { name: editing.name, className: editing.className, amount: editing.amount } : blankHead), [editing])
  const refresh = () => queryClient.invalidateQueries({ queryKey: feeKeys.structure })
  const fail = (error: unknown) => toast(error instanceof ApiError ? error.message : "Could not save the head")
  const create = useMutation({ mutationFn: createHead, onSuccess: () => refresh(), onError: fail })
  const update = useMutation({ mutationFn: ({ id, values }: { id: string; values: HeadValues }) => updateHead(id, values), onSuccess: () => refresh(), onError: fail })
  return (
    <FormDrawer
      open={open}
      onOpenChange={setOpen}
      title={editing ? "Edit head" : "Add head"}
      description="A head applies to one class, or to every class."
      schema={headSchema}
      defaultValues={defaults}
      fields={[
        { name: "name", label: "Name", type: "text", placeholder: "Tuition" },
        { name: "className", label: "Class", type: "select", options: classOptions },
        { name: "amount", label: "Annual amount", type: "number" },
      ]}
      submitLabel={editing ? "Save head" : "Add head"}
      onSubmit={async (values) => {
        if (editing) await update.mutateAsync({ id: editing.id, values })
        else await create.mutateAsync(values)
        toast(editing ? "Head updated" : "Head added")
        onDone()
      }}
    />
  )
}

function InstallmentList({ rows, canEdit, canDelete }: { rows: FeeInstallment[]; canEdit: boolean; canDelete: boolean }) {
  return (
    <CrudList
      title="Installments"
      rows={rows.map((row) => ({ id: row.id, label: row.name, detail: `${row.dueDate} · ${row.sharePercent}%` }))}
      canEdit={canEdit}
      canDelete={canDelete}
      addLabel="Add installment"
      editor={(editing, open, setOpen, setEditing) => (
        <InstallmentDrawer rows={rows} editingId={editing} open={open} setOpen={setOpen} onDone={() => setEditing(null)} />
      )}
      archive={archiveInstallments}
      restore={restoreInstallments}
      noun="installments"
    />
  )
}

function InstallmentDrawer({ rows, editingId, open, setOpen, onDone }: { rows: FeeInstallment[]; editingId: string | null; open: boolean; setOpen: (open: boolean) => void; onDone: () => void }) {
  const queryClient = useQueryClient()
  const editing = rows.find((row) => row.id === editingId) ?? null
  const defaults = useMemo<InstallmentValues>(() => (editing ? { name: editing.name, dueDate: editing.dueDate, sharePercent: editing.sharePercent } : blankInstallment), [editing])
  const refresh = () => queryClient.invalidateQueries({ queryKey: feeKeys.structure })
  const fail = (error: unknown) => toast(error instanceof ApiError ? error.message : "Could not save the installment")
  const create = useMutation({ mutationFn: createInstallment, onSuccess: () => refresh(), onError: fail })
  const update = useMutation({ mutationFn: ({ id, values }: { id: string; values: InstallmentValues }) => updateInstallment(id, values), onSuccess: () => refresh(), onError: fail })
  return (
    <FormDrawer
      open={open}
      onOpenChange={setOpen}
      title={editing ? "Edit installment" : "Add installment"}
      description="Shares across installments must total 100%."
      schema={installmentSchema}
      defaultValues={defaults}
      fields={[
        { name: "name", label: "Name", type: "text", placeholder: "Term 1" },
        { name: "dueDate", label: "Due date", type: "date" },
        { name: "sharePercent", label: "Share percent", type: "number" },
      ]}
      submitLabel={editing ? "Save installment" : "Add installment"}
      onSubmit={async (values) => {
        if (editing) await update.mutateAsync({ id: editing.id, values })
        else await create.mutateAsync(values)
        toast(editing ? "Installment updated" : "Installment added")
        onDone()
      }}
    />
  )
}

function ConcessionList({ rows, canEdit, canDelete }: { rows: FeeConcession[]; canEdit: boolean; canDelete: boolean }) {
  return (
    <CrudList
      title="Concessions"
      rows={rows.map((row) => ({ id: row.id, label: row.label, detail: `Class ${row.className} · ${row.percent}% off` }))}
      canEdit={canEdit}
      canDelete={canDelete}
      addLabel="Add concession"
      editor={(editing, open, setOpen, setEditing) => (
        <ConcessionDrawer rows={rows} editingId={editing} open={open} setOpen={setOpen} onDone={() => setEditing(null)} />
      )}
      archive={archiveConcessions}
      restore={restoreConcessions}
      noun="concessions"
    />
  )
}

function ConcessionDrawer({ rows, editingId, open, setOpen, onDone }: { rows: FeeConcession[]; editingId: string | null; open: boolean; setOpen: (open: boolean) => void; onDone: () => void }) {
  const queryClient = useQueryClient()
  const editing = rows.find((row) => row.id === editingId) ?? null
  const defaults = useMemo<ConcessionValues>(() => (editing ? { className: editing.className, label: editing.label, percent: editing.percent } : blankConcession), [editing])
  const refresh = () => queryClient.invalidateQueries({ queryKey: feeKeys.structure })
  const fail = (error: unknown) => toast(error instanceof ApiError ? error.message : "Could not save the concession")
  const create = useMutation({ mutationFn: createConcession, onSuccess: () => refresh(), onError: fail })
  const update = useMutation({ mutationFn: ({ id, values }: { id: string; values: ConcessionValues }) => updateConcession(id, values), onSuccess: () => refresh(), onError: fail })
  return (
    <FormDrawer
      open={open}
      onOpenChange={setOpen}
      title={editing ? "Edit concession" : "Add concession"}
      description="The percent comes off that class's annual heads."
      schema={concessionSchema}
      defaultValues={defaults}
      fields={[
        { name: "className", label: "Class", type: "select", options: classOnly },
        { name: "label", label: "Label", type: "text", placeholder: "Sibling" },
        { name: "percent", label: "Percent", type: "number" },
      ]}
      submitLabel={editing ? "Save concession" : "Add concession"}
      onSubmit={async (values) => {
        if (editing) await update.mutateAsync({ id: editing.id, values })
        else await create.mutateAsync(values)
        toast(editing ? "Concession updated" : "Concession added")
        onDone()
      }}
    />
  )
}

function CrudList({
  title,
  rows,
  canEdit,
  canDelete,
  addLabel,
  editor,
  archive,
  restore,
  noun,
}: {
  title: string
  rows: { id: string; label: string; detail: string }[]
  canEdit: boolean
  canDelete: boolean
  addLabel: string
  editor: (editing: string | null, open: boolean, setOpen: (open: boolean) => void, setEditing: (id: string | null) => void) => ReactNode
  archive: (ids: string[]) => Promise<{ ids: string[] }>
  restore: (ids: string[]) => Promise<{ ids: string[] }>
  noun: string
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const archivedId = useRef("")
  const refresh = () => queryClient.invalidateQueries({ queryKey: feeKeys.structure })
  const fail = (error: unknown) => toast(error instanceof ApiError ? error.message : "Could not update the structure")
  const archiveMutation = useMutation({ mutationFn: archive, onSuccess: () => refresh(), onError: fail })
  const restoreMutation = useMutation({ mutationFn: restore, onSuccess: () => refresh(), onError: fail })
  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {canEdit ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            {addLabel}
          </Button>
        ) : null}
      </div>
      {rows.length === 0 ? <EmptyState title={`No ${noun}`} description={`Add ${noun} to build the fee structure.`} /> : null}
      <ul className="grid gap-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">{row.label}</p>
              <p className="text-xs text-muted-foreground">{row.detail}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(row.id)
                    setOpen(true)
                  }}
                >
                  Edit
                </Button>
              ) : null}
              {canDelete ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPendingId(row.id)}>
                  Archive
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {editor(editing, open, setOpen, setEditing)}
      <ConfirmDialog
        open={Boolean(pendingId)}
        onOpenChange={(next) => {
          if (!next) setPendingId(null)
        }}
        title={`Archive ${noun}`}
        description="Archived rows leave the structure. Collected receipts stay. You can undo this from the toast."
        confirmLabel="Archive"
        onConfirm={async () => {
          if (!pendingId) return
          archivedId.current = pendingId
          await archiveMutation.mutateAsync([pendingId])
          setPendingId(null)
        }}
        undo={{
          message: "Archived",
          onUndo: async () => {
            await restoreMutation.mutateAsync([archivedId.current])
          },
        }}
      />
    </section>
  )
}
