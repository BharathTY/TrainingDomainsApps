import { http, HttpResponse } from "msw"
import type { Role } from "@/apps/schoolmanagement/config/permissions"
import { saveRegisterSchema } from "@/apps/schoolmanagement/features/attendance/schemas"
import { attendedPercent, isMark, type StudentMonth } from "@/apps/schoolmanagement/features/attendance/types"
import type { SubjectValues } from "@/apps/schoolmanagement/features/academics/schemas"
import type { SchoolSubject } from "@/apps/schoolmanagement/features/academics/types"
import type { ClassTeacherValues } from "@/apps/schoolmanagement/features/classes/schemas"
import type { AssignmentValues, LeaveValues, StaffCreateValues } from "@/apps/schoolmanagement/features/staff/schemas"
import type { StaffMember, Subject } from "@/apps/schoolmanagement/features/staff/types"
import { SECTIONS, type Section, type Student } from "@/apps/schoolmanagement/features/students/types"
import { studentFromAdmission, studentFromCsv } from "@/apps/schoolmanagement/features/students/record"
import type { AdmissionValues, CsvStudent } from "@/apps/schoolmanagement/features/students/schemas"
import type { SlotValues } from "@/apps/schoolmanagement/features/timetable/schemas"
import { isWeekday } from "@/apps/schoolmanagement/features/timetable/types"
import { commHandlers } from "@/apps/schoolmanagement/mocks/comm-handlers"
import { examHandlers } from "@/apps/schoolmanagement/mocks/exam-handlers"
import { feeHandlers } from "@/apps/schoolmanagement/mocks/fee-handlers"
import { operationsHandlers } from "@/apps/schoolmanagement/mocks/operations-handlers"
import { settingsHandlers } from "@/apps/schoolmanagement/mocks/settings-handlers"
import { dashboardFor, db, schoolCalendar } from "@/apps/schoolmanagement/mocks/seed"

const ROLES: Role[] = ["admin", "teacher", "parent", "student"]

function isRole(value: string | null): value is Role {
  return ROLES.includes(value as Role)
}

function nextAdmissionNo() {
  return `ADM-2026-${String(db.students.length + 1).padStart(4, "0")}`
}

function findStaff(id: string) {
  return db.staff.find((member) => member.id === id && !member.deletedAt)
}

function isSection(value: string): value is Section {
  return (SECTIONS as readonly string[]).includes(value)
}

function isClassName(value: string) {
  return /^(?:[1-9]|1[0-2])$/.test(value)
}

function isMonth(value: string) {
  return /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value)
}

function classRoll(className: string, section: string) {
  return db.students
    .filter((student) => !student.deletedAt && student.status === "active" && student.className === className && student.section === section)
    .sort((left, right) => `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`))
}

function linkedChild() {
  return db.students.find((student) => !student.deletedAt && student.status === "active" && student.className === "6" && student.section === "A") ?? null
}

function markOn(student: Student, date: string) {
  const found = student.attendance.find((day) => day.date === date)
  return found && isMark(found.status) ? found.status : "present"
}

function monthCounts(student: Student, month: string) {
  const marks = student.attendance.filter((day) => day.date.startsWith(`${month}-`) && isMark(day.status))
  const present = marks.filter((day) => day.status === "present").length
  const absent = marks.filter((day) => day.status === "absent").length
  const late = marks.filter((day) => day.status === "late").length
  return { present, absent, late, percent: attendedPercent(present, late, absent) }
}

function studentMonth(student: Student, month: string): StudentMonth {
  const [year, index] = month.split("-").map(Number)
  const count = new Date(Date.UTC(year ?? 2026, index ?? 1, 0)).getUTCDate()
  const byDate = new Map(student.attendance.filter((day) => isMark(day.status)).map((day) => [day.date, day.status]))
  const days = Array.from({ length: count }, (_, offset) => {
    const date = `${month}-${String(offset + 1).padStart(2, "0")}`
    const status = byDate.get(date)
    return { date, status: status && isMark(status) ? status : null }
  })
  const counts = monthCounts(student, month)
  return {
    studentId: student.id,
    name: `${student.firstName} ${student.lastName}`,
    className: student.className,
    section: student.section,
    month,
    days,
    present: counts.present,
    absent: counts.absent,
    late: counts.late,
    attendedPercent: counts.percent,
  }
}

