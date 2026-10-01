import { SCHOOL_TODAY } from "@/apps/schoolmanagement/features/attendance/types"
import type { DueLine, FeeConcession, FeeHead, FeeInstallment, FeePayment } from "@/apps/schoolmanagement/features/fees/types"

export function activeHeads(heads: FeeHead[], className: string) {
  return heads.filter((head) => !head.deletedAt && (head.className === className || head.className === "all"))
}

export function concessionPercent(concessions: FeeConcession[], className: string) {
  const total = concessions.filter((item) => !item.deletedAt && item.className === className).reduce((sum, item) => sum + item.percent, 0)
  return Math.min(100, total)
}

export function shareTotal(installments: FeeInstallment[]) {
  return installments.filter((item) => !item.deletedAt).reduce((sum, item) => sum + item.sharePercent, 0)
}

export function dueLines(heads: FeeHead[], installments: FeeInstallment[], concessions: FeeConcession[], className: string, payments: FeePayment[]): DueLine[] {
  const gross = activeHeads(heads, className).reduce((sum, head) => sum + head.amount, 0)
  const net = Math.round((gross * (100 - concessionPercent(concessions, className))) / 100)
  const active = installments.filter((item) => !item.deletedAt).sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.name.localeCompare(right.name))
  let remaining = net
  const amounts = active.map((item, index) => {
    const amount = index === active.length - 1 ? remaining : Math.round((net * item.sharePercent) / 100)
    remaining -= amount
    return { item, amount: Math.max(0, amount) }
  })
  let pool = payments.reduce((sum, payment) => sum + payment.amount, 0)
  return amounts.map(({ item, amount }) => {
    const paid = Math.min(amount, pool)
    pool -= paid
    const balance = amount - paid
    return {
      installmentId: item.id,
      name: item.name,
      dueDate: item.dueDate,
      amount,
      paid,
      balance,
      overdue: item.dueDate < SCHOOL_TODAY && balance > 0,
    }
  })
}

export function accountTotals(heads: FeeHead[], concessions: FeeConcession[], className: string, lines: DueLine[]) {
  const gross = activeHeads(heads, className).reduce((sum, head) => sum + head.amount, 0)
  return {
    gross,
    concessionPercent: concessionPercent(concessions, className),
    net: lines.reduce((sum, line) => sum + line.amount, 0),
    outstanding: lines.reduce((sum, line) => sum + line.balance, 0),
  }
}
