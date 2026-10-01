import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/shared/EmptyState"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { can, type Role } from "@/apps/schoolmanagement/config/permissions"
import { attendanceKeys, fetchMonth, fetchOwnMonth, fetchRegister, fetchReport, fetchRoster, saveRegister } from "@/apps/schoolmanagement/features/attendance/api"
import { ClassReport } from "@/apps/schoolmanagement/features/attendance/components/ClassReport"
import { MonthHeatmap } from "@/apps/schoolmanagement/features/attendance/components/MonthHeatmap"
import { RegisterList, RegisterSkeleton } from "@/apps/schoolmanagement/features/attendance/components/RegisterList"
import { SCHOOL_MONTH, SCHOOL_TODAY, monthLabel, shiftMonth } from "@/apps/schoolmanagement/features/attendance/types"
import { studentKeys } from "@/apps/schoolmanagement/features/students/api"
import { SECTIONS, type Section } from "@/apps/schoolmanagement/features/students/types"
import { downloadCsv } from "@/shared/lib/csv"
import { ApiError } from "@/shared/lib/api-client"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function AttendancePage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "attendance", "view")
  const canMark = can(role, "attendance", "edit")
  const canExport = can(role, "attendance", "export")
  const personal = role === "parent" || role === "student"

  if (!allowed) {
    return <EmptyState title="No access" description="Your account cannot open this module." />
  }

  if (personal) return <PersonalAttendance role={role} />
  return <StaffAttendance canMark={canMark} canExport={canExport} />
}

function PersonalAttendance({ role }: { role: Role }) {
  const [month, setMonth] = useState(SCHOOL_MONTH)
  const query = useQuery({ queryKey: attendanceKeys.self(role, month), queryFn: () => fetchOwnMonth(role, month) })

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <PageHeader title="Attendance" description="This month, day by day." />
      <MonthSwitcher month={month} onChange={setMonth} />
      {query.isLoading ? <RegisterSkeleton /> : null}
      {query.isError ? <EmptyState title="Could not load attendance" description="The month did not load." actionLabel="Retry" onAction={() => void query.refetch()} /> : null}
      {query.data ? (
        <div className="grid gap-3">
          <p className="text-sm">
            {query.data.name} · Class {query.data.className}-{query.data.section}
          </p>
          <Summary present={query.data.present} late={query.data.late} absent={query.data.absent} percent={query.data.attendedPercent} />
          <MonthHeatmap month={query.data.month} days={query.data.days} />
        </div>
      ) : null}
    </div>
  )
}

