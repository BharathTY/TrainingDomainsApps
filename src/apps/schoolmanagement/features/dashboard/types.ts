import type { ModuleId } from "@/apps/schoolmanagement/config/permissions"

export type DashboardStat = { label: string; value: string; hint: string }
export type AttendancePoint = { day: string; present: number }
export type FeePoint = { month: string; collected: number; target: number }

export type ExamItem = {
  id: string
  subject: string
  detail: string
  when: string
}

export type AnnouncementItem = {
  id: string
  title: string
  detail: string
  postedOn: string
}

export type QuickAction = {
  moduleId: ModuleId
  label: string
  hint: string
}

export type FeeSnapshot = {
  title: string
  collected: number
  target: number
  points: FeePoint[]
}

export type DashboardPayload = {
  summary: string
  stats: DashboardStat[]
  attendanceTitle: string
  attendance: AttendancePoint[]
  fees: FeeSnapshot | null
  exams: ExamItem[]
  announcements: AnnouncementItem[]
  actions: QuickAction[]
}
