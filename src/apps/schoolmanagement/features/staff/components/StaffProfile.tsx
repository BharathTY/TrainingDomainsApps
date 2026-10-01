import { zodResolver } from "@hookform/resolvers/zod"
import type { ReactNode } from "react"
import { useForm, useWatch } from "react-hook-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DetailTabs } from "@/apps/schoolmanagement/components/DetailTabs"
import { assignmentSchema, ownLeaveSchema, type AssignmentInput, type AssignmentValues, type OwnLeaveValues } from "@/apps/schoolmanagement/features/staff/schemas"
import { LEAVE_TYPES, SUBJECTS, type StaffMember } from "@/apps/schoolmanagement/features/staff/types"
import { SECTIONS } from "@/apps/schoolmanagement/features/students/types"

const ROLE_LABEL = { teacher: "Teacher", office: "Office" } as const
const LEAVE_LABEL = { casual: "Casual", sick: "Sick", earned: "Earned" } as const

export function StaffProfile({
  member,
  canEdit,
  onAssign,
  onRemoveAssignment,
  onRequestLeave,
}: {
  member: StaffMember
  canEdit: boolean
  onAssign: (values: AssignmentValues) => Promise<void>
  onRemoveAssignment: (assignmentId: string) => Promise<void>
  onRequestLeave: (values: OwnLeaveValues) => Promise<void>
}) {
  return (
    <DetailTabs
      title={`${member.firstName} ${member.lastName}`}
      subtitle={`${member.employeeNo} · ${ROLE_LABEL[member.role]}`}
      tabs={[
        {
          value: "overview",
          label: "Overview",
          content: (
            <dl className="divide-y divide-border text-sm">
              {(
                [
                  ["Role", ROLE_LABEL[member.role]],
                  ["Subject", member.subject || "—"],
                  ["Mobile", member.phone],
                  ["Email", member.email],
                  ["Joined", member.joiningDate],
                  ["Status", member.status],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          ),
        },
        {
          value: "assignments",
          label: "Assignments",
          content: (
            <div className="grid gap-4">
              <ul className="divide-y divide-border text-sm">
                {member.assignments.length === 0 ? <li className="py-2 text-muted-foreground">No class assigned.</li> : null}
                {member.assignments.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      Class {item.className}-{item.section} · {item.subject}
                    </span>
                    {canEdit ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => void onRemoveAssignment(item.id)}>
                        Remove
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {member.role === "teacher" && canEdit ? <AssignmentForm subject={member.subject} onAssign={onAssign} /> : null}
              {member.role === "office" ? <p className="text-sm text-muted-foreground">Office staff are not given a subject load.</p> : null}
            </div>
          ),
        },
        {
          value: "leave",
          label: "Leave",
          content: (
            <div className="grid gap-4">
              <ul className="divide-y divide-border text-sm">
                {member.leaves.length === 0 ? <li className="py-2 text-muted-foreground">No leave requests.</li> : null}
                {member.leaves.map((leave) => (
                  <li key={leave.id} className="flex items-start justify-between gap-3 py-2">
                    <div>
                      <p>
                        {LEAVE_LABEL[leave.type]} · {leave.from} to {leave.to}
                      </p>
                      <p className="text-xs text-muted-foreground">{leave.reason}</p>
                    </div>
                    <Badge className="capitalize">{leave.status}</Badge>
                  </li>
                ))}
              </ul>
              {canEdit ? <OwnLeaveForm onSubmit={onRequestLeave} /> : null}
            </div>
          ),
        },
      ]}
    />
  )
}

function AssignmentForm({ subject, onAssign }: { subject: string; onAssign: (values: AssignmentValues) => Promise<void> }) {
  const form = useForm<AssignmentInput, unknown, AssignmentValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { className: "6", section: "A", subject: (SUBJECTS as readonly string[]).includes(subject) ? subject : "English" },
  })
  const values = useWatch({ control: form.control })
  return (
    <form
      className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2"
      onSubmit={form.handleSubmit(async (submitted) => {
        await onAssign(submitted)
        form.reset({ ...submitted })
      })}
    >
      <p className="text-sm font-medium sm:col-span-2">Assign subject and class</p>
      <Choice label="Class" required value={values.className ?? ""} onChange={(value) => form.setValue("className", value, { shouldValidate: true })} options={Array.from({ length: 12 }, (_, index) => ({ label: `Class ${index + 1}`, value: String(index + 1) }))} error={form.formState.errors.className?.message} />
      <Choice label="Section" required value={values.section ?? ""} onChange={(value) => form.setValue("section", value as AssignmentValues["section"], { shouldValidate: true })} options={SECTIONS.map((section) => ({ label: section, value: section }))} error={form.formState.errors.section?.message} />
      <Choice label="Subject" required value={values.subject ?? ""} onChange={(value) => form.setValue("subject", value, { shouldValidate: true })} options={SUBJECTS.map((item) => ({ label: item, value: item }))} error={form.formState.errors.subject?.message} />
      <div className="flex items-end">
        <Button type="submit">Add assignment</Button>
      </div>
    </form>
  )
}

function OwnLeaveForm({ onSubmit }: { onSubmit: (values: OwnLeaveValues) => Promise<void> }) {
  const form = useForm<OwnLeaveValues>({
    resolver: zodResolver(ownLeaveSchema),
    defaultValues: { type: "casual", from: "", to: "", reason: "" },
  })
  const type = useWatch({ control: form.control, name: "type" })
  return (
    <form
      className="grid gap-3 rounded-md border border-border p-3"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values)
        form.reset({ type: values.type, from: "", to: "", reason: "" })
      })}
    >
      <p className="text-sm font-medium">Request leave</p>
      <Choice label="Type" required value={type} onChange={(value) => form.setValue("type", value as OwnLeaveValues["type"], { shouldValidate: true })} options={LEAVE_TYPES.map((item) => ({ label: LEAVE_LABEL[item], value: item }))} error={form.formState.errors.type?.message} />
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
      <Button type="submit">Submit request</Button>
    </form>
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
