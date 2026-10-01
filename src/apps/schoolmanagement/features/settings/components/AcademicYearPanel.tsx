import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/shared/EmptyState"
import { FormDrawer } from "@/shared/FormDrawer"
import { Button } from "@/components/ui/button"
import { createYear, fetchYears, setCurrentYear, settingsKeys, updateYear } from "@/apps/schoolmanagement/features/settings/api"
import { yearSchema, type YearValues } from "@/apps/schoolmanagement/features/settings/schemas"
import type { AcademicYear } from "@/apps/schoolmanagement/features/settings/types"
import { ApiError } from "@/shared/lib/api-client"

const blank: YearValues = { label: "", startDate: "2026-04-01", endDate: "2027-03-31" }

export function AcademicYearPanel({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: settingsKeys.years, queryFn: fetchYears })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AcademicYear | null>(null)
  const defaults = useMemo<YearValues>(() => (editing ? { label: editing.label, startDate: editing.startDate, endDate: editing.endDate } : blank), [editing])
  const refresh = () => queryClient.invalidateQueries({ queryKey: settingsKeys.years })
  const fail = (error: unknown) => toast(error instanceof ApiError ? error.message : "Could not save the year")
  const create = useMutation({ mutationFn: createYear, onSuccess: () => refresh(), onError: fail })
  const update = useMutation({ mutationFn: ({ id, values }: { id: string; values: YearValues }) => updateYear(id, values), onSuccess: () => refresh(), onError: fail })
  const current = useMutation({ mutationFn: setCurrentYear, onSuccess: () => refresh(), onError: fail })

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading academic years…</p>
  if (query.isError) return <EmptyState title="Could not load academic years" description="The year list did not load." actionLabel="Retry" onAction={() => void query.refetch()} />

  return (
    <div className="grid gap-3">
      {canEdit ? (
        <div>
          <Button
            type="button"
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            Add year
          </Button>
        </div>
      ) : null}
      {query.data && query.data.length === 0 ? <EmptyState title="No academic year" description="Add the year the school is running." /> : null}
      <ul className="grid gap-2">
        {(query.data ?? []).map((year) => (
          <li key={year.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">
                {year.label}
                {year.current ? <span className="ml-2 text-xs text-muted-foreground">Current</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {year.startDate} to {year.endDate}
              </p>
            </div>
            {canEdit ? (
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(year)
                    setOpen(true)
                  }}
                >
                  Edit
                </Button>
                {year.current ? null : (
                  <Button type="button" variant="ghost" size="sm" onClick={() => current.mutate(year.id)}>
                    Set current
                  </Button>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit academic year" : "Add academic year"}
        description="One year is current. Dates must run forward."
        schema={yearSchema}
        defaultValues={defaults}
        fields={[
          { name: "label", label: "Label", type: "text", placeholder: "2026-27" },
          { name: "startDate", label: "Start date", type: "date" },
          { name: "endDate", label: "End date", type: "date" },
        ]}
        submitLabel={editing ? "Save year" : "Add year"}
        onSubmit={async (values) => {
          if (editing) await update.mutateAsync({ id: editing.id, values })
          else await create.mutateAsync(values)
          toast(editing ? "Year updated" : "Year added")
          setEditing(null)
        }}
      />
    </div>
  )
}
