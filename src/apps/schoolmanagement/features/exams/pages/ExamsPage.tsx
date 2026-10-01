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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { can, type Role } from "@/apps/schoolmanagement/config/permissions"
import { ExamWorkspace } from "@/apps/schoolmanagement/features/exams/components/ExamWorkspace"
import { GradingEditor } from "@/apps/schoolmanagement/features/exams/components/GradingEditor"
import { ReportCardPanel } from "@/apps/schoolmanagement/features/exams/components/ReportCardPanel"
import { archiveExams, createExam, examKeys, listExams, restoreExams, updateExam } from "@/apps/schoolmanagement/features/exams/api"
import { examSchema, type ExamValues } from "@/apps/schoolmanagement/features/exams/schemas"
import type { Exam } from "@/apps/schoolmanagement/features/exams/types"
import { ApiError } from "@/shared/lib/api-client"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

const empty: ExamValues = { name: "", className: "6", term: "", startDate: "", endDate: "" }
const classOptions = Array.from({ length: 12 }, (_, index) => ({ label: `Class ${index + 1}`, value: String(index + 1) }))

export function ExamsPage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "exams", "view")
  const canCreate = can(role, "exams", "create")
  const canEdit = can(role, "exams", "edit")
  const canDelete = can(role, "exams", "delete")
  const canExport = can(role, "exams", "export")
  const personal = role === "parent" || role === "student"

  if (!allowed) {
    return <EmptyState title="No access" description="Your account cannot open this module." />
  }
  if (personal) return <PersonalExams role={role} />
  return <StaffExams role={role} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} canExport={canExport} />
}

function PersonalExams({ role }: { role: Role }) {
  const query = useQuery({ queryKey: examKeys.all, queryFn: listExams })
  const exams = (query.data ?? []).filter((exam) => exam.className === "6")
  const [examId, setExamId] = useState("")
  const selected = exams.find((exam) => exam.id === examId) ?? exams[0]
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader title="Exams" description="Report card for this term." />
      {query.isError ? <EmptyState title="Could not load exams" description="The exam list did not load." actionLabel="Retry" onAction={() => void query.refetch()} /> : null}
      {query.data && exams.length === 0 ? <EmptyState title="No exams" description="Nothing is scheduled for this class." /> : null}
      {selected ? (
        <div className="grid gap-3">
          <div className="grid gap-1.5" data-print-hide>
            <Label>
              Exam<span className="text-destructive"> *</span>
            </Label>
            <Select value={selected.id} onValueChange={setExamId}>
              <SelectTrigger aria-label="Exam" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.name} · {exam.term}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ReportCardPanel examId={selected.id} className={selected.className} role={role} personal canExport={false} />
        </div>
      ) : null}
    </div>
  )
}

function StaffExams({
  role,
  canCreate,
  canEdit,
  canDelete,
  canExport,
}: {
  role: Role
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canExport: boolean
}) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: examKeys.all, queryFn: listExams })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Exam | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<string[] | null>(null)
  const archivedIds = useRef<string[]>([])
  const refresh = () => queryClient.invalidateQueries({ queryKey: examKeys.all })
  const fail = (error: unknown) => toast(error instanceof ApiError ? error.message : "Could not save the exam")
  const create = useMutation({ mutationFn: createExam, onSuccess: () => refresh(), onError: fail })
  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ExamValues }) => updateExam(id, values),
    onSuccess: () => refresh(),
    onError: fail,
  })
  const archive = useMutation({ mutationFn: archiveExams, onSuccess: () => refresh(), onError: fail })
  const restore = useMutation({ mutationFn: restoreExams, onSuccess: () => refresh(), onError: fail })
  const defaults = useMemo(() => (editing ? { name: editing.name, className: editing.className, term: editing.term, startDate: editing.startDate, endDate: editing.endDate } : empty), [editing])
  const selected = (query.data ?? []).find((exam) => exam.id === selectedId) ?? null
  const columns = useMemo<ColumnDef<Exam, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Exam" },
      { accessorKey: "className", header: "Class" },
      { accessorKey: "term", header: "Term" },
      { id: "when", header: "Dates", accessorFn: (row) => `${row.startDate} – ${row.endDate}` },
      {
        id: "open",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedId(row.original.id)}>
            Open
          </Button>
        ),
      },
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Exams"
        description="Schedule papers, enter marks, and print a report card."
        actions={
          canCreate && !selected ? (
            <Button
              type="button"
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus className="size-4" />
              Add exam
            </Button>
          ) : null
        }
      />
      <Tabs defaultValue="exams">
        <TabsList data-print-hide>
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="grading">Grading</TabsTrigger>
        </TabsList>
        <TabsContent value="exams">
          {selected ? (
            <ExamWorkspace exam={selected} role={role} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} canExport={canExport} onBack={() => setSelectedId(null)} />
          ) : (
            <DataTable
              columns={columns}
              data={query.data ?? []}
              getRowId={(row) => row.id}
              isLoading={query.isLoading}
              isError={query.isError}
              onRetry={() => void query.refetch()}
              searchPlaceholder="Search exams"
              filename="exams.csv"
              onCreate={
                canCreate
                  ? () => {
                      setEditing(null)
                      setOpen(true)
                    }
                  : undefined
              }
              createLabel="Add exam"
              emptyTitle="No exams"
              emptyDescription="Add an exam to schedule papers and enter marks."
              onBulkDelete={canDelete ? setPendingIds : undefined}
            />
          )}
        </TabsContent>
        <TabsContent value="grading">
          <GradingEditor canEdit={canEdit} />
        </TabsContent>
      </Tabs>
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit exam" : "Add exam"}
        description="Dates cover the whole exam. Required fields are marked."
        schema={examSchema}
        defaultValues={defaults}
        fields={[
          { name: "name", label: "Name", type: "text", placeholder: "Term 1" },
          { name: "className", label: "Class", type: "select", options: classOptions },
          { name: "term", label: "Term", type: "text", placeholder: "Term 1" },
          { name: "startDate", label: "Start date", type: "date" },
          { name: "endDate", label: "End date", type: "date" },
        ]}
        submitLabel={editing ? "Save exam" : "Add exam"}
        onSubmit={async (values) => {
          if (editing) await update.mutateAsync({ id: editing.id, values })
          else await create.mutateAsync(values)
          toast(editing ? "Exam updated" : "Exam added")
          setEditing(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingIds)}
        onOpenChange={(next) => {
          if (!next) setPendingIds(null)
        }}
        title="Archive exams"
        description="Archived exams leave the list. Papers and marks stay on the record. You can undo this from the toast."
        confirmLabel="Archive"
        onConfirm={async () => {
          if (!pendingIds) return
          archivedIds.current = pendingIds
          await archive.mutateAsync(pendingIds)
          setPendingIds(null)
        }}
        undo={{
          message: "Exams archived",
          onUndo: async () => {
            await restore.mutateAsync(archivedIds.current)
          },
        }}
      />
    </div>
  )
}
