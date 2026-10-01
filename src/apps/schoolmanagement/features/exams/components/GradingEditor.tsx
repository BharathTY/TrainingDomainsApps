import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { examKeys, fetchGrading, saveGrading } from "@/apps/schoolmanagement/features/exams/api"
import { schemeError } from "@/apps/schoolmanagement/features/exams/grade"
import type { GradeBand } from "@/apps/schoolmanagement/features/exams/types"
import { ApiError } from "@/shared/lib/api-client"

type Draft = { grade: string; min: string; max: string }

export function GradingEditor({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: examKeys.grading, queryFn: fetchGrading })
  const [draft, setDraft] = useState<{ key: string; rows: Draft[] } | null>(null)
  const key = (query.data ?? []).map((band) => `${band.id}:${band.grade}:${band.min}:${band.max}`).join("|")
  const rows = draft?.key === key ? draft.rows : (query.data ?? []).map(toDraft)
  const save = useMutation({
    mutationFn: saveGrading,
    onSuccess: async () => {
      setDraft(null)
      await queryClient.invalidateQueries({ queryKey: examKeys.all })
      toast("Grading scheme saved")
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not save the scheme"),
  })

  function update(index: number, patch: Partial<Draft>) {
    setDraft({ key, rows: rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)) })
  }

  return (
    <div className="grid max-w-xl gap-3">
      <p className="text-sm text-muted-foreground">Grades use the percentage of marks scored. Bands must not overlap.</p>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading the scheme…</p> : null}
      {query.isError ? <EmptyState title="Could not load the scheme" description="The bands did not load." actionLabel="Retry" onAction={() => void query.refetch()} /> : null}
      {query.data ? (
        <>
          <div className="grid grid-cols-[1fr_5rem_5rem_auto] gap-2 text-xs text-muted-foreground">
            <span>
              Grade<span className="text-destructive"> *</span>
            </span>
            <span>
              Min<span className="text-destructive"> *</span>
            </span>
            <span>
              Max<span className="text-destructive"> *</span>
            </span>
            <span />
          </div>
          {rows.map((row, index) => (
            <div key={`${key}-${index}`} className="grid grid-cols-[1fr_5rem_5rem_auto] gap-2">
              <Input aria-label={`Grade ${index + 1}`} value={row.grade} disabled={!canEdit} onChange={(event) => update(index, { grade: event.target.value })} />
              <Input aria-label={`Minimum ${index + 1}`} inputMode="numeric" value={row.min} disabled={!canEdit} onChange={(event) => update(index, { min: event.target.value })} />
              <Input aria-label={`Maximum ${index + 1}`} inputMode="numeric" value={row.max} disabled={!canEdit} onChange={(event) => update(index, { max: event.target.value })} />
              {canEdit ? (
                <Button type="button" variant="ghost" size="sm" disabled={rows.length === 1} onClick={() => setDraft({ key, rows: rows.filter((_, rowIndex) => rowIndex !== index) })}>
                  Remove
                </Button>
              ) : (
                <span />
              )}
            </div>
          ))}
          {canEdit ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setDraft({ key, rows: [...rows, { grade: "", min: "0", max: "0" }] })}>
                Add band
              </Button>
              <Button
                type="button"
                disabled={save.isPending}
                onClick={() => {
                  const bands = rows.map((row) => ({ grade: row.grade.trim(), min: Number(row.min), max: Number(row.max) }))
                  if (bands.some((band) => Number.isNaN(band.min) || Number.isNaN(band.max))) {
                    toast("Min and max must be numbers")
                    return
                  }
                  const problem = schemeError(bands)
                  if (problem) {
                    toast(problem)
                    return
                  }
                  void save.mutateAsync({ bands })
                }}
              >
                Save scheme
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function toDraft(band: GradeBand): Draft {
  return { grade: band.grade, min: String(band.min), max: String(band.max) }
}