function subjectCodeTaken(code: string, exceptId?: string) {
  const normalized = code.trim().toUpperCase()
  return db.subjects.some((subject) => !subject.deletedAt && subject.id !== exceptId && subject.code.toUpperCase() === normalized)
}

export const handlers = [
  http.get("/api/schoolmanagement/calendar", () => {
    return HttpResponse.json(schoolCalendar())
  }),
  http.get("/api/schoolmanagement/dashboard", ({ request }) => {
    const role = new URL(request.url).searchParams.get("role")
    return HttpResponse.json(dashboardFor(isRole(role) ? role : "admin"))
  }),
  http.get("/api/schoolmanagement/students", () => {
    return HttpResponse.json(db.students.filter((student) => !student.deletedAt))
  }),
  http.post("/api/schoolmanagement/students", async ({ request }) => {
    const body = (await request.json()) as AdmissionValues
    const next = studentFromAdmission(body, nextAdmissionNo())
    db.students.unshift(next)
    return HttpResponse.json(next, { status: 201 })
  }),
  http.post("/api/schoolmanagement/students/import", async ({ request }) => {
    const body = (await request.json()) as { rows: CsvStudent[] }
    for (const row of body.rows) {
      db.students.unshift(studentFromCsv(row, nextAdmissionNo()))
    }
    return HttpResponse.json({ count: body.rows.length }, { status: 201 })
  }),
  http.post("/api/schoolmanagement/students/promote", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    for (const student of db.students) {
      if (!body.ids.includes(student.id) || student.deletedAt) continue
      const current = Number(student.className)
      if (!Number.isFinite(current) || current >= 12) student.status = "alumni"
      else student.className = String(current + 1)
    }
    return HttpResponse.json({ ids: body.ids })
  }),
  http.post("/api/schoolmanagement/students/message", async ({ request }) => {
    const body = (await request.json()) as { ids: string[]; message: string }
    db.messages.unshift({
      id: crypto.randomUUID(),
      studentIds: body.ids,
      body: body.message,
      sentAt: new Date().toISOString(),
    })
    return HttpResponse.json({ ids: body.ids })
  }),
  http.post("/api/schoolmanagement/students/archive", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    const now = new Date().toISOString()
    for (const student of db.students) {
      if (body.ids.includes(student.id)) student.deletedAt = now
    }
    return HttpResponse.json({ ids: body.ids })
  }),
  http.post("/api/schoolmanagement/students/restore", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    for (const student of db.students) {
      if (body.ids.includes(student.id)) student.deletedAt = null
    }
    return HttpResponse.json({ ids: body.ids })
  }),
  http.get("/api/schoolmanagement/staff", () => {
    return HttpResponse.json(db.staff.filter((member) => !member.deletedAt))
  }),
  http.post("/api/schoolmanagement/staff", async ({ request }) => {
    const body = (await request.json()) as StaffCreateValues
    const next: StaffMember = {
      id: crypto.randomUUID(),
      employeeNo: `EMP-2026-${String(db.staff.length + 1).padStart(4, "0")}`,
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role,
      subject: body.role === "teacher" ? (body.subject as Subject) : "",
      phone: body.phone,
      email: body.email,
      status: "active",
      joiningDate: new Date().toISOString().slice(0, 10),
      assignments: [],
      leaves: [],
      deletedAt: null,
    }
    db.staff.unshift(next)
    return HttpResponse.json(next, { status: 201 })
  }),
  http.post("/api/schoolmanagement/staff/archive", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    const now = new Date().toISOString()
    for (const member of db.staff) {
      if (body.ids.includes(member.id)) member.deletedAt = now
    }
    return HttpResponse.json({ ids: body.ids })
  }),
  http.post("/api/schoolmanagement/staff/restore", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    for (const member of db.staff) {
      if (body.ids.includes(member.id)) member.deletedAt = null
    }
    return HttpResponse.json({ ids: body.ids })
  }),
  http.post("/api/schoolmanagement/staff/assignments", async ({ request }) => {
    const body = (await request.json()) as { staffId: string } & AssignmentValues
    const member = findStaff(body.staffId)
    if (!member) return HttpResponse.json({ message: "Staff member not found" }, { status: 404 })
    if (member.role !== "teacher") return HttpResponse.json({ message: "Only teachers take a class assignment" }, { status: 400 })
    const duplicate = member.assignments.some((item) => item.className === body.className && item.section === body.section && item.subject === body.subject)
    if (duplicate) return HttpResponse.json({ message: "This class already has that subject for this teacher" }, { status: 409 })
    member.assignments.push({ id: crypto.randomUUID(), className: body.className, section: body.section, subject: body.subject })
    return HttpResponse.json(member)
  }),
  http.post("/api/schoolmanagement/staff/assignments/remove", async ({ request }) => {
    const body = (await request.json()) as { staffId: string; assignmentId: string }
    const member = findStaff(body.staffId)
    if (!member) return HttpResponse.json({ message: "Staff member not found" }, { status: 404 })
    member.assignments = member.assignments.filter((item) => item.id !== body.assignmentId)
    return HttpResponse.json(member)
  }),
  http.post("/api/schoolmanagement/staff/leaves", async ({ request }) => {
    const body = (await request.json()) as LeaveValues
    const member = findStaff(body.staffId)
    if (!member) return HttpResponse.json({ message: "Staff member not found" }, { status: 404 })
    member.leaves.unshift({
      id: crypto.randomUUID(),
      type: body.type,
      from: body.from,
      to: body.to,
      reason: body.reason,
      status: "pending",
    })
    return HttpResponse.json(member, { status: 201 })
  }),
  http.post("/api/schoolmanagement/staff/leaves/decide", async ({ request }) => {
    const body = (await request.json()) as { leaveId: string; status: "approved" | "rejected" }
    const member = db.staff.find((item) => item.leaves.some((leave) => leave.id === body.leaveId))
    const leave = member?.leaves.find((item) => item.id === body.leaveId)
    if (!member || !leave) return HttpResponse.json({ message: "Leave request not found" }, { status: 404 })
    leave.status = body.status
    return HttpResponse.json(member)
  }),
  http.get("/api/schoolmanagement/classes", () => HttpResponse.json(db.classes)),
  http.post("/api/schoolmanagement/classes/teacher", async ({ request }) => {
    const body = (await request.json()) as ClassTeacherValues
    const section = db.classes.flatMap((item) => item.sections).find((item) => item.id === body.sectionId)
    if (!section) return HttpResponse.json({ message: "Section not found" }, { status: 404 })
    if (body.teacherId) {
      const teacher = findStaff(body.teacherId)
      if (!teacher || teacher.role !== "teacher" || teacher.status !== "active") {
        return HttpResponse.json({ message: "Choose an active teacher" }, { status: 400 })
      }
      const taken = db.classes.flatMap((item) => item.sections).find((item) => item.classTeacherId === body.teacherId && item.id !== section.id)
      if (taken) {
        return HttpResponse.json({ message: `This teacher already leads Class ${taken.className}-${taken.section}` }, { status: 409 })
      }
    }
    section.classTeacherId = body.teacherId
    return HttpResponse.json(section)
  }),
  http.get("/api/schoolmanagement/subjects", () => HttpResponse.json(db.subjects.filter((subject) => !subject.deletedAt))),
  http.post("/api/schoolmanagement/subjects", async ({ request }) => {
    const body = (await request.json()) as SubjectValues
    if (subjectCodeTaken(body.code)) return HttpResponse.json({ message: "That subject code is already used" }, { status: 409 })
    const next: SchoolSubject = {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      code: body.code.trim().toUpperCase(),
      deletedAt: null,
    }
    db.subjects.unshift(next)
    return HttpResponse.json(next, { status: 201 })
  }),
  http.patch("/api/schoolmanagement/subjects/:id", async ({ request, params }) => {
    const body = (await request.json()) as SubjectValues
    const subject = db.subjects.find((item) => item.id === params.id && !item.deletedAt)
    if (!subject) return HttpResponse.json({ message: "Subject not found" }, { status: 404 })
    if (subjectCodeTaken(body.code, subject.id)) return HttpResponse.json({ message: "That subject code is already used" }, { status: 409 })
    subject.name = body.name.trim()
    subject.code = body.code.trim().toUpperCase()
    for (const slot of db.slots) {
      if (slot.subjectId === subject.id) slot.subjectName = subject.name
    }
    return HttpResponse.json(subject)
  }),
  http.post("/api/schoolmanagement/subjects/archive", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    const now = new Date().toISOString()
    for (const subject of db.subjects) {
      if (body.ids.includes(subject.id)) subject.deletedAt = now
    }
    return HttpResponse.json({ ids: body.ids })
  }),
  http.post("/api/schoolmanagement/subjects/restore", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    for (const subject of db.subjects) {
      if (body.ids.includes(subject.id)) subject.deletedAt = null
    }
    return HttpResponse.json({ ids: body.ids })
  }),
  http.get("/api/schoolmanagement/timetable", () => HttpResponse.json(db.slots.filter((slot) => !slot.deletedAt))),
  http.post("/api/schoolmanagement/timetable", async ({ request }) => {
    const body = (await request.json()) as SlotValues
    const period = Number(body.period)
    if (!isSection(body.section) || !isWeekday(body.day)) return HttpResponse.json({ message: "Choose a day and section" }, { status: 400 })
    const subject = db.subjects.find((item) => item.id === body.subjectId && !item.deletedAt)
    const teacher = findStaff(body.teacherId)
    if (!subject) return HttpResponse.json({ message: "Subject not found" }, { status: 404 })
    if (!teacher || teacher.role !== "teacher" || teacher.status !== "active") {
      return HttpResponse.json({ message: "Choose an active teacher" }, { status: 400 })
    }
    const occupied = db.slots.some(
      (slot) => !slot.deletedAt && slot.className === body.className && slot.section === body.section && slot.day === body.day && slot.period === period,
    )
    if (occupied) return HttpResponse.json({ message: "That period is already filled" }, { status: 409 })
    const next = {
      id: crypto.randomUUID(),
      className: body.className,
      section: body.section,
      day: body.day,
      period,
      subjectId: subject.id,
      subjectName: subject.name,
      teacherId: teacher.id,
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
      deletedAt: null,
    }
    db.slots.push(next)
    return HttpResponse.json(next, { status: 201 })
  }),
  http.post("/api/schoolmanagement/timetable/move", async ({ request }) => {
    const body = (await request.json()) as { slotId: string; day: string; period: number }
    const slot = db.slots.find((item) => item.id === body.slotId && !item.deletedAt)
    if (!slot) return HttpResponse.json({ message: "Period not found" }, { status: 404 })
    if (!isWeekday(body.day) || body.period < 1 || body.period > 8) return HttpResponse.json({ message: "Choose a period" }, { status: 400 })
    if (slot.day === body.day && slot.period === body.period) return HttpResponse.json(slot)
    const occupant = db.slots.find(
      (item) => !item.deletedAt && item.id !== slot.id && item.className === slot.className && item.section === slot.section && item.day === body.day && item.period === body.period,
    )
    const previousDay = slot.day
    const previousPeriod = slot.period
    slot.day = body.day
    slot.period = body.period
    if (occupant) {
      occupant.day = previousDay
      occupant.period = previousPeriod
    }
    return HttpResponse.json(slot)
  }),
  http.post("/api/schoolmanagement/timetable/archive", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    const now = new Date().toISOString()
    for (const slot of db.slots) {
      if (body.ids.includes(slot.id)) slot.deletedAt = now
    }
    return HttpResponse.json({ ids: body.ids })
  }),
  http.get("/api/schoolmanagement/attendance/register", ({ request }) => {
    const url = new URL(request.url)
    const date = url.searchParams.get("date") ?? ""
    const className = url.searchParams.get("className") ?? ""
    const section = url.searchParams.get("section") ?? ""
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isClassName(className) || !isSection(section)) {
      return HttpResponse.json({ message: "Choose a class and date" }, { status: 400 })
    }
    return HttpResponse.json({
      date,
      className,
      section,
      students: classRoll(className, section).map((student) => ({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNo: student.admissionNo,
        status: markOn(student, date),
        recorded: student.attendance.some((day) => day.date === date),
      })),
    })
  }),
  http.post("/api/schoolmanagement/attendance/register", async ({ request }) => {
    const parsed = saveRegisterSchema.safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: "Check the register" }, { status: 400 })
    const body = parsed.data
    const roll = classRoll(body.className, body.section)
    const ids = new Set(roll.map((student) => student.id))
    if (body.marks.length !== roll.length || body.marks.some((mark) => !ids.has(mark.studentId))) {
      return HttpResponse.json({ message: "A student is not on this roll" }, { status: 400 })
    }
    for (const mark of body.marks) {
      const student = roll.find((item) => item.id === mark.studentId)
      if (!student) continue
      const existing = student.attendance.find((day) => day.date === body.date)
      if (existing) existing.status = mark.status
      else student.attendance.push({ date: body.date, status: mark.status })
    }
    return HttpResponse.json({
      date: body.date,
      className: body.className,
      section: body.section,
      students: roll.map((student) => ({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNo: student.admissionNo,
        status: markOn(student, body.date),
        recorded: student.attendance.some((day) => day.date === body.date),
      })),
    })
  }),
  http.get("/api/schoolmanagement/attendance/roster", ({ request }) => {
    const url = new URL(request.url)
    const className = url.searchParams.get("className") ?? ""
    const section = url.searchParams.get("section") ?? ""
    if (!isClassName(className) || !isSection(section)) return HttpResponse.json({ message: "Choose a class" }, { status: 400 })
    return HttpResponse.json(
      classRoll(className, section).map((student) => ({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNo: student.admissionNo,
      })),
    )
  }),
  http.get("/api/schoolmanagement/attendance/report", ({ request }) => {
    const url = new URL(request.url)
    const className = url.searchParams.get("className") ?? ""
    const section = url.searchParams.get("section") ?? ""
    const month = url.searchParams.get("month") ?? ""
    if (!isClassName(className) || !isSection(section) || !isMonth(month)) {
      return HttpResponse.json({ message: "Choose a class and month" }, { status: 400 })
    }
    const roll = classRoll(className, section)
    const dates = [...new Set(roll.flatMap((student) => student.attendance.filter((day) => day.date.startsWith(`${month}-`)).map((day) => day.date)))].sort()
    const days = dates.map((date) => {
      const counts = { present: 0, absent: 0, late: 0 }
      for (const student of roll) {
        const mark = student.attendance.find((day) => day.date === date)
        if (!mark || !isMark(mark.status)) continue
        counts[mark.status] += 1
      }
      return { date, ...counts, percent: attendedPercent(counts.present, counts.late, counts.absent) }
    })
    const rows = roll.map((student) => {
      const counts = monthCounts(student, month)
      return {
        studentId: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNo: student.admissionNo,
        present: counts.present,
        absent: counts.absent,
        late: counts.late,
        percent: counts.percent,
      }
    })
    const totals = rows.reduce((sum, row) => ({ present: sum.present + row.present, late: sum.late + row.late, absent: sum.absent + row.absent }), { present: 0, late: 0, absent: 0 })
    return HttpResponse.json({
      className,
      section,
      month,
      markedDays: dates.length,
      attendedPercent: attendedPercent(totals.present, totals.late, totals.absent),
      days,
      rows,
    })
  }),
  http.get("/api/schoolmanagement/attendance/month", ({ request }) => {
    const url = new URL(request.url)
    const month = url.searchParams.get("month") ?? ""
    const role = url.searchParams.get("role")
    const studentId = url.searchParams.get("studentId")
    if (!isMonth(month)) return HttpResponse.json({ message: "Choose a month" }, { status: 400 })
    const student = role === "parent" || role === "student" ? linkedChild() : db.students.find((item) => item.id === studentId && !item.deletedAt)
    if (!student) return HttpResponse.json({ message: "Student not found" }, { status: 404 })
    return HttpResponse.json(studentMonth(student, month))
  }),
  http.post("/api/schoolmanagement/timetable/restore", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    for (const slot of db.slots) {
      if (body.ids.includes(slot.id)) slot.deletedAt = null
    }
    return HttpResponse.json({ ids: body.ids })
  }),
  ...examHandlers,
  ...feeHandlers,
  ...commHandlers,
  ...settingsHandlers,
  ...operationsHandlers,
]
