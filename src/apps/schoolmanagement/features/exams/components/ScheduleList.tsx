import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { EmptyState } from "@/shared/EmptyState"
import { FormDrawer } from "@/shared/FormDrawer"
import { Button } from "@/components/ui/button"
import { academicsKeys, listSubjects } from "@/apps/schoolmanagement/features/academics/api"
import { archivePapers, createPaper, examKeys, listPapers, restorePapers, updatePaper } from "@/apps/schoolmanagement/features/exams/api"
import { paperSchema, type PaperValues } from "@/apps/schoolmanagement/features/exams/schemas"
import type { ExamPaper } from "@/apps/schoolmanagement/features/exams/types"
import { ApiError } from "@/shared/lib/api-client"

const blank: PaperValues = { subjectId: "", date: "2026-10-10", startTime: "09:00", durationMinutes: 180, maxMarks: 100 }

export function ScheduleList({ examId, canCreate, canEdit, canDelete }: { examId: string; canCreate: boolean; canEdit: boolean; canDelete: boolean }) {
  const queryClient = useQueryClient()
  const papers = useQuery({ queryKey: examKeys.papers(examId), queryFn: () => listPapers(examId) })
  const subjects = useQuery({ queryKey: academicsKeys.all, queryFn: listSubjects, enabled: canCreate || canEdit })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ExamPaper | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const archivedId = useRef("")
  const refresh = () => queryClient.invalidateQueries({ queryKey: examKeys.all })
  const fail = (error: unknown) => toast(error instanceof ApiError ? error.message : "Could not save the paper")
  const create = useMutation({ mutationFn: (values: PaperValues) => createPaper(examId, values), onSuccess: () => refresh(), onError: fail })
  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: PaperValues }) => updatePaper(id, values),
    onSuccess: () => refresh(),
    onError: fail,
  })
  const archive = useMutation({ mutationFn: archivePapers, onSuccess: () => refresh(), onError: fail })
  const restore = useMutation({ mutationFn: restorePapers, onSuccess: () => refresh(), onError: fail })
  const options = useMemo(() => (subjects.data ?? []).map((subject) => ({ label: subject.name, value: subject.id })), [subjects.data])
  const defaults = useMemo<PaperValues>(
    () =>
      editing
        ? {
            subjectId: editing.subjectId,
            date: editing.date,
            startTime: editing.startTime,
            durationMinutes: editing.durationMinutes,
            maxMarks: editing.maxMarks,
          }
        : { ...blank, subjectId: options[0]?.value ?? "" },
    [editing, options],
  )

  return (
    <div className="grid gap-3">
      {canCreate ? (
        <div>
          <Button
            type="button"
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            Add paper
          </Button>
        </div>
      ) : null}
      {papers.isLoading ? <p className="text-sm text-muted-foreground">Loading the schedule…</p> : null}
      {papers.isError ? <EmptyState title="Could not load the schedule" description="The papers did not load." actionLabel="Retry" onAction={() => void papers.refetch()} /> : null}
      {papers.data && papers.data.length === 0 ? <EmptyState title="No papers" description="Add a subject paper to this exam." /> : null}
      <ul className="grid gap-2">
        {(papers.data ?? []).map((paper) => (
          <li key={paper.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">{paper.subjectName}</p>
              <p className="text-xs text-muted-foreground">
                {paper.date} · {paper.startTime} · {paper.durationMinutes} min · {paper.maxMarks} marks
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(paper)
                    setOpen(true)
                  }}
                >
                  Edit
                </Button>
              ) : null}
              {canDelete ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPendingId(paper.id)}>
                  Archive
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit paper" : "Add paper"}
        description="One subject sits once on this exam."
        schema={paperSchema}
        defaultValues={defaults}
        fields={[
          { name: "subjectId", label: "Subject", type: "select", options },
          { name: "date", label: "Date", type: "date" },
          { name: "startTime", label: "Start time", type: "text", placeholder: "09:00" },
          { name: "durationMinutes", label: "Duration (minutes)", type: "number" },
          { name: "maxMarks", label: "Max marks", type: "number" },
        ]}
        submitLabel={editing ? "Save paper" : "Add paper"}
        onSubmit={async (values) => {
          if (editing) await update.mutateAsync({ id: editing.id, values })
          else await create.mutateAsync(values)
          toast(editing ? "Paper updated" : "Paper added")
          setEditing(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingId)}
        onOpenChange={(next) => {
          if (!next) setPendingId(null)
        }}
        title="Archive paper"
        description="The paper leaves the schedule. Saved marks stay on the record. You can undo this from the toast."
        confirmLabel="Archive"
        onConfirm={async () => {
          if (!pendingId) return
          archivedId.current = pendingId
          await archive.mutateAsync([pendingId])
          setPendingId(null)
        }}
        undo={{
          message: "Paper archived",
          onUndo: async () => {
            await restore.mutateAsync([archivedId.current])
          },
        }}
      />
    </div>
  )
}
