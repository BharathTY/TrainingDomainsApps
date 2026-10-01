import { fakerEN_IN as faker } from "@faker-js/faker"
import type { Role } from "@/apps/schoolmanagement/config/permissions"
import { SCHOOL_TODAY } from "@/apps/schoolmanagement/features/attendance/types"
import { formatInr, percentOf } from "@/apps/schoolmanagement/features/dashboard/format"
import { dueLines } from "@/apps/schoolmanagement/features/fees/ledger"
import type { AttendancePoint, DashboardPayload, ExamItem, FeePoint } from "@/apps/schoolmanagement/features/dashboard/types"
import { createClassTree, createSubjects, createTimetable } from "@/apps/schoolmanagement/mocks/academics-seed"
import { createExamSeed, defaultBands } from "@/apps/schoolmanagement/mocks/exams-seed"
import { createFeeSeed } from "@/apps/schoolmanagement/mocks/fees-seed"
import { createOfficeSeed } from "@/apps/schoolmanagement/mocks/office-seed"
import { createOperationsSeed } from "@/apps/schoolmanagement/mocks/operations-seed"
import type { Enquiry } from "@/apps/schoolmanagement/features/admissions/types"
import type { CalendarEvent } from "@/apps/schoolmanagement/features/calendar/types"
import type { CertificateRequest } from "@/apps/schoolmanagement/features/certificates/types"
import type { InfirmaryVisit, Vaccination } from "@/apps/schoolmanagement/features/health/types"
import type { HostelRoom, HostelStay } from "@/apps/schoolmanagement/features/hostel/types"
import type { Book, Loan } from "@/apps/schoolmanagement/features/library/types"
import type { PromotionDecision } from "@/apps/schoolmanagement/features/promotion/types"
import type { BusRoute, RouteAssignment } from "@/apps/schoolmanagement/features/transport/types"
import type { Visitor } from "@/apps/schoolmanagement/features/visitors/types"
import type { Announcement, Homework } from "@/apps/schoolmanagement/features/communication/types"
import type { Exam, ExamMark, ExamPaper, GradeBand } from "@/apps/schoolmanagement/features/exams/types"
import type { FeeConcession, FeeHead, FeeInstallment, FeePayment, FeeReminder } from "@/apps/schoolmanagement/features/fees/types"
import type { AcademicYear, PermissionMatrix, SchoolProfile } from "@/apps/schoolmanagement/features/settings/types"
import { SUBJECTS, type Assignment, type StaffMember, type Subject } from "@/apps/schoolmanagement/features/staff/types"
import { GENDERS, SECTIONS, type Student } from "@/apps/schoolmanagement/features/students/types"

faker.seed(20260930)

function phone() {
  return `${faker.helpers.arrayElement(["6", "7", "8", "9"])}${faker.string.numeric(9)}`
}

const ATTENDANCE_DAYS = ["2026-09-24", "2026-09-25", "2026-09-26", "2026-09-28", "2026-09-29", "2026-09-30"] as const

