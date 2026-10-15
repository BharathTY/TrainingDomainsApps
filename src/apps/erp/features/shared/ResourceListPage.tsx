import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"
import { PageHeader } from "@/apps/erp/components/PageHeader"
import { asRows, loadPaged } from "@/apps/erp/features/catalog/api"
import { DataTable } from "@/shared/DataTable"

type Column = { key: string; header: string }

export function ResourceListPage({
  title,
  description,
  queryKey,
  path,
  columns,
  paged = true,
}: {
  title: string
  description: string
  queryKey: string[]
  path: string
  columns: Column[]
  paged?: boolean
}) {
  const query = useQuery({
    queryKey,
    queryFn: () => loadPaged<Record<string, unknown> & { id: string }>(path, paged ? { page: 1, pageSize: 100 } : undefined),
  })
  const rows = asRows(query.data ?? [])
  const defs = useMemo<ColumnDef<Record<string, unknown> & { id: string }, unknown>[]>(
    () =>
      columns.map((column) => ({
        accessorKey: column.key,
        header: column.header,
        cell: ({ row }) => {
          const value = row.original[column.key]
          if (column.key.toLowerCase().includes("status") || column.key === "matchStatus") {
            return (
              <span className="rounded border border-border px-1.5 py-0.5 text-xs" data-status={String(value)}>
                {String(value ?? "")}
              </span>
            )
          }
          return String(value ?? "")
        },
      })),
    [columns],
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title={title} description={description} />
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <ol className="flex gap-1">
          <li>ERP</li>
          <li aria-hidden>/</li>
          <li>{title}</li>
        </ol>
      </nav>
      <DataTable
        columns={defs}
        data={rows}
        getRowId={(row) => String(row.id)}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        searchPlaceholder={`Search ${title.toLowerCase()}`}
        filename={`${title.toLowerCase().replace(/\s+/g, "-")}.csv`}
        emptyTitle={`No ${title.toLowerCase()}`}
        emptyDescription="Reset demo data from Settings if the seed looks empty."
      />
    </div>
  )
}
