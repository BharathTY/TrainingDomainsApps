import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import type { ZodTypeAny } from "zod"
import { PageHeader } from "@/apps/assets/components/PageHeader"
import { can, type Action, type ModuleId } from "@/apps/assets/config/permissions"
import { asRows, loadLookups, loadPaged, type AssetsLookups } from "@/apps/assets/features/catalog/api"
import { useUiStore } from "@/apps/assets/stores/ui-store"
import { Button } from "@/components/ui/button"
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { DataTable } from "@/shared/DataTable"
import { FormDrawer, type DrawerField } from "@/shared/FormDrawer"
import { ApiError, api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"

type Row = Record<string, unknown> & { id: string }
type Column = { key: string; header: string }

export function lookupOptions(rows: { id: string; name?: string; code?: string }[] | undefined) {
  return (rows ?? []).map((row) => ({
    label: `${row.code ? `${row.code} · ` : ""}${row.name ?? row.id}`,
    value: row.id,
  }))
}

export function CrudResourcePage({
  title,
  description,
  queryKey,
  path,
  moduleId,
  columns,
  paged = true,
  schema,
  fields,
  defaultValues,
  toFormValues,
  mapPayload,
  createLabel = "Add",
  deleteLabel = "Delete",
  deleteDescription = "Confirm this action. Synthetic training data only.",
  detailPath,
}: {
  title: string
  description: string
  queryKey: string[]
  path: string
  moduleId: ModuleId
  columns: Column[]
  paged?: boolean
  schema: ZodTypeAny
  fields: (lookups: AssetsLookups) => DrawerField[]
  defaultValues: Record<string, unknown>
  toFormValues?: (row: Row) => Record<string, unknown>
  mapPayload?: (values: Record<string, unknown>) => Record<string, unknown>
  createLabel?: string
  deleteLabel?: string
  deleteDescription?: string
  detailPath?: string
}) {
  const role = useUiStore((state) => state.role)
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null)
  const canCreate = can(role, moduleId, "create" as Action)
  const canEdit = can(role, moduleId, "edit" as Action)
  const canDelete = can(role, moduleId, "delete" as Action)

  const list = useQuery({
    queryKey,
    queryFn: () => loadPaged<Row>(path, paged ? { page: 1, pageSize: 100 } : undefined),
  })
  const lookups = useQuery({ queryKey: ["assets", "lookups"], queryFn: loadLookups, staleTime: 60_000 })

  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = mapPayload ? mapPayload(values) : values
      if (editing) return api(`${path}/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) })
      return api(path, { method: "POST", body: JSON.stringify(payload) })
    },
    onSuccess: async () => {
      toast(editing ? "Record updated" : "Record created")
      setOpen(false)
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Save failed"),
  })

  const remove = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await api(`${path}/${id}/delete`, { method: "POST", body: "{}" })
    },
    onSuccess: async () => {
      toast("Retired / deleted")
      setPendingDelete(null)
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Delete failed"),
  })

  const defs = useMemo<ColumnDef<Row, unknown>[]>(() => {
    const base = columns.map((column) => ({
      accessorKey: column.key,
      header: column.header,
      cell: ({ row }: { row: { original: Row } }) => {
        const value = row.original[column.key]
        if (column.key.toLowerCase().includes("status") || column.key === "condition" || column.key === "priority") {
          return (
            <span className="rounded border border-border px-1.5 py-0.5 text-xs" data-status={String(value)}>
              {String(value ?? "")}
            </span>
          )
        }
        return String(value ?? "")
      },
    }))
    if (!canEdit && !canDelete && !detailPath) return base
    return [
      ...base,
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }: { row: { original: Row } }) => (
          <div className="flex flex-wrap gap-1">
            {detailPath ? (
              <Button type="button" size="sm" variant="ghost" asChild>
                <Link to={appPath(`${detailPath}/${row.original.id}`)} data-testid={`view-${row.original.id}`}>
                  View
                </Link>
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid={`edit-${row.original.id}`}
                onClick={() => {
                  setEditing(row.original)
                  setOpen(true)
                }}
              >
                Edit
              </Button>
            ) : null}
            {canDelete ? (
              <Button type="button" size="sm" variant="destructive" data-testid={`delete-${row.original.id}`} onClick={() => setPendingDelete([row.original.id])}>
                Retire
              </Button>
            ) : null}
          </div>
        ),
      },
    ]
  }, [columns, canEdit, canDelete, detailPath])

  const emptyLookups: AssetsLookups = {
    categories: [],
    departments: [],
    locations: [],
    employees: [],
    vendors: [],
    assets: [],
  }
  const formDefaults = editing ? (toFormValues?.(editing) ?? { ...defaultValues, ...editing }) : defaultValues

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title={title}
        description={description}
        actions={
          canCreate ? (
            <Button
              type="button"
              data-testid={`add-${moduleId}`}
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              {createLabel}
            </Button>
          ) : null
        }
      />
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <ol className="flex gap-1">
          <li>Asset EAM</li>
          <li aria-hidden>/</li>
          <li>{title}</li>
        </ol>
      </nav>
      <DataTable
        columns={defs}
        data={asRows(list.data ?? [])}
        getRowId={(row) => String(row.id)}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => void list.refetch()}
        searchPlaceholder={`Search ${title.toLowerCase()}`}
        filename={`${title.toLowerCase().replace(/\s+/g, "-")}.csv`}
        onCreate={canCreate ? () => { setEditing(null); setOpen(true) } : undefined}
        createLabel={createLabel}
        emptyTitle={`No ${title.toLowerCase()}`}
        emptyDescription="Add a record or reset demo data from Settings."
        onBulkDelete={canDelete ? setPendingDelete : undefined}
      />
      <FormDrawer
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setEditing(null)
        }}
        title={editing ? `Edit ${title}` : `Add ${title}`}
        description="Synthetic enterprise asset training data only."
        schema={schema}
        defaultValues={formDefaults}
        fields={fields(lookups.data ?? emptyLookups)}
        submitLabel={editing ? "Save changes" : "Create"}
        onSubmit={async (values) => {
          await save.mutateAsync(values)
        }}
      />
      <ConfirmSheet
        open={Boolean(pendingDelete)}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null)
        }}
        title={`${deleteLabel} ${pendingDelete?.length ?? 0} record(s)?`}
        description={deleteDescription}
        confirmLabel={deleteLabel}
        tone="destructive"
        onConfirm={async () => {
          if (!pendingDelete) return
          await remove.mutateAsync(pendingDelete)
        }}
      />
    </div>
  )
}
