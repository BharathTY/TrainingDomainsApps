import { http, HttpResponse } from "msw"
import type { EnquiryValues } from "@/apps/schoolmanagement/features/admissions/schemas"
import { SCHOOL_TODAY } from "@/apps/schoolmanagement/features/attendance/types"
import type { CertificateValues } from "@/apps/schoolmanagement/features/certificates/schemas"
import type { CertificateType } from "@/apps/schoolmanagement/features/certificates/types"
import { dueLines } from "@/apps/schoolmanagement/features/fees/ledger"
import type { VaccineValues, VisitValues } from "@/apps/schoolmanagement/features/health/schemas"
import type { StayValues } from "@/apps/schoolmanagement/features/hostel/schemas"
import type { LoanValues } from "@/apps/schoolmanagement/features/library/schemas"
import type { PromotionDecision } from "@/apps/schoolmanagement/features/promotion/types"
import type { ClassStrength } from "@/apps/schoolmanagement/features/reports/types"
import type { AssignmentValues } from "@/apps/schoolmanagement/features/transport/schemas"
import type { VisitorValues } from "@/apps/schoolmanagement/features/visitors/schemas"
import { SECTIONS } from "@/apps/schoolmanagement/features/students/types"
import { db } from "@/apps/schoolmanagement/mocks/seed"

const CERTIFICATE_TYPES: CertificateType[] = ["transfer", "bonafide", "character"]
const DECISIONS: PromotionDecision[] = ["pending", "promoted", "detained"]

function linkedChild() {
  return db.students.find((student) => !student.deletedAt && student.status === "active" && student.className === "6" && student.section === "A") ?? null
}

function activeStudents() {
  return db.students.filter((student) => !student.deletedAt && student.status === "active")
}

function studentById(id: string) {
  return activeStudents().find((student) => student.id === id) ?? null
}

function studentName(student: { firstName: string; lastName: string }) {
  return `${student.firstName} ${student.lastName}`
}

