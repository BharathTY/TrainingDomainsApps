import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { formatInr } from "@/apps/schoolmanagement/features/dashboard/format"
import { feeKeys, fetchDefaulters, sendReminders } from "@/apps/schoolmanagement/features/fees/api"
import { downloadCsv } from "@/shared/lib/csv"
import { ApiError } from "@/shared/lib/api-client"

export function DefaultersPanel({ canRemind, canExport }: { canRemind: boolean; canExport: boolean }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: feeKeys.defaulters, queryFn: fetchDefaulters })
  const [picked, setPicked] = useState<string[]>([])
  const remind = useMutation({
    mutationFn: sendReminders,
    onSuccess: async (result) => {
      toast(result.count === 1 ? "Reminder queued for 1 guardian" : `Reminder queued for ${result.count} guardians`)
      setPicked([])
      await queryClient.invalidateQueries({ queryKey: feeKeys.defaulters })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not send reminders"),
  })

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading defaulters…</p>
  if (query.isError) return <EmptyState title="Could not load defaulters" description="The overdue list did not load." actionLabel="Retry" onAction={() => void query.refetch()} />
  const rows = query.data ?? []
  if (rows.length === 0) return <EmptyState title="No defaulters" description="Every due installment is cleared." />

  function toggle(id: string, checked: boolean) {
    setPicked((current) => (checked ? [...current, id] : current.filter((item) => item !== id)))
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2" data-print-hide>
        {canRemind ? (
          <Button type="button" disabled={picked.length === 0 || remind.isPending} onClick={() => remind.mutate(picked)}>
            Send reminder
          </Button>
        ) : null}
        {canExport ? (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              downloadCsv("defaulters.csv", [
                ["Name", "Admission", "Class", "Phone", "Overdue", "Reminded"],
                ...rows.map((row) => [row.name, row.admissionNo, `${row.className}-${row.section}`, row.guardianPhone, String(row.overdue), row.remindedOn ?? ""]),
              ])
            }
          >
            CSV
          </Button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-2 pr-2 font-medium">
                <Checkbox
                  aria-label="Select all defaulters"
                  checked={picked.length === rows.length}
                  onCheckedChange={(value) => setPicked(value === true ? rows.map((row) => row.studentId) : [])}
                />
              </th>
              <th className="py-2 pr-2 font-medium">Student</th>
              <th className="py-2 pr-2 font-medium">Class</th>
              <th className="py-2 pr-2 font-medium">Phone</th>
              <th className="py-2 pr-2 font-medium">Overdue</th>
              <th className="py-2 font-medium">Reminder</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.studentId} className="border-t border-border">
                <td className="py-2 pr-2">
                  <Checkbox aria-label={`Select ${row.name}`} checked={picked.includes(row.studentId)} onCheckedChange={(value) => toggle(row.studentId, value === true)} />
                </td>
                <td className="py-2 pr-2">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.admissionNo}</p>
                </td>
                <td className="py-2 pr-2">
                  {row.className}-{row.section}
                </td>
                <td className="py-2 pr-2">{row.guardianPhone}</td>
                <td className="py-2 pr-2">{formatInr(row.overdue)}</td>
                <td className="py-2">{row.remindedOn ?? "Not sent"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
