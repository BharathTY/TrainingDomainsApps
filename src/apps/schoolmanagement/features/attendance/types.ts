export const MARKS = ["present", "absent", "late"] as const
export type MarkStatus = (typeof MARKS)[number]

export const SCHOOL_TODAY = "2026-09-30"
export const SCHOOL_MONTH = "2026-09"

export const NEXT_MARK: Record<MarkStatus, MarkStatus> = {
  present: "absent",
  absent: "late",
  late: "present",
}

export type RegisterStudent = {
  id: string
  name: string
  admissionNo: string
  status: MarkStatus
  recorded: boolean
}

export type Register = {
  date: string
  className: string
  section: string
  students: RegisterStudent[]
}

export type MonthDay = {
  date: string
  status: MarkStatus | null
}

export type StudentMonth = {
  studentId: string
  name: string
  className: string
  section: string
  month: string
  days: MonthDay[]
  present: number
  absent: number
  late: number
  attendedPercent: number
}

export type ReportDay = {
  date: string
  present: number
  absent: number
  late: number
  percent: number
}

export type ReportRow = {
  studentId: string
  name: string
  admissionNo: string
  present: number
  absent: number
  late: number
  percent: number
}

export type ClassReport = {
  className: string
  section: string
  month: string
  markedDays: number
  attendedPercent: number
  days: ReportDay[]
  rows: ReportRow[]
}

export type RosterStudent = {
  id: string
  name: string
  admissionNo: string
}

export function isMark(value: string): value is MarkStatus {
  return (MARKS as readonly string[]).includes(value)
}

export function monthLabel(month: string) {
  const [year, index] = month.split("-").map(Number)
  if (!year || !index) return month
  const name = new Date(Date.UTC(year, index - 1, 1)).toLocaleString("en-IN", { month: "long", timeZone: "UTC" })
  return `${name} ${year}`
}

export function shiftMonth(month: string, delta: number) {
  const [year, index] = month.split("-").map(Number)
  if (!year || !index) return month
  const next = new Date(Date.UTC(year, index - 1 + delta, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`
}

export function attendedPercent(present: number, late: number, absent: number) {
  const marked = present + late + absent
  if (marked === 0) return 0
  return Math.round(((present + late) / marked) * 100)
}
