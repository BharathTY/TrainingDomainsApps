import type { Role } from "@/apps/schoolmanagement/config/permissions"
import type { ClassReport, Register, RosterStudent, StudentMonth } from "@/apps/schoolmanagement/features/attendance/types"
import type { SaveRegisterValues } from "@/apps/schoolmanagement/features/attendance/schemas"
import type { Section } from "@/apps/schoolmanagement/features/students/types"
import { api } from "@/shared/lib/api-client"

export const attendanceKeys = {
  all: ["attendance"] as const,
  register: (date: string, className: string, section: string) => ["attendance", "register", date, className, section] as const,
  report: (className: string, section: string, month: string) => ["attendance", "report", className, section, month] as const,
  roster: (className: string, section: string) => ["attendance", "roster", className, section] as const,
  month: (studentId: string, month: string) => ["attendance", "month", studentId, month] as const,
  self: (role: Role, month: string) => ["attendance", "self", role, month] as const,
}

export function fetchRegister(date: string, className: string, section: Section) {
  const params = new URLSearchParams({ date, className, section })
  return api<Register>(`/api/attendance/register?${params}`)
}

export function saveRegister(values: SaveRegisterValues) {
  return api<Register>("/api/attendance/register", { method: "POST", body: JSON.stringify(values) })
}

export function fetchReport(className: string, section: Section, month: string) {
  const params = new URLSearchParams({ className, section, month })
  return api<ClassReport>(`/api/attendance/report?${params}`)
}

export function fetchRoster(className: string, section: Section) {
  const params = new URLSearchParams({ className, section })
  return api<RosterStudent[]>(`/api/attendance/roster?${params}`)
}

export function fetchMonth(month: string, studentId: string) {
  const params = new URLSearchParams({ month, studentId })
  return api<StudentMonth>(`/api/attendance/month?${params}`)
}

export function fetchOwnMonth(role: Role, month: string) {
  const params = new URLSearchParams({ month, role })
  return api<StudentMonth>(`/api/attendance/month?${params}`)
}
