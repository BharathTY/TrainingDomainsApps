import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/shared/EmptyState"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { examKeys, fetchMarks, saveMark } from "@/apps/schoolmanagement/features/exams/api"
import { gradeFor, percentOf } from "@/apps/schoolmanagement/features/exams/grade"
import type { MarksGrid as Grid } from "@/apps/schoolmanagement/features/exams/types"
import { SECTIONS, type Section } from "@/apps/schoolmanagement/features/students/types"
import { ApiError } from "@/shared/lib/api-client"
import { cn } from "@/shared/lib/utils"

export function MarksGrid({ examId, canEdit }: { examId: string; canEdit: boolean }) {
  const [section, setSection] = useState<Section>("A")
  const query = useQuery({ queryKey: examKeys.marks(examId, section), queryFn: () => fetchMarks(examId, section) })
  return (
    <div className="grid gap-3">
      <div className="grid max-w-xs gap-1.5">
        <Label>
          Section<span className="text-destructive"> *</span>
        </Label>
        <Select value={section} onValueChange={(value) => setSection(value as Section)}>
          <SelectTrigger aria-label="Section" className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTIONS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {query.isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {query.isError ? <EmptyState title="Could not load marks" description="The grid did not load." actionLabel="Retry" onAction={() => void query.refetch()} /> : null}
      {query.data && query.data.papers.length === 0 ? <EmptyState title="No papers" description="Add the schedule before entering marks." /> : null}
      {query.data && query.data.rows.length === 0 && query.data.papers.length > 0 ? (
        <EmptyState title="No students" description={`Class ${query.data.className}-${section} has no active students.`} />
      ) : null}
      {query.data && query.data.papers.length > 0 && query.data.rows.length > 0 ? (
        <GridTable examId={examId} grid={query.data} canEdit={canEdit} />
      ) : null}
    </div>
  )
}

function GridTable({ examId, grid, canEdit }: { examId: string; grid: Grid; canEdit: boolean }) {
  const key = `${grid.examId}|${grid.section}|${grid.rows.map((row) => row.studentId).join(",")}|${grid.papers.map((paper) => paper.id).join(",")}`
  const [draft, setDraft] = useState<{ key: string; cells: Record<string, string> } | null>(null)
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle")
  const timers = useRef<Record<string, number>>({})
  const queryClient = useQueryClient()
  const cells = draft?.key === key ? draft.cells : serverCells(grid)
  const save = useMutation({
    mutationFn: (values: { studentId: string; paperId: string; score: number | null }) => saveMark(examId, values),
    onSuccess: async () => {
      setStatus("saved")
      await queryClient.invalidateQueries({ queryKey: ["exams", examId, "report"] })
    },
    onError: (error) => {
      setStatus("idle")
      toast(error instanceof ApiError ? error.message : "Could not save the mark")
    },
  })

  function write(cellKey: string, value: string) {
    const next = { ...cells, [cellKey]: value }
    setDraft({ key, cells: next })
    if (!canEdit) return
    window.clearTimeout(timers.current[cellKey])
    timers.current[cellKey] = window.setTimeout(() => {
      void commit(cellKey, value)
    }, 400)
  }

  async function commit(cellKey: string, value: string) {
    const [studentId, paperId] = cellKey.split(":")
    const paper = grid.papers.find((item) => item.id === paperId)
    if (!studentId || !paperId || !paper) return
    const trimmed = value.trim()
    if (trimmed !== "" && !/^\d+$/.test(trimmed)) return
    const score = trimmed === "" ? null : Number(trimmed)
    if (score != null && score > paper.maxMarks) {
      toast(`Marks cannot exceed ${paper.maxMarks}`)
      setStatus("idle")
      return
    }
    setStatus("saving")
    try {
      await save.mutateAsync({ studentId, paperId, score })
    } catch {
      /* toast comes from the mutation */
    }
  }

  function move(row: number, col: number) {
    const next = document.querySelector<HTMLInputElement>(`[data-mark="${row}-${col}"]`)
    next?.focus()
    next?.select()
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Arrow keys move between cells. Marks save on their own."}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-background px-2 py-2 text-left text-xs font-medium text-muted-foreground">Student</th>
              {grid.papers.map((paper) => (
                <th key={paper.id} className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">
                  {paper.subjectName}
                  <span className="block font-normal">/ {paper.maxMarks}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row, rowIndex) => (
              <tr key={row.studentId} className="border-t border-border">
                <th className="sticky left-0 z-10 bg-background px-2 py-1 text-left font-medium">{row.name}</th>
                {grid.papers.map((paper, colIndex) => {
                  const cellKey = `${row.studentId}:${paper.id}`
                  const value = cells[cellKey] ?? ""
                  const score = /^\d+$/.test(value) ? Number(value) : null
                  const grade = score == null || score > paper.maxMarks ? "" : gradeFor(percentOf(score, paper.maxMarks), grid.scheme)
                  return (
                    <td key={paper.id} className="px-2 py-1">
                      <div className="flex items-center gap-2">
                        <Input
                          data-mark={`${rowIndex}-${colIndex}`}
                          aria-label={`${row.name} ${paper.subjectName}`}
                          inputMode="numeric"
                          value={value}
                          disabled={!canEdit}
                          className={cn("h-10 w-16 text-center tabular-nums", score != null && score > paper.maxMarks && "border-destructive")}
                          onChange={(event) => write(cellKey, event.target.value)}
                          onBlur={(event) => {
                            window.clearTimeout(timers.current[cellKey])
                            if (canEdit) void commit(cellKey, event.target.value)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "ArrowDown" || event.key === "Enter") {
                              event.preventDefault()
                              move(rowIndex + 1, colIndex)
                            } else if (event.key === "ArrowUp") {
                              event.preventDefault()
                              move(rowIndex - 1, colIndex)
                            } else if (event.key === "ArrowLeft") {
                              event.preventDefault()
                              move(rowIndex, colIndex - 1)
                            } else if (event.key === "ArrowRight") {
                              event.preventDefault()
                              move(rowIndex, colIndex + 1)
                            }
                          }}
                        />
                        <span className="w-6 text-xs text-muted-foreground">{grade}</span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function serverCells(grid: Grid) {
  const cells: Record<string, string> = {}
  for (const row of grid.rows) {
    for (const cell of row.cells) {
      cells[`${row.studentId}:${cell.paperId}`] = cell.score == null ? "" : String(cell.score)
    }
  }
  return cells
}