export function createStudents(count = 48): Student[] {
  return Array.from({ length: count }, (_, index) => {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const guardianName = faker.person.fullName()
    const guardianPhone = phone()
    const className = String(faker.number.int({ min: 1, max: 12 }))
    return {
      id: faker.string.uuid(),
      admissionNo: `ADM-2026-${String(index + 1).padStart(4, "0")}`,
      firstName,
      lastName,
      gender: faker.helpers.arrayElement(GENDERS),
      dateOfBirth: faker.date.birthdate({ min: 6, max: 17, mode: "age" }).toISOString().slice(0, 10),
      className,
      section: faker.helpers.arrayElement(SECTIONS),
      guardianName,
      guardianPhone,
      status: faker.helpers.arrayElement(["active", "active", "active", "inactive"] as const),
      address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
      bloodGroup: faker.helpers.arrayElement(["A+", "B+", "O+", "AB+", "O-"]),
      parents: [
        { relation: "Father" as const, name: faker.person.fullName(), phone: phone(), occupation: "Service" },
        { relation: "Mother" as const, name: faker.person.fullName(), phone: phone(), occupation: "Homemaker" },
        { relation: "Guardian" as const, name: guardianName, phone: guardianPhone, occupation: "Guardian" },
      ],
      previousSchool: {
        name: faker.helpers.arrayElement(["Delhi Public School", "Kendriya Vidyalaya", "St. Mary's", "National Public School"]),
        board: "CBSE",
        lastClass: className,
        year: "2025",
      },
      documents: [
        { id: "birth", name: "Birth certificate", status: "received" as const },
        { id: "photo", name: "Photograph", status: "received" as const },
        { id: "transfer", name: "Transfer certificate", status: index % 4 === 0 ? ("pending" as const) : ("received" as const) },
      ],
      academics: SUBJECTS.map((subject) => ({
        subject,
        score: faker.number.int({ min: 48, max: 96 }),
        max: 100,
      })),
      attendance: ATTENDANCE_DAYS.map((date, dayIndex) => ({
        date,
        status: (index + dayIndex) % 11 === 0 ? ("absent" as const) : (index + dayIndex) % 7 === 0 ? ("late" as const) : ("present" as const),
      })),
      fees: [
        { term: "Term 1", amount: 18000, paid: 18000, status: "paid" as const },
        { term: "Term 2", amount: 18000, paid: 12800, status: "partial" as const },
      ],
      deletedAt: null,
    }
  })
}

export function createStaff(count = 16): StaffMember[] {
  return Array.from({ length: count }, (_, index) => {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const role = index < 12 ? ("teacher" as const) : ("office" as const)
    const taught = faker.helpers.arrayElement(SUBJECTS) as Subject
    const subject: Subject | "" = role === "teacher" ? taught : ""
    const className = String((index % 12) + 1)
    const section = SECTIONS[index % SECTIONS.length] ?? "A"
    const assignments: Assignment[] =
      role === "teacher"
        ? [
            { id: faker.string.uuid(), className, section, subject: taught },
            ...(index % 3 === 0 ? [{ id: faker.string.uuid(), className: "6", section: "A" as const, subject: taught }] : []),
          ]
        : []
    const leaves =
      index % 4 === 0
        ? [{ id: faker.string.uuid(), type: "casual" as const, from: "2026-10-06", to: "2026-10-07", reason: "Family function", status: "pending" as const }]
        : index % 5 === 0
          ? [{ id: faker.string.uuid(), type: "sick" as const, from: "2026-09-18", to: "2026-09-19", reason: "Fever", status: "approved" as const }]
          : []
    return {
      id: faker.string.uuid(),
      employeeNo: `EMP-2026-${String(index + 1).padStart(4, "0")}`,
      firstName,
      lastName,
      role,
      subject,
      phone: phone(),
      email: `${firstName}.${lastName}@school.test`.toLowerCase().replaceAll(" ", ""),
      status: index % 11 === 0 ? ("inactive" as const) : ("active" as const),
      joiningDate: "2024-06-01",
      assignments,
      leaves,
      deletedAt: null,
    }
  })
}

const students = createStudents()
const staff = createStaff()
const subjects = createSubjects()

export const db = {
  students,
  staff,
  messages: [] as { id: string; studentIds: string[]; body: string; sentAt: string }[],
  subjects,
  classes: createClassTree(staff),
  slots: createTimetable(staff, subjects),
  exams: [] as Exam[],
  papers: [] as ExamPaper[],
  marks: [] as ExamMark[],
  bands: defaultBands() as GradeBand[],
  heads: [] as FeeHead[],
  installments: [] as FeeInstallment[],
  concessions: [] as FeeConcession[],
  payments: [] as FeePayment[],
  reminders: [] as FeeReminder[],
  announcements: [] as Announcement[],
  homework: [] as Homework[],
  profile: { name: "", address: "", phone: "", email: "", board: "", principal: "" } as SchoolProfile,
  years: [] as AcademicYear[],
  permissions: {} as PermissionMatrix,
  books: [] as Book[],
  loans: [] as Loan[],
  routes: [] as BusRoute[],
  assignments: [] as RouteAssignment[],
  rooms: [] as HostelRoom[],
  stays: [] as HostelStay[],
  certificates: [] as CertificateRequest[],
  decisions: [] as { studentId: string; decision: PromotionDecision }[],
  visitors: [] as Visitor[],
  visits: [] as InfirmaryVisit[],
  vaccines: [] as Vaccination[],
  enquiries: [] as Enquiry[],
}