export const operationsHandlers = [
  http.get("/api/schoolmanagement/library/books", () => HttpResponse.json(db.books)),
  http.get("/api/schoolmanagement/library/loans", ({ request }) => {
    const role = new URL(request.url).searchParams.get("role")
    if (role === "student" || role === "parent") {
      const child = linkedChild()
      return HttpResponse.json(db.loans.filter((loan) => loan.studentId === child?.id))
    }
    return HttpResponse.json(db.loans)
  }),
  http.post("/api/schoolmanagement/library/loans", async ({ request }) => {
    const body = (await request.json()) as LoanValues
    const book = db.books.find((item) => item.id === body.bookId)
    const student = studentById(body.studentId)
    if (!book || book.available < 1) return HttpResponse.json({ message: "That book is not available" }, { status: 400 })
    if (!student) return HttpResponse.json({ message: "Student not found" }, { status: 404 })
    book.available -= 1
    const loan = {
      id: crypto.randomUUID(),
      bookId: book.id,
      bookTitle: book.title,
      studentId: student.id,
      studentName: studentName(student),
      issuedOn: body.issuedOn,
      dueOn: body.dueOn,
      returnedOn: null,
    }
    db.loans.unshift(loan)
    return HttpResponse.json(loan, { status: 201 })
  }),
  http.post("/api/schoolmanagement/library/loans/:id/return", ({ params }) => {
    const loan = db.loans.find((item) => item.id === params.id)
    if (!loan) return HttpResponse.json({ message: "Loan not found" }, { status: 404 })
    if (!loan.returnedOn) {
      loan.returnedOn = SCHOOL_TODAY
      const book = db.books.find((item) => item.id === loan.bookId)
      if (book) book.available += 1
    }
    return HttpResponse.json(loan)
  }),
  http.get("/api/schoolmanagement/transport/routes", () => HttpResponse.json(db.routes)),
  http.get("/api/schoolmanagement/transport/assignments", () => HttpResponse.json(db.assignments)),
  http.post("/api/schoolmanagement/transport/assignments", async ({ request }) => {
    const body = (await request.json()) as AssignmentValues
    const route = db.routes.find((item) => item.id === body.routeId)
    const student = studentById(body.studentId)
    if (!route) return HttpResponse.json({ message: "Route not found" }, { status: 404 })
    if (!student) return HttpResponse.json({ message: "Student not found" }, { status: 404 })
    const existing = db.assignments.find((item) => item.studentId === student.id)
    if (existing) {
      existing.routeId = route.id
      existing.routeName = route.name
      existing.stop = route.stop
      return HttpResponse.json(existing)
    }
    const assignment = {
      id: crypto.randomUUID(),
      routeId: route.id,
      routeName: route.name,
      studentId: student.id,
      studentName: studentName(student),
      stop: route.stop,
    }
    db.assignments.unshift(assignment)
    return HttpResponse.json(assignment, { status: 201 })
  }),
  http.get("/api/schoolmanagement/hostel/rooms", () => HttpResponse.json(db.rooms)),
  http.get("/api/schoolmanagement/hostel/stays", () => HttpResponse.json(db.stays)),
  http.post("/api/schoolmanagement/hostel/stays", async ({ request }) => {
    const body = (await request.json()) as StayValues
    const room = db.rooms.find((item) => item.id === body.roomId)
    const student = studentById(body.studentId)
    if (!room) return HttpResponse.json({ message: "Room not found" }, { status: 404 })
    if (!student) return HttpResponse.json({ message: "Student not found" }, { status: 404 })
    if (room.occupied >= room.capacity && !db.stays.some((stay) => stay.studentId === student.id && stay.roomId === room.id)) {
      return HttpResponse.json({ message: "That room is full" }, { status: 400 })
    }
    const existing = db.stays.find((stay) => stay.studentId === student.id)
    if (existing) {
      const previous = db.rooms.find((item) => item.id === existing.roomId)
      if (previous && previous.id !== room.id) previous.occupied = Math.max(0, previous.occupied - 1)
      if (!previous || previous.id !== room.id) room.occupied += 1
      existing.roomId = room.id
      existing.roomLabel = `${room.block}-${room.number}`
      existing.since = body.since
      return HttpResponse.json(existing)
    }
    room.occupied += 1
    const stay = {
      id: crypto.randomUUID(),
      roomId: room.id,
      roomLabel: `${room.block}-${room.number}`,
      studentId: student.id,
      studentName: studentName(student),
      since: body.since,
    }
    db.stays.unshift(stay)
    return HttpResponse.json(stay, { status: 201 })
  }),
  http.get("/api/schoolmanagement/certificates", () => HttpResponse.json(db.certificates)),
  http.post("/api/schoolmanagement/certificates", async ({ request }) => {
    const body = (await request.json()) as CertificateValues
    const student = studentById(body.studentId)
    if (!student) return HttpResponse.json({ message: "Student not found" }, { status: 404 })
    if (!CERTIFICATE_TYPES.includes(body.type)) return HttpResponse.json({ message: "Choose a certificate" }, { status: 400 })
    const certificate = {
      id: crypto.randomUUID(),
      studentId: student.id,
      studentName: studentName(student),
      type: body.type,
      status: "requested" as const,
      requestedOn: SCHOOL_TODAY,
    }
    db.certificates.unshift(certificate)
    return HttpResponse.json(certificate, { status: 201 })
  }),
  http.post("/api/schoolmanagement/certificates/:id/issue", ({ params }) => {
    const certificate = db.certificates.find((item) => item.id === params.id)
    if (!certificate) return HttpResponse.json({ message: "Certificate not found" }, { status: 404 })
    certificate.status = "issued"
    return HttpResponse.json(certificate)
  }),
  http.get("/api/schoolmanagement/promotion", () => {
    const rows = activeStudents().map((student) => ({
      studentId: student.id,
      admissionNo: student.admissionNo,
      name: studentName(student),
      className: student.className,
      section: student.section,
      decision: db.decisions.find((item) => item.studentId === student.id)?.decision ?? "pending",
    }))
    return HttpResponse.json(rows)
  }),
  http.post("/api/schoolmanagement/promotion", async ({ request }) => {
    const body = (await request.json()) as { studentIds: string[]; decision: PromotionDecision }
    if (!DECISIONS.includes(body.decision)) return HttpResponse.json({ message: "Choose a decision" }, { status: 400 })
    for (const studentId of body.studentIds) {
      if (!studentById(studentId)) continue
      const existing = db.decisions.find((item) => item.studentId === studentId)
      if (existing) existing.decision = body.decision
      else db.decisions.push({ studentId, decision: body.decision })
    }
    return HttpResponse.json({ count: body.studentIds.length })
  }),
  http.get("/api/schoolmanagement/visitors", () => HttpResponse.json(db.visitors)),
  http.post("/api/schoolmanagement/visitors", async ({ request }) => {
    const body = (await request.json()) as VisitorValues
    const visitor = { id: crypto.randomUUID(), name: body.name.trim(), purpose: body.purpose.trim(), whom: body.whom.trim(), inAt: body.inAt, outAt: null }
    db.visitors.unshift(visitor)
    return HttpResponse.json(visitor, { status: 201 })
  }),
  http.post("/api/schoolmanagement/visitors/:id/checkout", ({ params }) => {
    const visitor = db.visitors.find((item) => item.id === params.id)
    if (!visitor) return HttpResponse.json({ message: "Visitor not found" }, { status: 404 })
    if (!visitor.outAt) visitor.outAt = `${SCHOOL_TODAY}T16:00`
    return HttpResponse.json(visitor)
  }),
  http.get("/api/schoolmanagement/health/visits", () => HttpResponse.json(db.visits)),
  http.post("/api/schoolmanagement/health/visits", async ({ request }) => {
    const body = (await request.json()) as VisitValues
    const student = studentById(body.studentId)
    if (!student) return HttpResponse.json({ message: "Student not found" }, { status: 404 })
    const visit = { id: crypto.randomUUID(), studentId: student.id, studentName: studentName(student), date: body.date, note: body.note.trim() }
    db.visits.unshift(visit)
    return HttpResponse.json(visit, { status: 201 })
  }),
  http.get("/api/schoolmanagement/health/vaccines", () => HttpResponse.json(db.vaccines)),
  http.post("/api/schoolmanagement/health/vaccines", async ({ request }) => {
    const body = (await request.json()) as VaccineValues
    const student = studentById(body.studentId)
    if (!student) return HttpResponse.json({ message: "Student not found" }, { status: 404 })
    const vaccine = { id: crypto.randomUUID(), studentId: student.id, studentName: studentName(student), name: body.name.trim(), date: body.date }
    db.vaccines.unshift(vaccine)
    return HttpResponse.json(vaccine, { status: 201 })
  }),
  http.get("/api/schoolmanagement/reports", () => {
    const students = activeStudents()
    const strength: ClassStrength[] = []
    for (let className = 1; className <= 12; className += 1) {
      for (const section of SECTIONS) {
        const count = students.filter((student) => student.className === String(className) && student.section === section).length
        if (count === 0) continue
        strength.push({ id: `${className}-${section}`, className: String(className), section, students: count })
      }
    }
    let septemberBilled = 0
    for (const student of students) {
      for (const line of dueLines(db.heads, db.installments, db.concessions, student.className, [])) {
        if (line.dueDate.startsWith("2026-09")) septemberBilled += line.amount
      }
    }
    const septemberCollected = db.payments.filter((payment) => payment.paidOn.startsWith("2026-09")).reduce((sum, payment) => sum + payment.amount, 0)
    const feeCollected = db.payments.reduce((sum, payment) => sum + payment.amount, 0)
    return HttpResponse.json({
      students: students.length,
      feeCollected,
      septemberCollected,
      septemberBilled,
      openLoans: db.loans.filter((loan) => !loan.returnedOn).length,
      visitorsInside: db.visitors.filter((visitor) => !visitor.outAt).length,
      strength,
    })
  }),
  http.get("/api/schoolmanagement/parents", () => {
    const groups = new Map<string, { name: string; phone: string; children: string[] }>()
    for (const student of activeStudents()) {
      const key = student.guardianPhone
      const current = groups.get(key) ?? { name: student.guardianName, phone: student.guardianPhone, children: [] }
      current.children.push(`${studentName(student)} (${student.className}-${student.section})`)
      groups.set(key, current)
    }
    return HttpResponse.json(
      [...groups.values()].map((group) => ({
        id: group.phone,
        name: group.name,
        phone: group.phone,
        children: group.children.join(", "),
      })),
    )
  }),
  http.get("/api/schoolmanagement/admissions", () => HttpResponse.json(db.enquiries)),
  http.post("/api/schoolmanagement/admissions", async ({ request }) => {
    const body = (await request.json()) as EnquiryValues
    const enquiry = {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      phone: body.phone,
      className: body.className,
      status: "new" as const,
      appliedOn: SCHOOL_TODAY,
    }
    db.enquiries.unshift(enquiry)
    return HttpResponse.json(enquiry, { status: 201 })
  }),
]
