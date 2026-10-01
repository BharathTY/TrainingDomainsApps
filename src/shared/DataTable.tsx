import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { Download, SlidersHorizontal } from "lucide-react"
import { useMemo, useState } from "react"
import { EmptyState } from "@/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { downloadCsv } from "@/shared/lib/csv"

export type ColumnFilterDef = {
  columnId: string
  label: string
  options: { label: string; value: string }[]
}

export function DataTable<TData>({
  columns,
  data,
  getRowId,
  isLoading = false,
  isError = false,
  errorMessage = "Could not load this list.",
  onRetry,
  searchPlaceholder = "Search",
  filters = [],
  filename = "export.csv",
  onCreate,
  createLabel = "Create",
  emptyTitle = "Nothing here yet",
  emptyDescription = "Create the first record to get started.",
  onBulkDelete,
  bulkActions = [],
}: {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  getRowId: (row: TData) => string
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  onRetry?: () => void
  searchPlaceholder?: string
  filters?: ColumnFilterDef[]
  filename?: string
  onCreate?: () => void
  createLabel?: string
  emptyTitle?: string
  emptyDescription?: string
  onBulkDelete?: (ids: string[]) => void
  bulkActions?: { id: string; label: string; onClick: (ids: string[]) => void }[]
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState("")

  const tableColumns = useMemo<ColumnDef<TData, unknown>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
            aria-label="Select all rows"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(value === true)}
            aria-label="Select row"
          />
        ),
      },
      ...columns,
    ],
    [columns],
  )

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter },
    getRowId,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) =>
      JSON.stringify(row.original).toLowerCase().includes(String(filterValue).toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  })

  const selectedIds = table.getSelectedRowModel().rows.map((row) => row.id)

  function exportRows() {
    const visible = table.getVisibleLeafColumns().filter((column) => column.id !== "select" && column.id !== "actions")
    const header = visible.map((column) => column.id)
    const body = table.getFilteredRowModel().rows.map((row) =>
      visible.map((column) => {
        const value = row.getValue(column.id)
        return value == null ? "" : String(value)
      }),
    )
    downloadCsv(filename, [header, ...body])
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        title="Could not load this list"
        description={errorMessage}
        actionLabel="Retry"
        onAction={onRetry}
      />
    )
  }

  return (
    <div className="space-y-3" data-testid="data-table">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="md:max-w-xs"
        />
        <div className="flex flex-1 flex-wrap gap-2">
          {filters.map((filter) => (
            <Select
              key={filter.columnId}
              value={(table.getColumn(filter.columnId)?.getFilterValue() as string | undefined) ?? "all"}
              onValueChange={(value) => table.getColumn(filter.columnId)?.setFilterValue(value === "all" ? undefined : value)}
            >
              <SelectTrigger className="w-[9.5rem]" aria-label={filter.label}>
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {filter.label.toLowerCase()}</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline">
                <SlidersHorizontal className="size-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(value === true)}
                  >
                    {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" variant="outline" onClick={exportRows}>
            <Download className="size-4" />
            CSV
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (onBulkDelete || bulkActions.length > 0) ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm">
          <span>{selectedIds.length} selected</span>
          <div className="flex flex-wrap gap-2">
            {bulkActions.map((action) => (
              <Button key={action.id} type="button" variant="outline" size="sm" onClick={() => action.onClick(selectedIds)}>
                {action.label}
              </Button>
            ))}
            {onBulkDelete ? (
              <Button type="button" variant="destructive" size="sm" onClick={() => onBulkDelete(selectedIds)}>
                Delete
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button type="button" className="inline-flex items-center gap-1" onClick={header.column.getToggleSortingHandler()}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: "↑", desc: "↓" }[header.column.getIsSorted() as string] ?? null}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length}>
                  <EmptyState title={emptyTitle} description={emptyDescription} actionLabel={onCreate ? createLabel : undefined} onAction={onCreate} />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
            Previous
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