function StaffAttendance({ canMark, canExport }: { canMark: boolean; canExport: boolean }) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState("mark")
  const [className, setClassName] = useState("6")
  const [section, setSection] = useState<Section>("A")
  const [date, setDate] = useState(SCHOOL_TODAY)
  const [month, setMonth] = useState(SCHOOL_MONTH)
  const [studentId, setStudentId] = useState("")

  const registerQuery = useQuery({
    queryKey: attendanceKeys.register(date, className, section),
    queryFn: () => fetchRegister(date, className, section),
    enabled: tab === "mark",
  })
  const reportQuery = useQuery({
    queryKey: attendanceKeys.report(className, section, month),
    queryFn: () => fetchReport(className, section, month),
    enabled: tab === "report",
  })
  const rosterQuery = useQuery({
    queryKey: attendanceKeys.roster(className, section),
    queryFn: () => fetchRoster(className, section),
    enabled: tab === "calendar",
  })
  const roster = rosterQuery.data ?? []
  const selectedId = roster.some((student) => student.id === studentId) ? studentId : (roster[0]?.id ?? "")
  const monthQuery = useQuery({
    queryKey: attendanceKeys.month(selectedId, month),
    queryFn: () => fetchMonth(month, selectedId),
    enabled: tab === "calendar" && selectedId.length > 0,
  })

  const save = useMutation({
    mutationFn: saveRegister,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: attendanceKeys.all })
      await queryClient.invalidateQueries({ queryKey: studentKeys.all })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not save attendance"),
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Attendance"
        description="Everyone starts present. Tap a student to mark absent, then late, then present again."
        actions={
          canExport && tab === "report" && reportQuery.data ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                downloadCsv(`attendance-${className}-${section}-${month}.csv`, [
                  ["Admission no", "Student", "Present", "Late", "Absent", "Attended %"],
                  ...reportQuery.data.rows.map((row) => [row.admissionNo, row.name, String(row.present), String(row.late), String(row.absent), String(row.percent)]),
                ])
              }
            >
              CSV
            </Button>
          ) : null
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Class">
          <Select value={className} onValueChange={setClassName}>
            <SelectTrigger aria-label="Class" className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, index) => (
                <SelectItem key={index} value={String(index + 1)}>
                  Class {index + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Section">
          <Select value={section} onValueChange={(value) => setSection(value as Section)}>
            <SelectTrigger aria-label="Section" className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTIONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {tab === "mark" ? (
          <Field label="Date">
            <Input
              type="date"
              aria-label="Date"
              value={date}
              onChange={(event) => {
                if (event.target.value) setDate(event.target.value)
              }}
              className="h-10"
            />
          </Field>
        ) : (
          <Field label="Month">
            <MonthSwitcher month={month} onChange={setMonth} />
          </Field>
        )}
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mark">Mark</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
        <TabsContent value="mark">
          {registerQuery.isLoading ? <RegisterSkeleton /> : null}
          {registerQuery.isError ? (
            <EmptyState title="Could not load the register" description="The class roll did not load." actionLabel="Retry" onAction={() => void registerQuery.refetch()} />
          ) : null}
          {registerQuery.data && registerQuery.data.students.length === 0 ? (
            <EmptyState title="No students" description={`Class ${className}-${section} has no active students.`} />
          ) : null}
          {registerQuery.data && registerQuery.data.students.length > 0 ? (
            <RegisterList
              scope={`${date}|${className}|${section}`}
              server={registerQuery.data.students}
              canMark={canMark}
              saving={save.isPending}
              onSave={(students) => save.mutateAsync({ date, className, section, marks: students.map((student) => ({ studentId: student.id, status: student.status })) })}
            />
          ) : null}
        </TabsContent>
        <TabsContent value="report">
          {reportQuery.isLoading ? <RegisterSkeleton /> : null}
          {reportQuery.isError ? (
            <EmptyState title="Could not load the report" description="The class month did not load." actionLabel="Retry" onAction={() => void reportQuery.refetch()} />
          ) : null}
          {reportQuery.data && reportQuery.data.rows.length === 0 ? (
            <EmptyState title="No students" description={`Class ${className}-${section} has no active students.`} />
          ) : null}
          {reportQuery.data && reportQuery.data.rows.length > 0 ? (
            <ClassReport
              report={reportQuery.data}
              onOpenStudent={(id) => {
                setStudentId(id)
                setTab("calendar")
              }}
            />
          ) : null}
        </TabsContent>
        <TabsContent value="calendar">
          {rosterQuery.isLoading ? <RegisterSkeleton /> : null}
          {rosterQuery.isError ? (
            <EmptyState title="Could not load students" description="The class roll did not load." actionLabel="Retry" onAction={() => void rosterQuery.refetch()} />
          ) : null}
          {rosterQuery.data && roster.length === 0 ? <EmptyState title="No students" description={`Class ${className}-${section} has no active students.`} /> : null}
          {roster.length > 0 ? (
            <div className="grid gap-3">
              <Field label="Student">
                <Select value={selectedId} onValueChange={setStudentId}>
                  <SelectTrigger aria-label="Student" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roster.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {monthQuery.data ? (
                <div className="grid max-w-lg gap-3">
                  <Summary present={monthQuery.data.present} late={monthQuery.data.late} absent={monthQuery.data.absent} percent={monthQuery.data.attendedPercent} />
                  <MonthHeatmap month={monthQuery.data.month} days={monthQuery.data.days} />
                </div>
              ) : null}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MonthSwitcher({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  return (
    <div className="flex h-10 items-center gap-1">
      <Button type="button" variant="outline" size="icon" aria-label="Previous month" onClick={() => onChange(shiftMonth(month, -1))}>
        <ChevronLeft className="size-4" />
      </Button>
      <p className="min-w-0 flex-1 text-center text-sm font-medium">{monthLabel(month)}</p>
      <Button type="button" variant="outline" size="icon" aria-label="Next month" onClick={() => onChange(shiftMonth(month, 1))}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>
        {label}
        <span className="text-destructive"> *</span>
      </Label>
      {children}
    </div>
  )
}

function Summary({ present, late, absent, percent }: { present: number; late: number; absent: number; percent: number }) {
  return (
    <p className="text-sm text-muted-foreground">
      {present} present · {late} late · {absent} absent · {percent}% attended
    </p>
  )
}