for (const student of db.students.filter((item) => item.status === "active").slice(0, 8)) {
  student.className = "6"
  student.section = "A"
}

const examSeed = createExamSeed(db.students, subjects)
db.exams = examSeed.exams
db.papers = examSeed.papers
db.marks = examSeed.marks

const feeSeed = createFeeSeed(db.students)
db.heads = feeSeed.heads
db.installments = feeSeed.installments
db.concessions = feeSeed.concessions
db.payments = feeSeed.payments
db.reminders = feeSeed.reminders

const officeSeed = createOfficeSeed()
db.announcements = officeSeed.announcements
db.homework = officeSeed.homework
db.profile = officeSeed.profile
db.years = officeSeed.years
db.permissions = officeSeed.permissions

const operationsSeed = createOperationsSeed(db.students)
db.books = operationsSeed.books
db.loans = operationsSeed.loans
db.routes = operationsSeed.routes
db.assignments = operationsSeed.assignments
db.rooms = operationsSeed.rooms
db.stays = operationsSeed.stays
db.certificates = operationsSeed.certificates
db.decisions = operationsSeed.decisions
db.visitors = operationsSeed.visitors
db.visits = operationsSeed.visits
db.vaccines = operationsSeed.vaccines
db.enquiries = operationsSeed.enquiries

const FIXED_CALENDAR: CalendarEvent[] = [
  { id: "holiday-gandhi", date: "2026-10-02", title: "Gandhi Jayanti", detail: "School holiday", kind: "holiday" },
  { id: "event-staff", date: "2026-10-03", title: "Staff meeting", detail: "4:00 PM", kind: "event" },
  { id: "event-ptm", date: "2026-10-04", title: "PTM, classes 6–8", detail: "9:00 AM · Auditorium", kind: "event" },
  { id: "event-reports", date: "2026-10-06", title: "Term 1 report cards", detail: "Classes 1–12", kind: "event" },
]

export function schoolCalendar(): CalendarEvent[] {
  const exams: CalendarEvent[] = db.papers
    .filter((paper) => !paper.deletedAt)
    .map((paper) => {
      const exam = db.exams.find((item) => item.id === paper.examId && !item.deletedAt)
      return {
        id: paper.id,
        date: paper.date,
        title: paper.subjectName,
        detail: exam ? `Class ${exam.className} · ${exam.name} · ${paper.startTime}` : paper.startTime,
        kind: "exam",
      }
    })
  const homework: CalendarEvent[] = db.homework
    .filter((item) => !item.deletedAt)
    .map((item) => ({
      id: item.id,
      date: item.dueDate,
      title: item.title,
      detail: `${item.subject} homework · Class ${item.className}-${item.section}`,
      kind: "event",
    }))
  return [...FIXED_CALENDAR, ...exams, ...homework].sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title))
}

function feeBuckets() {
  const buckets = new Map<string, { collected: number; target: number }>()
  const touch = (month: string) => {
    const current = buckets.get(month) ?? { collected: 0, target: 0 }
    buckets.set(month, current)
    return current
  }
  for (const payment of db.payments) {
    touch(payment.paidOn.slice(0, 7)).collected += payment.amount
  }
  for (const student of db.students) {
    if (student.deletedAt || student.status !== "active") continue
    for (const line of dueLines(db.heads, db.installments, db.concessions, student.className, [])) {
      touch(line.dueDate.slice(0, 7)).target += line.amount
    }
  }
  return buckets
}

