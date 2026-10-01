import { http, HttpResponse } from "msw"
import type { Role } from "@/apps/schoolmanagement/config/permissions"
import { SCHOOL_TODAY } from "@/apps/schoolmanagement/features/attendance/types"
import type { AnnouncementValues, HomeworkValues } from "@/apps/schoolmanagement/features/communication/schemas"
import type { Announcement, Audience, Homework } from "@/apps/schoolmanagement/features/communication/types"
import { db } from "@/apps/schoolmanagement/mocks/seed"

const ROLES: Role[] = ["admin", "teacher", "parent", "student"]
const AUDIENCES: Audience[] = ["all", "staff", "parents", "students"]

function isRole(value: string | null): value is Role {
  return ROLES.includes(value as Role)
}

function linkedChild() {
  return db.students.find((student) => !student.deletedAt && student.status === "active" && student.className === "6" && student.section === "A") ?? null
}

function seesAnnouncement(role: Role, item: Announcement) {
  if (item.deletedAt) return false
  if (role === "admin" || role === "teacher") return true
  const child = linkedChild()
  const classOk = !item.className || item.className === child?.className
  if (role === "parent") return classOk && (item.audience === "all" || item.audience === "parents")
  return classOk && (item.audience === "all" || item.audience === "students")
}

function seesHomework(role: Role, item: Homework) {
  if (item.deletedAt) return false
  if (role === "admin" || role === "teacher") return true
  const child = linkedChild()
  return item.className === child?.className && item.section === child?.section
}

export const commHandlers = [
  http.get("/api/schoolmanagement/announcements", ({ request }) => {
    const role = new URL(request.url).searchParams.get("role")
    if (!isRole(role)) return HttpResponse.json({ message: "Unknown role" }, { status: 400 })
    const rows = db.announcements.filter((item) => seesAnnouncement(role, item)).sort((left, right) => right.postedOn.localeCompare(left.postedOn))
    return HttpResponse.json(rows)
  }),
  http.post("/api/schoolmanagement/announcements", async ({ request }) => {
    const body = (await request.json()) as AnnouncementValues
    if (!AUDIENCES.includes(body.audience)) return HttpResponse.json({ message: "Choose an audience" }, { status: 400 })
    const row: Announcement = {
      id: crypto.randomUUID(),
      title: body.title.trim(),
      body: body.body.trim(),
      audience: body.audience,
      className: body.className === "any" ? null : body.className,
      postedOn: SCHOOL_TODAY,
      deletedAt: null,
    }
    db.announcements.unshift(row)
    return HttpResponse.json(row)
  }),
  http.post("/api/schoolmanagement/announcements/archive", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    for (const row of db.announcements) if (body.ids.includes(row.id)) row.deletedAt = new Date().toISOString()
    return HttpResponse.json({ ids: body.ids })
  }),
  http.post("/api/schoolmanagement/announcements/restore", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    for (const row of db.announcements) if (body.ids.includes(row.id)) row.deletedAt = null
    return HttpResponse.json({ ids: body.ids })
  }),
  http.get("/api/schoolmanagement/homework", ({ request }) => {
    const role = new URL(request.url).searchParams.get("role")
    if (!isRole(role)) return HttpResponse.json({ message: "Unknown role" }, { status: 400 })
    const rows = db.homework.filter((item) => seesHomework(role, item)).sort((left, right) => left.dueDate.localeCompare(right.dueDate))
    return HttpResponse.json(rows)
  }),
  http.post("/api/schoolmanagement/homework", async ({ request }) => {
    const body = (await request.json()) as HomeworkValues
    const row: Homework = {
      id: crypto.randomUUID(),
      title: body.title.trim(),
      subject: body.subject.trim(),
      className: body.className,
      section: body.section,
      dueDate: body.dueDate,
      details: body.details.trim(),
      deletedAt: null,
    }
    db.homework.unshift(row)
    return HttpResponse.json(row)
  }),
  http.post("/api/schoolmanagement/homework/archive", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    for (const row of db.homework) if (body.ids.includes(row.id)) row.deletedAt = new Date().toISOString()
    return HttpResponse.json({ ids: body.ids })
  }),
  http.post("/api/schoolmanagement/homework/restore", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    for (const row of db.homework) if (body.ids.includes(row.id)) row.deletedAt = null
    return HttpResponse.json({ ids: body.ids })
  }),
]
