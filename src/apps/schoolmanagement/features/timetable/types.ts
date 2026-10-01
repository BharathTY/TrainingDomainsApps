import type { Section } from "@/apps/schoolmanagement/features/students/types"

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat"] as const
export type Weekday = (typeof WEEKDAYS)[number]

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
}

export const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const
export const PERIOD_TIME = ["8:30", "9:15", "10:10", "10:55", "11:40", "12:25", "1:10", "1:55"] as const

export type TimetableSlot = {
  id: string
  className: string
  section: Section
  day: Weekday
  period: number
  subjectId: string
  subjectName: string
  teacherId: string
  teacherName: string
  deletedAt: string | null
}

export type TeacherClash = {
  teacherId: string
  teacherName: string
  day: Weekday
  period: number
  sections: string[]
}

export function isWeekday(value: string): value is Weekday {
  return (WEEKDAYS as readonly string[]).includes(value)
}

export function teacherClashes(slots: TimetableSlot[]): TeacherClash[] {
  const groups = new Map<string, TimetableSlot[]>()
  for (const slot of slots) {
    if (slot.deletedAt) continue
    const key = `${slot.teacherId}|${slot.day}|${slot.period}`
    const list = groups.get(key) ?? []
    list.push(slot)
    groups.set(key, list)
  }
  const clashes: TeacherClash[] = []
  for (const list of groups.values()) {
    const sections = [...new Set(list.map((slot) => `${slot.className}-${slot.section}`))]
    const first = list[0]
    if (sections.length > 1 && first) {
      clashes.push({
        teacherId: first.teacherId,
        teacherName: first.teacherName,
        day: first.day,
        period: first.period,
        sections,
      })
    }
  }
  return clashes
}
