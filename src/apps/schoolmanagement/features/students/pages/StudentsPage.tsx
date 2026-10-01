import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Upload } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { DataTable } from "@/shared/DataTable"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { can } from "@/apps/schoolmanagement/config/permissions"
import { AdmissionWizard } from "@/apps/schoolmanagement/features/students/components/AdmissionWizard"
import { ImportStudentsDialog } from "@/apps/schoolmanagement/features/students/components/ImportStudentsDialog"
import { MessageDialog } from "@/apps/schoolmanagement/features/students/components/MessageDialog"
import { StudentProfile } from "@/apps/schoolmanagement/features/students/components/StudentProfile"
import { archiveStudents, createStudent, importStudents, listStudents, messageStudents, promoteStudents, restoreStudents, studentKeys } from "@/apps/schoolmanagement/features/students/api"
import { GENDERS, SECTIONS, STUDENT_STATUSES, type Student } from "@/apps/schoolmanagement/features/students/types"
import { downloadCsv } from "@/shared/lib/csv"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

const GENDER_LABEL = { female: "Female", male: "Male", other: "Other" } as const
const STATUS_LABEL = { active: "Active", inactive: "Inactive", alumni: "Alumni" } as const

export function StudentsPage() {
  const role = useUiStore((state) => state.role)
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: studentKeys.all, queryFn: listStudents })
  const [admitOpen, setAdmitOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [pendingIds, setPendingIds] = useState<string[] | null>(null)
  const [promoteIds, setPromoteIds] = useState<string[] | null>(null)
  const [messageIds, setMessageIds] = useState<string[] | null>(null)
  const archivedIds = useRef<string[]>([])
  const [active, setActive] = useState<Student | null>(null)
  const canCreate = can(role, "students", "create")
  const canEdit = can(role, "students", "edit")

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: studentKeys.all })
  }
  const create = useMutation({ mutationFn: createStudent, onSuccess: refresh })
  const importing = useMutation({ mutationFn: importStudents, onSuccess: refresh })
  const archive = useMutation({ mutationFn: archiveStudents, onSuccess: refresh })
  const restore = useMutation({ mutationFn: restoreStudents, onSuccess: refresh })
  const promote = useMutation({
    mutationFn: promoteStudents,
    onSuccess: async () => {
      await refresh()
      toast("Students promoted")
    },
  })
  const message = useMutation({
    mutationFn: ({ ids, body }: { ids: string[]; body: string }) => messageStudents(ids, body),
    onSuccess: () => toast("Message sent to guardians"),
  })

  const columns = useMemo<ColumnDef<Student, unknown>[]>(
    () => [
      { accessorKey: "admissionNo", header: "Admission" },
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        cell: ({ row }) => (
          <Button type="button" variant="ghost" className="h-auto px-0 font-medium" onClick={() => setActive(row.original)}>
            {row.original.firstName} {row.original.lastName}
          </Button>
        ),
      },
      {
        accessorKey: "gender",
        header: "Gender",
        cell: ({ row }) => GENDER_LABEL[row.original.gender],
      },
      { accessorKey: "className", header: "Class" },
      { accessorKey: "section", header: "Section" },
      { accessorKey: "guardianName", header: "Guardian" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => STATUS_LABEL[row.original.status],
      },
    ],
    [],
  )

  const classOptions = Array.from({ length: 12 }, (_, index) => {
    const value = String(index + 1)
    return { label: `Class ${value}`, value }
  })

  function exportSelected(ids: string[]) {
    const rows = (query.data ?? []).filter((student) => ids.includes(student.id))
    downloadCsv("students-selected.csv", [
      ["Admission", "Name", "Gender", "Class", "Section", "Status", "Guardian", "Mobile"],
      ...rows.map((student) => [
        student.admissionNo,
        `${student.firstName} ${student.lastName}`,
        GENDER_LABEL[student.gender],
        student.className,
        student.section,
        STATUS_LABEL[student.status],
        student.guardianName,
        student.guardianPhone,
      ]),
    ])
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Students"
        description="Search, filter, import, and open a student profile."
        actions={
          canCreate ? (
            <>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="size-4" />
                Import CSV
              </Button>
              <Button onClick={() => setAdmitOpen(true)}>
                <Plus className="size-4" />
                New admission
              </Button>
            </>
          ) : null
        }
      />
      <DataTable
        columns={columns}
        data={query.data ?? []}
        getRowId={(row) => row.id}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        searchPlaceholder="Search students"
        filename="students.csv"
        filters={[
          { columnId: "className", label: "Class", options: classOptions },
          { columnId: "section", label: "Section", options: SECTIONS.map((section) => ({ label: section, value: section })) },
          { columnId: "status", label: "Status", options: STUDENT_STATUSES.map((status) => ({ label: STATUS_LABEL[status], value: status })) },
          { columnId: "gender", label: "Gender", options: GENDERS.map((gender) => ({ label: GENDER_LABEL[gender], value: gender })) },
        ]}
        onCreate={canCreate ? () => setAdmitOpen(true) : undefined}
        createLabel="New admission"
        emptyTitle="No students"
        emptyDescription="Admit a student or import a CSV to start the register."
        bulkActions={[
          ...(canEdit ? [{ id: "promote", label: "Promote", onClick: setPromoteIds }] : []),
          { id: "export", label: "Export", onClick: exportSelected },
          ...(canEdit ? [{ id: "message", label: "Send message", onClick: setMessageIds }] : []),
        ]}
        onBulkDelete={can(role, "students", "delete") ? setPendingIds : undefined}
      />
      <AdmissionWizard
        open={admitOpen}
        onOpenChange={setAdmitOpen}
        onSubmit={async (values) => {
          await create.mutateAsync(values)
          toast("Student admitted")
        }}
      />
      <ImportStudentsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={async (rows) => {
          const result = await importing.mutateAsync(rows)
          toast(`${result.count} students imported`)
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingIds)}
        onOpenChange={(open) => {
          if (!open) setPendingIds(null)
        }}
        title="Archive students"
        description="Archived students leave the list. You can undo this from the toast."
        confirmLabel="Archive"
        onConfirm={async () => {
          if (!pendingIds) return
          archivedIds.current = pendingIds
          await archive.mutateAsync(pendingIds)
          setPendingIds(null)
        }}
        undo={{
          message: "Students archived",
          onUndo: async () => {
            await restore.mutateAsync(archivedIds.current)
          },
        }}
      />
      <ConfirmDialog
        open={Boolean(promoteIds)}
        onOpenChange={(open) => {
          if (!open) setPromoteIds(null)
        }}
        title="Promote students"
        description="Each selected student moves up one class. Class 12 becomes alumni."
        confirmLabel="Promote"
        onConfirm={async () => {
          if (!promoteIds) return
          await promote.mutateAsync(promoteIds)
          setPromoteIds(null)
        }}
      />
      <MessageDialog
        open={Boolean(messageIds)}
        count={messageIds?.length ?? 0}
        onOpenChange={(open) => {
          if (!open) setMessageIds(null)
        }}
        onSend={async (body) => {
          if (!messageIds) return
          await message.mutateAsync({ ids: messageIds, body })
          setMessageIds(null)
        }}
      />
      <Sheet open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <SheetContent className="w-[min(100%,42rem)]">
          <SheetHeader className="sr-only">
            <SheetTitle>Student profile</SheetTitle>
            <SheetDescription>Overview, academics, attendance, fees, documents, and parents.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {active ? <StudentProfile student={active} /> : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
