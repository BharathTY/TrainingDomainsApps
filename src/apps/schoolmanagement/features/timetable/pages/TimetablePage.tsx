import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { EmptyState } from "@/shared/EmptyState"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { can } from "@/apps/schoolmanagement/config/permissions"
import { academicsKeys, listSubjects } from "@/apps/schoolmanagement/features/academics/api"
import { listStaff, staffKeys } from "@/apps/schoolmanagement/features/staff/api"
import { TimetableBoard } from "@/apps/schoolmanagement/features/timetable/components/TimetableBoard"
import { archiveSlots, listSlots, moveSlot, placeSlot, restoreSlots, timetableKeys } from "@/apps/schoolmanagement/features/timetable/api"
import { slotSchema, type SlotInput, type SlotValues } from "@/apps/schoolmanagement/features/timetable/schemas"
import { WEEKDAYS, WEEKDAY_LABEL, type Weekday } from "@/apps/schoolmanagement/features/timetable/types"
import { SECTIONS, type Section } from "@/apps/schoolmanagement/features/students/types"
import { ApiError } from "@/shared/lib/api-client"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function TimetablePage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "timetable", "view")
  const canEdit = can(role, "timetable", "edit")
  const queryClient = useQueryClient()
  const slotsQuery = useQuery({ queryKey: timetableKeys.all, queryFn: listSlots, enabled: allowed })
  const subjectsQuery = useQuery({ queryKey: academicsKeys.all, queryFn: listSubjects, enabled: allowed && canEdit })
  const staffQuery = useQuery({ queryKey: staffKeys.all, queryFn: listStaff, enabled: allowed && canEdit })
  const [className, setClassName] = useState("6")
  const [section, setSection] = useState<Section>("A")
  const [pendingId, setPendingId] = useState<string | null>(null)
  const archivedId = useRef("")

  const refresh = () => queryClient.invalidateQueries({ queryKey: timetableKeys.all })
  const fail = (error: unknown) => toast(error instanceof ApiError ? error.message : "Could not update the timetable")
  const place = useMutation({ mutationFn: placeSlot, onSuccess: () => refresh(), onError: fail })
  const move = useMutation({
    mutationFn: ({ slotId, day, period }: { slotId: string; day: Weekday; period: number }) => moveSlot(slotId, day, period),
    onSuccess: () => refresh(),
    onError: fail,
  })
  const archive = useMutation({ mutationFn: archiveSlots, onSuccess: () => refresh(), onError: fail })
  const restore = useMutation({ mutationFn: restoreSlots, onSuccess: () => refresh(), onError: fail })

  if (!allowed) {
    return <EmptyState title="No access" description="Your account cannot open this module." />
  }

  const teachers = (staffQuery.data ?? [])
    .filter((member) => member.role === "teacher" && member.status === "active")
    .map((member) => ({ id: member.id, name: `${member.firstName} ${member.lastName}` }))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Timetable"
        description={
          canEdit
            ? "Weekly periods for a class section. Drag a period to another cell. A teacher booked twice is flagged."
            : "Weekly periods for a class section. A teacher booked twice is flagged."
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Choice label="Class" value={className} onChange={setClassName} options={Array.from({ length: 12 }, (_, index) => ({ label: `Class ${index + 1}`, value: String(index + 1) }))} />
        <Choice label="Section" value={section} onChange={(value) => setSection(value as Section)} options={SECTIONS.map((item) => ({ label: item, value: item }))} />
      </div>
      {canEdit ? (
        <PlacePeriod
          className={className}
          section={section}
          subjects={(subjectsQuery.data ?? []).map((subject) => ({ label: subject.name, value: subject.id }))}
          teachers={teachers.map((teacher) => ({ label: teacher.name, value: teacher.id }))}
          onPlace={async (values) => {
            await place.mutateAsync(values)
            toast("Period added")
          }}
        />
      ) : null}
      {slotsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading timetable…</p> : null}
      {slotsQuery.isError ? <EmptyState title="Could not load the timetable" description="The weekly grid did not load." actionLabel="Retry" onAction={() => void slotsQuery.refetch()} /> : null}
      {slotsQuery.data ? (
        <TimetableBoard
          slots={slotsQuery.data}
          className={className}
          section={section}
          canEdit={canEdit}
          onMove={(slotId, day, period) => move.mutate({ slotId, day, period })}
          onRemove={setPendingId}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(pendingId)}
        onOpenChange={(open) => {
          if (!open) setPendingId(null)
        }}
        title="Remove period"
        description="The period leaves this timetable. You can undo this from the toast."
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!pendingId) return
          archivedId.current = pendingId
          await archive.mutateAsync([pendingId])
          setPendingId(null)
        }}
        undo={{
          message: "Period removed",
          onUndo: async () => {
            await restore.mutateAsync([archivedId.current])
          },
        }}
      />
    </div>
  )
}

function PlacePeriod({
  className,
  section,
  subjects,
  teachers,
  onPlace,
}: {
  className: string
  section: Section
  subjects: { label: string; value: string }[]
  teachers: { label: string; value: string }[]
  onPlace: (values: SlotValues) => Promise<void>
}) {
  const form = useForm<SlotInput, unknown, SlotValues>({
    resolver: zodResolver(slotSchema),
    defaultValues: { className, section, day: "mon", period: "7", subjectId: "", teacherId: "" },
  })
  const values = useWatch({ control: form.control })

  return (
    <form
      className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2 lg:grid-cols-5"
      onSubmit={form.handleSubmit(async (submitted) => {
        await onPlace({ ...submitted, className, section })
        form.reset({ ...submitted, className, section, subjectId: "", teacherId: "" })
      })}
    >
      <p className="text-sm font-medium sm:col-span-2 lg:col-span-5">Place a period in Class {className}-{section}</p>
      <Choice label="Day" required value={values.day ?? "mon"} onChange={(value) => form.setValue("day", value as SlotInput["day"], { shouldValidate: true })} options={WEEKDAYS.map((day) => ({ label: WEEKDAY_LABEL[day], value: day }))} error={form.formState.errors.day?.message} />
      <Choice label="Period" required value={values.period ?? ""} onChange={(value) => form.setValue("period", value, { shouldValidate: true })} options={Array.from({ length: 8 }, (_, index) => ({ label: `Period ${index + 1}`, value: String(index + 1) }))} error={form.formState.errors.period?.message} />
      <Choice label="Subject" required value={values.subjectId ?? ""} onChange={(value) => form.setValue("subjectId", value, { shouldValidate: true })} options={subjects} error={form.formState.errors.subjectId?.message} />
      <Choice label="Teacher" required value={values.teacherId ?? ""} onChange={(value) => form.setValue("teacherId", value, { shouldValidate: true })} options={teachers} error={form.formState.errors.teacherId?.message} />
      <div className="flex items-end">
        <Button type="submit">Add period</Button>
      </div>
    </form>
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
    <div className="grid gap-1.5">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
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
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
