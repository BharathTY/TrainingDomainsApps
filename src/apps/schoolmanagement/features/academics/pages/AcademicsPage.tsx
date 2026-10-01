import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { DataTable } from "@/shared/DataTable"
import { EmptyState } from "@/shared/EmptyState"
import { FormDrawer } from "@/shared/FormDrawer"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { can } from "@/apps/schoolmanagement/config/permissions"
import { HomeworkBoard } from "@/apps/schoolmanagement/features/communication/components/HomeworkBoard"
import { academicsKeys, archiveSubjects, createSubject, listSubjects, restoreSubjects, updateSubject } from "@/apps/schoolmanagement/features/academics/api"
import { subjectSchema, type SubjectValues } from "@/apps/schoolmanagement/features/academics/schemas"
import type { SchoolSubject } from "@/apps/schoolmanagement/features/academics/types"
import { ApiError } from "@/shared/lib/api-client"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

const empty: SubjectValues = { name: "", code: "" }

export function AcademicsPage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "academics", "view")
  const canCreate = can(role, "academics", "create")
  const canEdit = can(role, "academics", "edit")
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: academicsKeys.all, queryFn: listSubjects, enabled: allowed })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SchoolSubject | null>(null)
  const [pendingIds, setPendingIds] = useState<string[] | null>(null)
  const archivedIds = useRef<string[]>([])

  const refresh = () => queryClient.invalidateQueries({ queryKey: academicsKeys.all })
  const fail = (error: unknown) => toast(error instanceof ApiError ? error.message : "Could not save the subject")
  const create = useMutation({ mutationFn: createSubject, onSuccess: () => refresh(), onError: fail })
  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: SubjectValues }) => updateSubject(id, values),
    onSuccess: () => refresh(),
    onError: fail,
  })
  const archive = useMutation({ mutationFn: archiveSubjects, onSuccess: () => refresh(), onError: fail })
  const restore = useMutation({ mutationFn: restoreSubjects, onSuccess: () => refresh(), onError: fail })

  const defaults = useMemo(() => (editing ? { name: editing.name, code: editing.code } : empty), [editing])

  const columns = useMemo<ColumnDef<SchoolSubject, unknown>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      { accessorKey: "name", header: "Subject" },
      {
        id: "edit",
        header: "",
        enableSorting: false,
        cell: ({ row }) =>
          canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(row.original)
                setOpen(true)
              }}
            >
              Edit
            </Button>
          ) : null,
      },
    ],
    [canEdit],
  )

  if (!allowed) {
    return <EmptyState title="No access" description="Your account cannot open this module." />
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Academics"
        description="Subjects and homework across classes 1–12."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus className="size-4" />
              Add subject
            </Button>
          ) : undefined
        }
      />
      <Tabs defaultValue="subjects">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="homework">Homework</TabsTrigger>
        </TabsList>
        <TabsContent value="subjects">
      <DataTable
        columns={columns}
        data={query.data ?? []}
        getRowId={(row) => row.id}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        searchPlaceholder="Search subjects"
        filename="subjects.csv"
        onCreate={
          canCreate
            ? () => {
                setEditing(null)
                setOpen(true)
              }
            : undefined
        }
        createLabel="Add subject"
        emptyTitle="No subjects"
        emptyDescription="Add a subject to use it on the timetable."
        onBulkDelete={can(role, "academics", "delete") ? setPendingIds : undefined}
      />
        </TabsContent>
        <TabsContent value="homework">
          <HomeworkBoard role={role} canPost={canCreate} canDelete={can(role, "academics", "delete")} />
        </TabsContent>
      </Tabs>
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit subject" : "Add subject"}
        description="Code is unique. Required fields are marked."
        schema={subjectSchema}
        defaultValues={defaults}
        fields={[
          { name: "name", label: "Name", type: "text", placeholder: "Mathematics" },
          { name: "code", label: "Code", type: "text", placeholder: "MAT" },
        ]}
        submitLabel={editing ? "Save subject" : "Add subject"}
        onSubmit={async (values) => {
          if (editing) await update.mutateAsync({ id: editing.id, values })
          else await create.mutateAsync(values)
          toast(editing ? "Subject updated" : "Subject added")
          setEditing(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingIds)}
        onOpenChange={(openDialog) => {
          if (!openDialog) setPendingIds(null)
        }}
        title="Archive subjects"
        description="Archived subjects leave the list. Periods that already use them keep the name. You can undo this from the toast."
        confirmLabel="Archive"
        onConfirm={async () => {
          if (!pendingIds) return
          archivedIds.current = pendingIds
          await archive.mutateAsync(pendingIds)
          setPendingIds(null)
        }}
        undo={{
          message: "Subjects archived",
          onUndo: async () => {
            await restore.mutateAsync(archivedIds.current)
          },
        }}
      />
    </div>
  )
}
