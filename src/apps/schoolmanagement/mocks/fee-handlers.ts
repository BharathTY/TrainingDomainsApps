import { http, HttpResponse } from "msw"
import { SCHOOL_TODAY } from "@/apps/schoolmanagement/features/attendance/types"
import { accountTotals, dueLines } from "@/apps/schoolmanagement/features/fees/ledger"
import type { ConcessionValues, HeadValues, InstallmentValues, PaymentValues } from "@/apps/schoolmanagement/features/fees/schemas"
import type { FeeAccount, FeeConcession, FeeHead, FeeInstallment, PayMode } from "@/apps/schoolmanagement/features/fees/types"
import { db } from "@/apps/schoolmanagement/mocks/seed"

function linkedChild() {
  return db.students.find((student) => !student.deletedAt && student.status === "active" && student.className === "6" && student.section === "A") ?? null
}

function live<T extends { deletedAt: string | null }>(rows: T[]) {
  return rows.filter((row) => !row.deletedAt)
}

function accountFor(studentId: string): FeeAccount | Response {
  const student = db.students.find((item) => item.id === studentId && !item.deletedAt && item.status === "active")
  if (!student) return HttpResponse.json({ message: "Student not found" }, { status: 404 })
  const payments = db.payments.filter((payment) => payment.studentId === student.id).sort((left, right) => left.paidOn.localeCompare(right.paidOn))
  const lines = dueLines(db.heads, db.installments, db.concessions, student.className, payments)
  const totals = accountTotals(db.heads, db.concessions, student.className, lines)
  return {
    studentId: student.id,
    name: `${student.firstName} ${student.lastName}`,
    admissionNo: student.admissionNo,
    className: student.className,
    section: student.section,
    ...totals,
    lines,
    payments,
    schoolName: db.profile.name,
  }
}

function asAccount(value: FeeAccount | Response): value is FeeAccount {
  return !(value instanceof Response)
}

function shareError(rows: { sharePercent: number }[]) {
  const total = rows.reduce((sum, row) => sum + row.sharePercent, 0)
  if (total !== 100 && total !== 0) return HttpResponse.json({ message: "Installment shares must total 100%" }, { status: 400 })
  return null
}

