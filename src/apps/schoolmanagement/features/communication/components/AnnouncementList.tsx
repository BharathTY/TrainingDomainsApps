import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { EmptyState } from "@/shared/EmptyState"
import { FormDrawer } from "@/shared/FormDrawer"
import { Button } from "@/components/ui/button"
import type { Role } from "@/apps/schoolmanagement/config/permissions"
import { archiveAnnouncements, commKeys, createAnnouncement, listAnnouncements, restoreAnnouncements } from "@/apps/schoolmanagement/features/communication/api"
import { announcementSchema, type AnnouncementValues } from "@/apps/schoolmanagement/features/communication/schemas"
import { ApiError } from "@/shared/lib/api-client"

const audiences = [
  { label: "Whole school", value: "all" },
  { label: "Staff", value: "staff" },
  { label: "Parents", value: "parents" },
  { label: "Students", value: "students" },
]
const classes = [{ label: "Any class", value: "any" }, ...Array.from({ length: 12 }, (_, index) => ({ label: `Class ${index + 1}`, value: String(index + 1) }))]
const blank: AnnouncementValues = { title: "", body: "", audience: "all", className: "any" }

export function AnnouncementList({ role, canCreate, canDelete }: { role: Role; canCreate: boolean; canDelete: boolean }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: commKeys.announcements(role), queryFn: () => listAnnouncements(role) })
  const [open, setOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const archivedId = useRef("")
  const defaults = useMemo(() => blank, [])
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["communication", "announcements"] })
  const fail = (error: unknown) => toast(error instanceof ApiError ? error.message : "Could not save the announcement")
  const create = useMutation({ mutationFn: createAnnouncement, onSuccess: () => refresh(), onError: fail })
  const archive = useMutation({ mutationFn: archiveAnnouncements, onSuccess: () => refresh(), onError: fail })
  const restore = useMutation({ mutationFn: restoreAnnouncements, onSuccess: () => refresh(), onError: fail })

  return (
    <div className="grid gap-3">
      {canCreate ? (
        <div>
          <Button type="button" onClick={() => setOpen(true)}>
            Post announcement
          </Button>
        </div>
      ) : null}
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading announcements…</p> : null}
      {query.isError ? <EmptyState title="Could not load announcements" description="The notice list did not load." actionLabel="Retry" onAction={() => void query.refetch()} /> : null}
      {query.data && query.data.length === 0 ? <EmptyState title="No announcements" description="Nothing is posted for this audience." /> : null}
      <ul className="grid gap-2">
        {(query.data ?? []).map((item) => (
          <li key={item.id} className="rounded-md border border-border px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.postedOn} · {item.audience}
                  {item.className ? ` · Class ${item.className}` : ""}
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
        title="Post announcement"
        description="Choose who should see it. A class narrows parents and students."
        schema={announcementSchema}
        defaultValues={defaults}
        fields={[
          { name: "title", label: "Title", type: "text", placeholder: "PTM this Saturday" },
          { name: "body", label: "Message", type: "textarea", placeholder: "What families need to know" },
          { name: "audience", label: "Audience", type: "select", options: audiences },
          { name: "className", label: "Class", type: "select", options: classes },
        ]}
        submitLabel="Post"
        onSubmit={async (values) => {
          await create.mutateAsync(values)
          toast("Announcement posted")
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingId)}
        onOpenChange={(next) => {
          if (!next) setPendingId(null)
        }}
        title="Archive announcement"
        description="The notice leaves the board. You can undo this from the toast."
        confirmLabel="Archive"
        onConfirm={async () => {
          if (!pendingId) return
          archivedId.current = pendingId
          await archive.mutateAsync([pendingId])
          setPendingId(null)
        }}
        undo={{
          message: "Announcement archived",
          onUndo: async () => {
            await restore.mutateAsync([archivedId.current])
          },
        }}
      />
    </div>
  )
}
