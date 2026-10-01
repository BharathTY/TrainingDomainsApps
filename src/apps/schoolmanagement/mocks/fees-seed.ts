import { dueLines } from "@/apps/schoolmanagement/features/fees/ledger"
import type { FeeConcession, FeeHead, FeeInstallment, FeePayment, FeeReminder } from "@/apps/schoolmanagement/features/fees/types"
import type { Student } from "@/apps/schoolmanagement/features/students/types"

export function createFeeSeed(students: Student[]) {
  const heads: FeeHead[] = [
    { id: "head-6-tuition", name: "Tuition", className: "6", amount: 40000, deletedAt: null },
    { id: "head-6-activity", name: "Activity", className: "6", amount: 2000, deletedAt: null },
    { id: "head-7-tuition", name: "Tuition", className: "7", amount: 42000, deletedAt: null },
  ]
  const installments: FeeInstallment[] = [
    { id: "inst-1", name: "Term 1", dueDate: "2026-06-15", sharePercent: 50, deletedAt: null },
    { id: "inst-2", name: "Term 2", dueDate: "2026-09-15", sharePercent: 50, deletedAt: null },
  ]
  const concessions: FeeConcession[] = [{ id: "con-6", className: "6", label: "Sibling", percent: 10, deletedAt: null }]
  const payments: FeePayment[] = []
  const reminders: FeeReminder[] = []
  const class6 = students.filter((student) => !student.deletedAt && student.status === "active" && student.className === "6")
  const cleared = new Set(
    class6
      .filter((student) => student.section === "A")
      .sort((left, right) => left.firstName.localeCompare(right.firstName) || left.lastName.localeCompare(right.lastName))
      .filter((_, index) => index % 2 === 0)
      .map((student) => student.id),
  )
  for (const student of class6) {
    const lines = dueLines(heads, installments, concessions, student.className, [])
    const first = lines[0]
    const second = lines[1]
    if (first) {
      payments.push({
        id: `pay-${student.id}-1`,
        studentId: student.id,
        amount: first.amount,
        paidOn: "2026-06-12",
        mode: "upi",
        receiptNo: "",
        note: "Term 1",
      })
    }
    if (second && cleared.has(student.id)) {
      payments.push({
        id: `pay-${student.id}-2`,
        studentId: student.id,
        amount: second.amount,
        paidOn: "2026-09-20",
        mode: "cash",
        receiptNo: "",
        note: "Term 2",
      })
    }
  }
  payments.forEach((payment, index) => {
    payment.receiptNo = `RCP-${String(index + 1).padStart(4, "0")}`
  })
  return { heads, installments, concessions, payments, reminders }
}