export const feeHandlers = [
  http.get("/api/schoolmanagement/fees/structure", () =>
    HttpResponse.json({
      heads: live(db.heads),
      installments: live(db.installments),
      concessions: live(db.concessions),
    }),
  ),
  http.post("/api/schoolmanagement/fees/heads", async ({ request }) => {
    const body = (await request.json()) as HeadValues
    const head: FeeHead = { id: crypto.randomUUID(), name: body.name.trim(), className: body.className, amount: body.amount, deletedAt: null }
    db.heads.push(head)
    return HttpResponse.json(head)
  }),
  http.patch("/api/schoolmanagement/fees/heads/:id", async ({ params, request }) => {
    const head = db.heads.find((item) => item.id === params.id && !item.deletedAt)
    if (!head) return HttpResponse.json({ message: "Head not found" }, { status: 404 })
    const body = (await request.json()) as HeadValues
    head.name = body.name.trim()
    head.className = body.className
    head.amount = body.amount
    return HttpResponse.json(head)
  }),
  http.post("/api/schoolmanagement/fees/heads/archive", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    for (const head of db.heads) if (body.ids.includes(head.id)) head.deletedAt = new Date().toISOString()
    return HttpResponse.json({ ids: body.ids })
  }),
  http.post("/api/schoolmanagement/fees/heads/restore", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    for (const head of db.heads) if (body.ids.includes(head.id)) head.deletedAt = null
    return HttpResponse.json({ ids: body.ids })
  }),
  http.post("/api/schoolmanagement/fees/installments", async ({ request }) => {
    const body = (await request.json()) as InstallmentValues
    const row: FeeInstallment = { id: crypto.randomUUID(), name: body.name.trim(), dueDate: body.dueDate, sharePercent: body.sharePercent, deletedAt: null }
    const error = shareError([...live(db.installments), row])
    if (error) return error
    db.installments.push(row)
    return HttpResponse.json(row)
  }),
  http.patch("/api/schoolmanagement/fees/installments/:id", async ({ params, request }) => {
    const row = db.installments.find((item) => item.id === params.id && !item.deletedAt)
    if (!row) return HttpResponse.json({ message: "Installment not found" }, { status: 404 })
    const body = (await request.json()) as InstallmentValues
    const preview = live(db.installments).map((item) => (item.id === row.id ? { ...item, sharePercent: body.sharePercent } : item))
    const error = shareError(preview)
    if (error) return error
    row.name = body.name.trim()
    row.dueDate = body.dueDate
    row.sharePercent = body.sharePercent
    return HttpResponse.json(row)
  }),
  http.post("/api/schoolmanagement/fees/installments/archive", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    const preview = live(db.installments).filter((item) => !body.ids.includes(item.id))
    const error = shareError(preview)
    if (error) return error
    for (const row of db.installments) if (body.ids.includes(row.id)) row.deletedAt = new Date().toISOString()
    return HttpResponse.json({ ids: body.ids })
  }),
  http.post("/api/schoolmanagement/fees/installments/restore", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    const preview = db.installments.filter((item) => !item.deletedAt || body.ids.includes(item.id))
    const error = shareError(preview)
    if (error) return error
    for (const row of db.installments) if (body.ids.includes(row.id)) row.deletedAt = null
    return HttpResponse.json({ ids: body.ids })
  }),
  http.post("/api/schoolmanagement/fees/concessions", async ({ request }) => {
    const body = (await request.json()) as ConcessionValues
    const row: FeeConcession = { id: crypto.randomUUID(), className: body.className, label: body.label.trim(), percent: body.percent, deletedAt: null }
    db.concessions.push(row)
    return HttpResponse.json(row)
  }),
  http.patch("/api/schoolmanagement/fees/concessions/:id", async ({ params, request }) => {
    const row = db.concessions.find((item) => item.id === params.id && !item.deletedAt)
    if (!row) return HttpResponse.json({ message: "Concession not found" }, { status: 404 })
    const body = (await request.json()) as ConcessionValues
    row.className = body.className
    row.label = body.label.trim()
    row.percent = body.percent
    return HttpResponse.json(row)
  }),
  http.post("/api/schoolmanagement/fees/concessions/archive", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    for (const row of db.concessions) if (body.ids.includes(row.id)) row.deletedAt = new Date().toISOString()
    return HttpResponse.json({ ids: body.ids })
  }),
  http.post("/api/schoolmanagement/fees/concessions/restore", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    for (const row of db.concessions) if (body.ids.includes(row.id)) row.deletedAt = null
    return HttpResponse.json({ ids: body.ids })
  }),
  http.get("/api/schoolmanagement/fees/students", ({ request }) => {
    const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? ""
    if (query.length < 2) return HttpResponse.json([])
    const hits = db.students
      .filter((student) => !student.deletedAt && student.status === "active")
      .filter((student) => `${student.firstName} ${student.lastName} ${student.admissionNo}`.toLowerCase().includes(query))
      .slice(0, 8)
      .map((student) => ({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNo: student.admissionNo,
        className: student.className,
        section: student.section,
      }))
    return HttpResponse.json(hits)
  }),
  http.get("/api/schoolmanagement/fees/account", ({ request }) => {
    const url = new URL(request.url)
    const role = url.searchParams.get("role")
    const student = role === "parent" || role === "student" ? linkedChild() : db.students.find((item) => item.id === url.searchParams.get("studentId"))
    if (!student) return HttpResponse.json({ message: "Student not found" }, { status: 404 })
    const account = accountFor(student.id)
    if (!asAccount(account)) return account
    return HttpResponse.json(account)
  }),
  http.post("/api/schoolmanagement/fees/payments", async ({ request }) => {
    const body = (await request.json()) as PaymentValues & { studentId: string }
    const modes: PayMode[] = ["cash", "upi", "cheque"]
    if (!modes.includes(body.mode)) return HttpResponse.json({ message: "Choose a payment mode" }, { status: 400 })
    const account = accountFor(body.studentId)
    if (!asAccount(account)) return account
    if (body.amount > account.outstanding) return HttpResponse.json({ message: "Amount is above the outstanding dues" }, { status: 400 })
    const payment = {
      id: crypto.randomUUID(),
      studentId: body.studentId,
      amount: body.amount,
      paidOn: body.paidOn,
      mode: body.mode,
      receiptNo: `RCP-${String(db.payments.length + 1).padStart(4, "0")}`,
      note: body.note?.trim() ?? "",
    }
    db.payments.push(payment)
    return HttpResponse.json(payment)
  }),
  http.get("/api/schoolmanagement/fees/defaulters", () => {
    const rows = db.students
      .filter((student) => !student.deletedAt && student.status === "active")
      .map((student) => {
        const account = accountFor(student.id)
        if (!asAccount(account)) return null
        const overdue = account.lines.filter((line) => line.overdue).reduce((sum, line) => sum + line.balance, 0)
        if (overdue <= 0) return null
        const reminder = db.reminders.find((item) => item.studentId === student.id)
        return {
          studentId: student.id,
          name: account.name,
          admissionNo: student.admissionNo,
          className: student.className,
          section: student.section,
          guardianPhone: student.guardianPhone,
          overdue,
          remindedOn: reminder?.sentOn ?? null,
        }
      })
      .filter((row) => row != null)
      .sort((left, right) => right.overdue - left.overdue || left.name.localeCompare(right.name))
    return HttpResponse.json(rows)
  }),
  http.post("/api/schoolmanagement/fees/reminders", async ({ request }) => {
    const body = (await request.json()) as { studentIds: string[] }
    const ids = body.studentIds.filter((id) => db.students.some((student) => student.id === id && !student.deletedAt))
    for (const studentId of ids) {
      const existing = db.reminders.find((item) => item.studentId === studentId)
      if (existing) existing.sentOn = SCHOOL_TODAY
      else db.reminders.push({ id: crypto.randomUUID(), studentId, sentOn: SCHOOL_TODAY })
    }
    return HttpResponse.json({ count: ids.length })
  }),
]
