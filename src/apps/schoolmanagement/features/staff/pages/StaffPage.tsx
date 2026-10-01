import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { DataTable } from "@/shared/DataTable"
import { EmptyState } from "@/shared/EmptyState"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { can } from "@/apps/schoolmanagement/config/permissions"
import { LeaveRequests } from "@/apps/schoolmanagement/features/staff/components/LeaveRequests"
import { StaffForm } from "@/apps/schoolmanagement/features/staff/components/StaffForm"
import { StaffProfile } from "@/apps/schoolmanagement/features/staff/components/StaffProfile"
import { archiveStaff, assignClass, createStaffMember, decideLeave, listStaff, removeAssignment, requestLeave, requestOwnLeave, restoreStaff, staffKeys } from "@/apps/schoolmanagement/features/staff/api"
import type { AssignmentValues, LeaveValues, OwnLeaveValues, StaffCreateValues } from "@/apps/schoolmanagement/features/staff/schemas"
import { STAFF_ROLES, STAFF_STATUSES, SUBJECTS, type StaffMember } from "@/apps/schoolmanagement/features/staff/types"
import { ApiError } from "@/shared/lib/api-client"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

const ROLE_LABEL = { teacher: "Teacher", office: "Office" } as const
const STATUS_LABEL = { active: "Active", inactive: "Inactive" } as const

