import type { AnnouncementValues, HomeworkValues } from "@/apps/schoolmanagement/features/communication/schemas"
import type { Announcement, Homework } from "@/apps/schoolmanagement/features/communication/types"
import type { Role } from "@/apps/schoolmanagement/config/permissions"
import { api } from "@/shared/lib/api-client"

export const commKeys = {
  announcements: (role: Role) => ["communication", "announcements", role] as const,
  homework: (role: Role) => ["communication", "homework", role] as const,
}

export function listAnnouncements(role: Role) {
  return api<Announcement[]>(`/api/announcements?role=${role}`)
}

export function createAnnouncement(values: AnnouncementValues) {
  return api<Announcement>("/api/announcements", { method: "POST", body: JSON.stringify(values) })
}

export function archiveAnnouncements(ids: string[]) {
  return api<{ ids: string[] }>("/api/announcements/archive", { method: "POST", body: JSON.stringify({ ids }) })
}

export function restoreAnnouncements(ids: string[]) {
  return api<{ ids: string[] }>("/api/announcements/restore", { method: "POST", body: JSON.stringify({ ids }) })
}

export function listHomework(role: Role) {
  return api<Homework[]>(`/api/homework?role=${role}`)
}

export function createHomework(values: HomeworkValues) {
  return api<Homework>("/api/homework", { method: "POST", body: JSON.stringify(values) })
}

export function archiveHomework(ids: string[]) {
  return api<{ ids: string[] }>("/api/homework/archive", { method: "POST", body: JSON.stringify({ ids }) })
}

export function restoreHomework(ids: string[]) {
  return api<{ ids: string[] }>("/api/homework/restore", { method: "POST", body: JSON.stringify({ ids }) })
}
