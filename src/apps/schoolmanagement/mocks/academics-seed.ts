import type { SchoolSubject } from "@/apps/schoolmanagement/features/academics/types"
import type { SchoolClass } from "@/apps/schoolmanagement/features/classes/types"
import type { StaffMember } from "@/apps/schoolmanagement/features/staff/types"
import { PERIODS, WEEKDAYS, type TimetableSlot } from "@/apps/schoolmanagement/features/timetable/types"
import { SECTIONS } from "@/apps/schoolmanagement/features/students/types"

const SUBJECT_ROWS = [
  { name: "English", code: "ENG" },
  { name: "Hindi", code: "HIN" },
  { name: "Mathematics", code: "MAT" },
  { name: "Science", code: "SCI" },
  { name: "Social Science", code: "SST" },
] as const

function activeTeachers(staff: StaffMember[]) {
  return staff.filter((member) => member.role === "teacher" && member.status === "active" && !member.deletedAt)
}

export function createSubjects(): SchoolSubject[] {
  return SUBJECT_ROWS.map((row, index) => ({
    id: `sub-${index + 1}`,
    name: row.name,
    code: row.code,
    deletedAt: null,
  }))
}

export function createClassTree(staff: StaffMember[]): SchoolClass[] {
  const teachers = activeTeachers(staff)
  let cursor = 0
  return Array.from({ length: 12 }, (_, index) => {
    const className = String(index + 1)
    const assignHere = className === "6" || className === "7" || className === "8"
    return {
      id: className,
      name: `Class ${className}`,
      sections: SECTIONS.map((section) => {
        const teacher = assignHere ? teachers[cursor++] : undefined
        return {
          id: `${className}-${section}`,
          className,
          section,
          classTeacherId: teacher?.id ?? null,
        }
      }),
    }
  })
}

export function createTimetable(staff: StaffMember[], subjects: SchoolSubject[]): TimetableSlot[] {
  const teachers = activeTeachers(staff)
  if (teachers.length === 0 || subjects.length === 0) return []
  const slots: TimetableSlot[] = []
  for (const className of ["6", "7"]) {
    SECTIONS.forEach((section, sectionIndex) => {
      WEEKDAYS.forEach((day, dayIndex) => {
        for (const period of PERIODS.slice(0, 6)) {
          const subject = subjects[(period + sectionIndex) % subjects.length]
          const teacher = teachers[(dayIndex + period + sectionIndex + Number(className)) % teachers.length]
          if (!subject || !teacher) continue
          slots.push({
            id: `${className}-${section}-${day}-${period}`,
            className,
            section,
            day,
            period,
            subjectId: subject.id,
            subjectName: subject.name,
            teacherId: teacher.id,
            teacherName: `${teacher.firstName} ${teacher.lastName}`,
            deletedAt: null,
          })
        }
      })
    })
  }
  const source = slots.find((slot) => slot.id === "6-A-mon-1")
  const target = slots.find((slot) => slot.id === "6-B-mon-1")
  if (source && target) {
    target.teacherId = source.teacherId
    target.teacherName = source.teacherName
  }
  return slots
}