function schoolFees() {
  const buckets = feeBuckets()
  const points: FeePoint[] = [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, point]) => ({
      month: MONTHS[Number(month.slice(5, 7)) - 1] ?? month,
      collected: point.collected,
      target: point.target,
    }))
  const current = buckets.get(SCHOOL_TODAY.slice(0, 7)) ?? { collected: 0, target: 0 }
  return {
    title: "Fee collection vs target",
    collected: current.collected,
    target: current.target,
    points,
  }
}

function childFees(studentId: string) {
  const student = db.students.find((item) => item.id === studentId)
  const payments = db.payments.filter((payment) => payment.studentId === studentId)
  const lines = student ? dueLines(db.heads, db.installments, db.concessions, student.className, payments) : []
  const collected = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const target = lines.reduce((sum, line) => sum + line.amount, 0)
  return {
    collected,
    target,
    outstanding: Math.max(0, target - collected),
    points: lines.map((line) => ({ month: line.name, collected: line.paid, target: line.amount })),
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function week(base: number): AttendancePoint[] {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => ({
    day,
    present: Math.min(99, base + ((index * 2) % 6)),
  }))
}

function todayPercent(points: AttendancePoint[]) {
  return points.find((point) => point.day === "Wed")?.present ?? 0
}

function noticesFor(audience: Array<"all" | "staff" | "parents" | "students">) {
  return db.announcements
    .filter((notice) => !notice.deletedAt && audience.includes(notice.audience))
    .map((notice) => {
      const day = Number(notice.postedOn.slice(8, 10))
      const month = MONTHS[Number(notice.postedOn.slice(5, 7)) - 1] ?? ""
      return { id: notice.id, title: notice.title, detail: notice.body, postedOn: `${day} ${month}` }
    })
}

export function dashboardFor(role: Role): DashboardPayload {
  const active = db.students.filter((student) => !student.deletedAt && student.status === "active")
  const classRoll = active.filter((student) => student.className === "6" && student.section === "A")
  const child = classRoll[0]
  const childName = child ? child.firstName : "Student"
  const schoolWeek = week(88)
  const classWeek = week(91)
  const childWeek = week(93)
  const fees = schoolFees()
  const childAccount = child ? childFees(child.id) : { collected: 0, target: 0, outstanding: 0, points: [] as FeePoint[] }

  if (role === "teacher") {
    const today = todayPercent(classWeek)
    return {
      summary: "Class 6-A · Wednesday 30 Sep 2026",
      stats: [
        { label: "Students", value: String(classRoll.length), hint: "Class 6-A on roll" },
        { label: "Today's attendance", value: `${today}%`, hint: "Marked for 6-A" },
        { label: "Homework", value: "4", hint: "Open submissions" },
        { label: "Upcoming exams", value: "3", hint: "Marks desk this month" },
      ],
      attendanceTitle: "Class 6-A attendance",
      attendance: classWeek,
      fees: null,
      exams: examsFor("6-A"),
      announcements: noticesFor(["all", "staff"]),
      actions: [
        { moduleId: "attendance", label: "Mark attendance", hint: "6-A today" },
        { moduleId: "exams", label: "Enter marks", hint: "English pending" },
        { moduleId: "academics", label: "Assign homework", hint: "Science, ch. 4" },
        { moduleId: "communication", label: "Post notice", hint: "Class 6-A" },
      ],
    }
  }

  if (role === "parent") {
    const today = todayPercent(childWeek)
    return {
      summary: `${childName} · Class 6-A · Wednesday 30 Sep 2026`,
      stats: [
        { label: "Student", value: childName, hint: "Class 6-A" },
        { label: "Today's attendance", value: `${today}%`, hint: "Present this morning" },
        { label: "Fee collection", value: formatInr(childAccount.collected), hint: `${percentOf(childAccount.collected, childAccount.target)}% of ${formatInr(childAccount.target)} billed` },
        { label: "Upcoming exams", value: "3", hint: "Term 1, class 6" },
      ],
      attendanceTitle: `${childName}'s attendance`,
      attendance: childWeek,
      fees: {
        title: "Fees paid vs billed",
        collected: childAccount.collected,
        target: childAccount.target,
        points: childAccount.points,
      },
      exams: examsFor("6-A"),
      announcements: noticesFor(["all", "parents"]),
      actions: [
        { moduleId: "fees", label: "Pay fees", hint: `${formatInr(childAccount.outstanding)} left` },
        { moduleId: "attendance", label: "Attendance", hint: "This month" },
        { moduleId: "exams", label: "Exam dates", hint: "Term 1" },
        { moduleId: "communication", label: "Message school", hint: "Class teacher" },
      ],
    }
  }

  if (role === "student") {
    const today = todayPercent(childWeek)
    return {
      summary: `${childName} · Class 6-A · Wednesday 30 Sep 2026`,
      stats: [
        { label: "Today's attendance", value: `${today}%`, hint: "You were marked present" },
        { label: "Homework", value: "2", hint: "Due this week" },
        { label: "Upcoming exams", value: "3", hint: "Next is English, 10 Oct" },
        { label: "Library", value: "1", hint: "Book due 8 Oct" },
      ],
      attendanceTitle: "Your attendance",
      attendance: childWeek,
      fees: null,
      exams: examsFor("6-A"),
      announcements: noticesFor(["all", "students"]),
      actions: [
        { moduleId: "timetable", label: "Timetable", hint: "Today's periods" },
        { moduleId: "academics", label: "Homework", hint: "2 due" },
        { moduleId: "exams", label: "Exam dates", hint: "Term 1" },
        { moduleId: "library", label: "Library", hint: "1 book issued" },
      ],
    }
  }

  const today = todayPercent(schoolWeek)
  return {
    summary: "Whole school · Wednesday 30 Sep 2026",
    stats: [
      { label: "Total students", value: String(active.length), hint: "Active enrolment" },
      { label: "Today's attendance", value: `${today}%`, hint: "Across classes 1–12" },
      {
        label: "Fee collection",
        value: formatInr(fees.collected),
        hint: `${percentOf(fees.collected, fees.target)}% of ${formatInr(fees.target)} September dues`,
      },
      { label: "Upcoming exams", value: "4", hint: "Next 14 days" },
    ],
    attendanceTitle: "School attendance this week",
    attendance: schoolWeek,
    fees,
    exams: [
      { id: "e1", subject: "Mathematics", detail: "Class 10 · Term 1", when: "6 Oct · 9:00 AM" },
      { id: "e2", subject: "Science", detail: "Class 8 · Term 1", when: "8 Oct · 9:00 AM" },
      { id: "e3", subject: "English", detail: "Class 6 · Term 1", when: "10 Oct · 9:00 AM" },
      { id: "e4", subject: "Social Science", detail: "Class 12 · Term 1", when: "14 Oct · 9:00 AM" },
    ],
    announcements: noticesFor(["all", "staff", "parents", "students"]),
    actions: [
      { moduleId: "students", label: "Add student", hint: "New admission" },
      { moduleId: "attendance", label: "Attendance", hint: "Today's register" },
      { moduleId: "fees", label: "Collect fees", hint: "September target" },
      { moduleId: "communication", label: "Announcement", hint: "Whole school" },
    ],
  }
}

function examsFor(klass: string): ExamItem[] {
  return [
    { id: "c1", subject: "English", detail: `Class ${klass} · Term 1`, when: "10 Oct · 9:00 AM" },
    { id: "c2", subject: "Mathematics", detail: `Class ${klass} · Term 1`, when: "12 Oct · 9:00 AM" },
    { id: "c3", subject: "Science", detail: `Class ${klass} · Term 1`, when: "15 Oct · 9:00 AM" },
  ]
}
