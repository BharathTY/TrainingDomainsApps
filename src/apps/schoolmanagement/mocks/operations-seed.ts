import type { Enquiry } from "@/apps/schoolmanagement/features/admissions/types"
import type { CertificateRequest } from "@/apps/schoolmanagement/features/certificates/types"
import type { InfirmaryVisit, Vaccination } from "@/apps/schoolmanagement/features/health/types"
import type { HostelRoom, HostelStay } from "@/apps/schoolmanagement/features/hostel/types"
import type { Book, Loan } from "@/apps/schoolmanagement/features/library/types"
import type { PromotionDecision } from "@/apps/schoolmanagement/features/promotion/types"
import type { BusRoute, RouteAssignment } from "@/apps/schoolmanagement/features/transport/types"
import type { Visitor } from "@/apps/schoolmanagement/features/visitors/types"
import type { Student } from "@/apps/schoolmanagement/features/students/types"

export type OperationsSeed = {
  books: Book[]
  loans: Loan[]
  routes: BusRoute[]
  assignments: RouteAssignment[]
  rooms: HostelRoom[]
  stays: HostelStay[]
  certificates: CertificateRequest[]
  decisions: { studentId: string; decision: PromotionDecision }[]
  visitors: Visitor[]
  visits: InfirmaryVisit[]
  vaccines: Vaccination[]
  enquiries: Enquiry[]
}

function studentName(student: Student) {
  return `${student.firstName} ${student.lastName}`
}

export function createOperationsSeed(students: Student[]): OperationsSeed {
  const active = students.filter((student) => !student.deletedAt && student.status === "active")
  const child = active.find((student) => student.className === "6" && student.section === "A") ?? active[0]
  const classmate = active.find((student) => student.id !== child?.id && student.className === "6") ?? active[1]
  const books: Book[] = [
    { id: "book-1", title: "Wings of Fire", author: "A. P. J. Abdul Kalam", copies: 3, available: 2 },
    { id: "book-2", title: "Malgudi Days", author: "R. K. Narayan", copies: 2, available: 2 },
    { id: "book-3", title: "The Blue Umbrella", author: "Ruskin Bond", copies: 4, available: 4 },
    { id: "book-4", title: "NCERT Science Class 6", author: "NCERT", copies: 20, available: 19 },
  ]
  const loans: Loan[] = []
  if (child) {
    loans.push({
      id: "loan-1",
      bookId: "book-1",
      bookTitle: "Wings of Fire",
      studentId: child.id,
      studentName: studentName(child),
      issuedOn: "2026-09-24",
      dueOn: "2026-10-08",
      returnedOn: null,
    })
  }
  if (classmate) {
    loans.push({
      id: "loan-2",
      bookId: "book-4",
      bookTitle: "NCERT Science Class 6",
      studentId: classmate.id,
      studentName: studentName(classmate),
      issuedOn: "2026-09-10",
      dueOn: "2026-09-24",
      returnedOn: "2026-09-22",
    })
  }
  const routes: BusRoute[] = [
    { id: "route-4", name: "Route 4", vehicle: "KA-01-AB-4404", driver: "Ramesh Gowda", stop: "MG Road", departure: "07:10" },
    { id: "route-2", name: "Route 2", vehicle: "KA-01-CD-2201", driver: "Suresh Patil", stop: "Jayanagar 4th Block", departure: "07:25" },
  ]
  const assignments: RouteAssignment[] = []
  if (child) {
    assignments.push({
      id: "assign-1",
      routeId: "route-4",
      routeName: "Route 4",
      studentId: child.id,
      studentName: studentName(child),
      stop: "MG Road",
    })
  }
  if (classmate) {
    assignments.push({
      id: "assign-2",
      routeId: "route-2",
      routeName: "Route 2",
      studentId: classmate.id,
      studentName: studentName(classmate),
      stop: "Jayanagar 4th Block",
    })
  }
  const rooms: HostelRoom[] = [
    { id: "room-a101", block: "A", number: "101", capacity: 3, occupied: child ? 1 : 0 },
    { id: "room-b204", block: "B", number: "204", capacity: 2, occupied: 0 },
  ]
  const stays: HostelStay[] = child
    ? [{ id: "stay-1", roomId: "room-a101", roomLabel: "A-101", studentId: child.id, studentName: studentName(child), since: "2026-06-01" }]
    : []
  const certificates: CertificateRequest[] = []
  if (child) {
    certificates.push({
      id: "cert-1",
      studentId: child.id,
      studentName: studentName(child),
      type: "bonafide",
      status: "ready",
      requestedOn: "2026-09-18",
    })
  }
  if (classmate) {
    certificates.push({
      id: "cert-2",
      studentId: classmate.id,
      studentName: studentName(classmate),
      type: "transfer",
      status: "requested",
      requestedOn: "2026-09-26",
    })
  }
  const decisions = active.slice(0, 3).map((student, index) => ({
    studentId: student.id,
    decision: (index === 0 ? "promoted" : "pending") as PromotionDecision,
  }))
  const visitors: Visitor[] = [
    { id: "visit-1", name: "Lakshmi Rao", purpose: "PTM", whom: "Class teacher, 6-A", inAt: "2026-09-30T09:10", outAt: null },
    { id: "visit-2", name: "Imran Sheikh", purpose: "Fee enquiry", whom: "Accounts", inAt: "2026-09-30T08:40", outAt: "2026-09-30T09:05" },
  ]
  const visits: InfirmaryVisit[] = child
    ? [{ id: "inf-1", studentId: child.id, studentName: studentName(child), date: "2026-09-29", note: "Headache. Rested 20 minutes and returned to class." }]
    : []
  const vaccines: Vaccination[] = child
    ? [{ id: "vac-1", studentId: child.id, studentName: studentName(child), name: "Typhoid", date: "2026-07-12" }]
    : []
  const enquiries: Enquiry[] = [
    { id: "enq-1", name: "Meera Kulkarni", phone: "9845012345", className: "1", status: "new", appliedOn: "2026-09-28" },
    { id: "enq-2", name: "Arjun Reddy", phone: "9900123456", className: "6", status: "contacted", appliedOn: "2026-09-20" },
    { id: "enq-3", name: "Sara D'Souza", phone: "9731122334", className: "8", status: "admitted", appliedOn: "2026-08-14" },
  ]
  return { books, loans, routes, assignments, rooms, stays, certificates, decisions, visitors, visits, vaccines, enquiries }
}
