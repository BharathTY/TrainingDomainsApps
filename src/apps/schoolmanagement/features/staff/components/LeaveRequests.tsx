import { zodResolver } from "@hookform/resolvers/zod"
import type { ColumnDef } from "@tanstack/react-table"
import type { ReactNode } from "react"
import { useMemo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { DataTable } from "@/shared/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { leaveSchema, type LeaveValues } from "@/apps/schoolmanagement/features/staff/schemas"
import { LEAVE_STATUSES, LEAVE_TYPES, type LeaveRow, type StaffMember } from "@/apps/schoolmanagement/features/staff/types"

const LEAVE_LABEL = { casual: "Casual", sick: "Sick", earned: "Earned" } as const
const STATUS_LABEL = { pending: "Pending", approved: "Approved", rejected: "Rejected" } as const

export function LeaveRequests({
  staff,
  canEdit,
  requestOpen,
  onRequestOpenChange,
  onDecide,
  onRequest,
}: {
  staff: StaffMember[]
  canEdit: boolean
  requestOpen: boolean
  onRequestOpenChange: (open: boolean) => void
  onDecide: (leaveId: string, status: "approved" | "rejected") => Promise<void>
  onRequest: (values: LeaveValues) => Promise<void>
}) {
  const rows = useMemo<LeaveRow[]>(
    () =>
      staff.flatMap((member) =>
        member.leaves.map((leave) => ({
          ...leave,
          staffId: member.id,
          staffName: `${member.firstName} ${member.lastName}`,
        })),
      ),
    [staff],
  )

  const columns = useMemo<ColumnDef<LeaveRow, unknown>[]>(
    () => [
      { accessorKey: "staffName", header: "Staff" },
      { accessorKey: "type", header: "Type", cell: ({ row }) => LEAVE_LABEL[row.original.type] },
      { accessorKey: "from", header: "From" },
      { accessorKey: "to", header: "To" },
      { accessorKey: "reason", header: "Reason" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge className="capitalize">{STATUS_LABEL[row.original.status]}</Badge>,
      },
      {
        id: "decision",
        header: "",
        enableSorting: false,
        cell: ({ row }) =>
          canEdit && row.original.status === "pending" ? (
            <div className="flex justify-end gap-1">
              <Button type="button" size="sm" variant="outline" onClick={() => void onDecide(row.original.id, "rejected")}>
                Reject
              </Button>
              <Button type="button" size="sm" onClick={() => void onDecide(row.original.id, "approved")}>
                Approve
              </Button>
            </div>
          ) : null,
      },
    ],
    [canEdit, onDecide],
  )

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        searchPlaceholder="Search leave requests"
        filename="leave-requests.csv"
        filters={[
          { columnId: "type", label: "Type", options: LEAVE_TYPES.map((type) => ({ label: LEAVE_LABEL[type], value: type })) },
          { columnId: "status", label: "Status", options: LEAVE_STATUSES.map((status) => ({ label: STATUS_LABEL[status], value: status })) },
        ]}
        emptyTitle="No leave requests"
        emptyDescription="Requests from the directory and this screen show up here."
        onCreate={canEdit ? () => onRequestOpenChange(true) : undefined}
        createLabel="Request leave"
      />
      <LeaveRequestForm open={requestOpen} onOpenChange={onRequestOpenChange} staff={staff.filter((member) => member.status === "active")} onSubmit={onRequest} />
    </>
  )
}

function LeaveRequestForm({
  open,
  onOpenChange,
  staff,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: StaffMember[]
  onSubmit: (values: LeaveValues) => Promise<void>
}) {
  if (!open) return null
  return <LeaveRequestFields staff={staff} onOpenChange={onOpenChange} onSubmit={onSubmit} />
}

function LeaveRequestFields({
  staff,
  onOpenChange,
  onSubmit,
}: {
  staff: StaffMember[]
  onOpenChange: (open: boolean) => void
  onSubmit: (values: LeaveValues) => Promise<void>
}) {
  const form = useForm<LeaveValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { staffId: "", type: "casual", from: "", to: "", reason: "" },
  })
  const staffId = useWatch({ control: form.control, name: "staffId" })
  const type = useWatch({ control: form.control, name: "type" })

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(100%,28rem)]">
        <SheetHeader>
          <SheetTitle>Request leave</SheetTitle>
          <SheetDescription>Pick the staff member and the dates. Required fields are marked.</SheetDescription>
        </SheetHeader>
        <form
          className="grid gap-3 overflow-y-auto"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values)
            onOpenChange(false)
          })}
        >
          <Choice
            label="Staff"
            required
            value={staffId}
            error={form.formState.errors.staffId?.message}
            onChange={(value) => form.setValue("staffId", value, { shouldValidate: true })}
            options={staff.map((member) => ({ label: `${member.firstName} ${member.lastName}`, value: member.id }))}
          />
          <Choice
            label="Type"
            required
            value={type}
            error={form.formState.errors.type?.message}
            onChange={(value) => form.setValue("type", value as LeaveValues["type"], { shouldValidate: true })}
            options={LEAVE_TYPES.map((item) => ({ label: LEAVE_LABEL[item], value: item }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From" required error={form.formState.errors.from?.message}>
              <Input type="date" {...form.register("from")} />
            </Field>
            <Field label="To" required error={form.formState.errors.to?.message}>
              <Input type="date" {...form.register("to")} />
            </Field>
          </div>
          <Field label="Reason" required error={form.formState.errors.reason?.message}>
            <Textarea {...form.register("reason")} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit request</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function Choice({
  label,
  required,
  value,
  onChange,
  options,
  error,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  error?: string
}) {
  return (
    <Field label={label} required={required} error={error}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
