import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"
import { DataTable } from "@/shared/DataTable"
import { EmptyState } from "@/shared/EmptyState"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { StatCard } from "@/apps/schoolmanagement/components/StatCard"
import { Button } from "@/components/ui/button"
import { can } from "@/apps/schoolmanagement/config/permissions"
import { formatInr } from "@/apps/schoolmanagement/features/dashboard/format"
import { loadReport, reportsKeys } from "@/apps/schoolmanagement/features/reports/api"
import type { ClassStrength } from "@/apps/schoolmanagement/features/reports/types"
import { downloadCsv } from "@/shared/lib/csv"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function ReportsPage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "reports", "view")
  const canExport = can(role, "reports", "export")
  const query = useQuery({ queryKey: reportsKeys.all, queryFn: loadReport, enabled: allowed })
  const columns = useMemo<ColumnDef<ClassStrength, unknown>[]>(
    () => [
      { accessorKey: "className", header: "Class" },
      { accessorKey: "section", header: "Section" },
      { accessorKey: "students", header: "Students" },
    ],
    [],
  )
  const report = query.data

  if (!allowed) return <EmptyState title="No access" description="Your account cannot open this module." />

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Reports"
        description="Class strength, fee collection, and what is open today."
        actions={
          canExport && report ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                downloadCsv("class-strength.csv", [
                  ["Class", "Section", "Students"],
                  ...report.strength.map((row) => [row.className, row.section, String(row.students)]),
                ])
              }
            >
              Export CSV
            </Button>
          ) : undefined
        }
      />
      {query.isError ? <EmptyState title="Could not load reports" description="The summary did not load." actionLabel="Retry" onAction={() => void query.refetch()} /> : null}
      {report ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Students" value={String(report.students)} hint="Active enrolment" />
          <StatCard label="September fees" value={formatInr(report.septemberCollected)} hint={`${formatInr(report.septemberBilled)} billed`} />
          <StatCard label="Fees collected" value={formatInr(report.feeCollected)} hint="All receipts on file" />
          <StatCard label="Open now" value={String(report.openLoans + report.visitorsInside)} hint={`${report.openLoans} library loans · ${report.visitorsInside} visitors inside`} />
        </div>
      ) : null}
      <DataTable
        columns={columns}
        data={report?.strength ?? []}
        getRowId={(row) => row.id}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        searchPlaceholder="Search classes"
        filename="class-strength.csv"
        emptyTitle="No classes"
        emptyDescription="There are no students on roll."
      />
    </div>
  )
}