export function StaffPage() {
  const role = useUiStore((state) => state.role)
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: staffKeys.all, queryFn: listStaff, enabled: can(role, "staff", "view") })
  const [screen, setScreen] = useState("directory")
  const [createOpen, setCreateOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [pendingIds, setPendingIds] = useState<string[] | null>(null)
  const archivedIds = useRef<string[]>([])
  const [active, setActive] = useState<StaffMember | null>(null)
  const canCreate = can(role, "staff", "create")
  const canEdit = can(role, "staff", "edit")

  const refresh = async (staffId?: string) => {
    await queryClient.invalidateQueries({ queryKey: staffKeys.all })
    if (!staffId) return
    const list = queryClient.getQueryData<StaffMember[]>(staffKeys.all)
    setActive((current) => (current?.id === staffId ? (list?.find((item) => item.id === staffId) ?? current) : current))
  }

  const fail = (error: unknown) => toast(error instanceof ApiError ? error.message : "Could not save")
  const create = useMutation({ mutationFn: createStaffMember, onSuccess: () => refresh(), onError: fail })
  const archive = useMutation({ mutationFn: archiveStaff, onSuccess: () => refresh(), onError: fail })
  const restore = useMutation({ mutationFn: restoreStaff, onSuccess: () => refresh(), onError: fail })
  const assign = useMutation({
    mutationFn: ({ staffId, values }: { staffId: string; values: AssignmentValues }) => assignClass(staffId, values),
    onSuccess: (_member, variables) => refresh(variables.staffId),
    onError: fail,
  })
  const unassign = useMutation({
    mutationFn: ({ staffId, assignmentId }: { staffId: string; assignmentId: string }) => removeAssignment(staffId, assignmentId),
    onSuccess: (_member, variables) => refresh(variables.staffId),
    onError: fail,
  })
  const leave = useMutation({
    mutationFn: (values: LeaveValues) => requestLeave(values),
    onSuccess: (_member, values) => refresh(values.staffId),
    onError: fail,
  })
  const ownLeave = useMutation({
    mutationFn: ({ staffId, values }: { staffId: string; values: OwnLeaveValues }) => requestOwnLeave(staffId, values),
    onSuccess: (_member, variables) => refresh(variables.staffId),
    onError: fail,
  })
  const decision = useMutation({
    mutationFn: ({ leaveId, status }: { leaveId: string; status: "approved" | "rejected" }) => decideLeave(leaveId, status),
    onSuccess: async (member, variables) => {
      await refresh(member.id)
      toast(variables.status === "approved" ? "Leave approved" : "Leave rejected")
    },
    onError: fail,
  })

  const columns = useMemo<ColumnDef<StaffMember, unknown>[]>(
    () => [
      { accessorKey: "employeeNo", header: "Employee" },
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
      { accessorKey: "role", header: "Role", cell: ({ row }) => ROLE_LABEL[row.original.role] },
      { accessorKey: "subject", header: "Subject", cell: ({ row }) => row.original.subject || "—" },
      {
        id: "classes",
        header: "Classes",
        accessorFn: (row) => row.assignments.map((item) => `${item.className}-${item.section} ${item.subject}`).join(", "),
        cell: ({ row }) => row.original.assignments.map((item) => `${item.className}-${item.section}`).join(", ") || "—",
      },
      { accessorKey: "phone", header: "Mobile" },
      { accessorKey: "status", header: "Status", cell: ({ row }) => STATUS_LABEL[row.original.status] },
    ],
    [],
  )

  if (!can(role, "staff", "view")) {
    return <EmptyState title="No access" description="Your account cannot open this module." />
  }

  const staff = query.data ?? []

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <Tabs value={screen} onValueChange={setScreen}>
        <PageHeader
          title="Staff"
          description="Teachers, office staff, class assignments, and leave."
          actions={
            canCreate && screen === "directory" ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Add staff
              </Button>
            ) : canEdit && screen === "leave" ? (
              <Button onClick={() => setRequestOpen(true)}>Request leave</Button>
            ) : null
          }
        />
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="leave">Leave requests</TabsTrigger>
        </TabsList>
        <TabsContent value="directory">
          <DataTable
            columns={columns}
            data={staff}
            getRowId={(row) => row.id}
            isLoading={query.isLoading}
            isError={query.isError}
            onRetry={() => void query.refetch()}
            searchPlaceholder="Search staff"
            filename="staff.csv"
            filters={[
              { columnId: "role", label: "Role", options: STAFF_ROLES.map((item) => ({ label: ROLE_LABEL[item], value: item })) },
              { columnId: "subject", label: "Subject", options: SUBJECTS.map((item) => ({ label: item, value: item })) },
              { columnId: "status", label: "Status", options: STAFF_STATUSES.map((item) => ({ label: STATUS_LABEL[item], value: item })) },
            ]}
            onCreate={canCreate ? () => setCreateOpen(true) : undefined}
            createLabel="Add staff"
            emptyTitle="No staff"
            emptyDescription="Add a teacher or an office colleague to the directory."
            onBulkDelete={can(role, "staff", "delete") ? setPendingIds : undefined}
          />
        </TabsContent>
        <TabsContent value="leave">
          <LeaveRequests
            staff={staff}
            canEdit={canEdit}
            requestOpen={requestOpen}
            onRequestOpenChange={setRequestOpen}
            onDecide={async (leaveId, status) => {
              await decision.mutateAsync({ leaveId, status })
            }}
            onRequest={async (values) => {
              await leave.mutateAsync(values)
              toast("Leave requested")
            }}
          />
        </TabsContent>
      </Tabs>
      <StaffForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={async (values: StaffCreateValues) => {
          await create.mutateAsync(values)
          toast("Staff member added")
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingIds)}
        onOpenChange={(open) => {
          if (!open) setPendingIds(null)
        }}
        title="Archive staff"
        description="Archived people leave the directory. You can undo this from the toast."
        confirmLabel="Archive"
        onConfirm={async () => {
          if (!pendingIds) return
          archivedIds.current = pendingIds
          await archive.mutateAsync(pendingIds)
          setPendingIds(null)
          setActive(null)
        }}
        undo={{
          message: "Staff archived",
          onUndo: async () => {
            await restore.mutateAsync(archivedIds.current)
          },
        }}
      />
      <Sheet open={Boolean(active)} onOpenChange={(open) => { if (!open) setActive(null) }}>
        <SheetContent className="w-[min(100%,42rem)]">
          <SheetHeader className="sr-only">
            <SheetTitle>Staff profile</SheetTitle>
            <SheetDescription>Overview, assignments, and leave for this person.</SheetDescription>
          </SheetHeader>
          {active ? (
            <StaffProfile
              member={active}
              canEdit={canEdit}
              onAssign={async (values) => {
                await assign.mutateAsync({ staffId: active.id, values })
                toast("Assignment added")
              }}
              onRemoveAssignment={async (assignmentId) => {
                await unassign.mutateAsync({ staffId: active.id, assignmentId })
                toast("Assignment removed")
              }}
              onRequestLeave={async (values) => {
                await ownLeave.mutateAsync({ staffId: active.id, values })
                toast("Leave requested")
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
