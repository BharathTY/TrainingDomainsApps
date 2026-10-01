export type FeeHead = {
  id: string
  name: string
  className: string
  amount: number
  deletedAt: string | null
}

export type FeeInstallment = {
  id: string
  name: string
  dueDate: string
  sharePercent: number
  deletedAt: string | null
}

export type FeeConcession = {
  id: string
  className: string
  label: string
  percent: number
  deletedAt: string | null
}

export type PayMode = "cash" | "upi" | "cheque"

export type FeePayment = {
  id: string
  studentId: string
  amount: number
  paidOn: string
  mode: PayMode
  receiptNo: string
  note: string
}

export type FeeReminder = {
  id: string
  studentId: string
  sentOn: string
}

export type DueLine = {
  installmentId: string
  name: string
  dueDate: string
  amount: number
  paid: number
  balance: number
  overdue: boolean
}

export type FeeAccount = {
  studentId: string
  name: string
  admissionNo: string
  className: string
  section: string
  gross: number
  concessionPercent: number
  net: number
  outstanding: number
  lines: DueLine[]
  payments: FeePayment[]
  schoolName: string
}

export type DefaulterRow = {
  studentId: string
  name: string
  admissionNo: string
  className: string
  section: string
  guardianPhone: string
  overdue: number
  remindedOn: string | null
}

export type FeeStudentHit = {
  id: string
  name: string
  admissionNo: string
  className: string
  section: string
}
