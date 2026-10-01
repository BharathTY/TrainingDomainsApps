import { PERMISSIONS } from "@/apps/schoolmanagement/config/permissions"
import type { Announcement, Homework } from "@/apps/schoolmanagement/features/communication/types"
import type { AcademicYear, PermissionMatrix, SchoolProfile } from "@/apps/schoolmanagement/features/settings/types"

export function createOfficeSeed() {
  const announcements: Announcement[] = [
    { id: "n1", title: "Term 1 report cards", body: "Released on 6 Oct for classes 1–12.", audience: "all", className: null, postedOn: "2026-09-29", deletedAt: null },
    { id: "n2", title: "PTM, classes 6–8", body: "Saturday 4 Oct, 9:00 AM in the auditorium.", audience: "parents", className: null, postedOn: "2026-09-28", deletedAt: null },
    { id: "n3", title: "Staff meeting", body: "Friday 3 Oct, 4:00 PM. Bring unmarked registers.", audience: "staff", className: null, postedOn: "2026-09-28", deletedAt: null },
    { id: "n4", title: "Library fine waiver", body: "Returns until 5 Oct carry no fine.", audience: "students", className: null, postedOn: "2026-09-27", deletedAt: null },
    { id: "n5", title: "Bus route 4", body: "Morning pickup delayed by 15 minutes this week.", audience: "all", className: null, postedOn: "2026-09-27", deletedAt: null },
  ]
  const homework: Homework[] = [
    { id: "hw-1", title: "Chapter 4 questions", subject: "Science", className: "6", section: "A", dueDate: "2026-10-03", details: "Answer the end-of-chapter questions in the notebook.", deletedAt: null },
    { id: "hw-2", title: "Essay: a rainy day", subject: "English", className: "6", section: "A", dueDate: "2026-10-05", details: "One page, in your own words.", deletedAt: null },
    { id: "hw-3", title: "Worksheet 12", subject: "Mathematics", className: "7", section: "A", dueDate: "2026-10-02", details: "Complete the fractions worksheet.", deletedAt: null },
  ]
  const profile: SchoolProfile = {
    name: "QSpiders School",
    address: "12, MG Road, Bengaluru 560001",
    phone: "08041234567",
    email: "office@qspiders.school",
    board: "CBSE",
    principal: "Meera Iyer",
  }
  const years: AcademicYear[] = [
    { id: "year-2025", label: "2025-26", startDate: "2025-04-01", endDate: "2026-03-31", current: false },
    { id: "year-2026", label: "2026-27", startDate: "2026-04-01", endDate: "2027-03-31", current: true },
  ]
  const permissions = structuredClone(PERMISSIONS) as PermissionMatrix
  return { announcements, homework, profile, years, permissions }
}
