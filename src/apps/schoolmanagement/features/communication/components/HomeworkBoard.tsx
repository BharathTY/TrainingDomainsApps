import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { EmptyState } from "@/shared/EmptyState"
import { FormDrawer } from "@/shared/FormDrawer"
import { Button } from "@/components/ui/button"
import type { Role } from "@/apps/schoolmanagement/config/permissions"
import { archiveHomework, commKeys, createHomework, listHomework, restoreHomework } from "@/apps/schoolmanagement/features/communication/api"
import { homeworkSchema, type HomeworkValues } from "@/apps/schoolmanagement/features/communication/schemas"
import { ApiError } from "@/shared/lib/api-client"

const classes = Array.from({ length: 12 }, (_, index) => ({ label: `Class ${index + 1}`, value: String(index + 1) }))
const sections = ["A", "B", "C", "D"].map((value) => ({ label: value, value }))
const blank: HomeworkValues = { title: "", subject: "", className: "6", section: "A", dueDate: "2026-10-03", details: "" }

export function HomeworkBoard({ role, canPost, canDelete }: { role: Role; canPost: boolean; canDelete: boolean }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: commKeys.homework(role), queryFn: () => listHomework(role) })
  const [open, setOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const archivedId = useRef("")
  const defaults = useMemo(() => blank, [])
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["communication", "homework"] })
  const fail = (error: unknown) => toast(error instanceof ApiError ? error.message : "Could not save the homework")
  const create = useMutation({ mutationFn: createHomework, onSuccess: () => refresh(), onError: fail })
  const archive = useMutation({ mutationFn: archiveHomework, onSuccess: () => refresh(), onError: fail })
  const restore = useMutation({ mutationFn: restoreHomework, onSuccess: () => refresh(), onError: fail })

  return (
    <div className="grid gap-3">
      {canPost ? (
        <div>
          <Button type="button" onClick={() => setOpen(true)}>
            Post homework
          </Button>
        </div>
      ) : null}
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading homework…</p> : null}
      {query.isError ? <EmptyState title="Could not load homework" description="The assignments did not load." actionLabel="Retry" onAction={() => void query.refetch()} /> : null}
      {query.data && query.data.length === 0 ? <EmptyState title="No homework" description="Nothing is due for this class." /> : null}
      <ul className="grid gap-2">
        {(query.data ?? []).map((item) => (
          <li key={item.id} className="rounded-md border border-border px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.details}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.subject} · Class {item.className}-{item.section} · due {item.dueDate}
                </p>
              </div>
              {canDelete ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPendingId(item.id)}>
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
        title="Post homework"
        description="Students and parents in that class can read it."
        schema={homeworkSchema}
        defaultValues={defaults}
        fields={[
          { name: "title", label: "Title", type: "text", placeholder: "Chapter 4 questions" },
          { name: "subject", label: "Subject", type: "text", placeholder: "Science" },
          { name: "className", label: "Class", type: "select", options: classes },
          { name: "section", label: "Section", type: "select", options: sections },
          { name: "dueDate", label: "Due date", type: "date" },
          { name: "details", label: "Details", type: "textarea", placeholder: "What to finish" },
        ]}
        submitLabel="Post"
        onSubmit={async (values) => {
          await create.mutateAsync(values)
          toast("Homework posted")
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingId)}
        onOpenChange={(next) => {
          if (!next) setPendingId(null)
        }}
        title="Archive homework"
        description="The assignment leaves the list. You can undo this from the toast."
        confirmLabel="Archive"
        onConfirm={async () => {
          if (!pendingId) return
          archivedId.current = pendingId
          await archive.mutateAsync([pendingId])
          setPendingId(null)
        }}
        undo={{
          message: "Homework archived",
          onUndo: async () => {
            await restore.mutateAsync([archivedId.current])
          },
        }}
      />
    </div>
  )
}
