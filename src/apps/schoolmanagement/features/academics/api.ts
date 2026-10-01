import type { SubjectValues } from "@/apps/schoolmanagement/features/academics/schemas"
import type { SchoolSubject } from "@/apps/schoolmanagement/features/academics/types"
import { api } from "@/shared/lib/api-client"

export const academicsKeys = { all: ["academics"] as const }

export function listSubjects() {
  return api<SchoolSubject[]>("/api/subjects")
}

export function createSubject(input: SubjectValues) {
  return api<SchoolSubject>("/api/subjects", { method: "POST", body: JSON.stringify(input) })
}

export function updateSubject(id: string, input: SubjectValues) {
  return api<SchoolSubject>(`/api/subjects/${id}`, { method: "PATCH", body: JSON.stringify(input) })
}

export function archiveSubjects(ids: string[]) {
  return api<{ ids: string[] }>("/api/subjects/archive", { method: "POST", body: JSON.stringify({ ids }) })
}

export function restoreSubjects(ids: string[]) {
  return api<{ ids: string[] }>("/api/subjects/restore", { method: "POST", body: JSON.stringify({ ids }) })
}
