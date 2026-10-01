import type { AdmissionValues, CsvStudent } from "@/apps/schoolmanagement/features/students/schemas"
import type { Student } from "@/apps/schoolmanagement/features/students/types"
import { api } from "@/shared/lib/api-client"

export const studentKeys = { all: ["students"] as const }

export function listStudents() {
  return api<Student[]>("/api/students")
}

export function createStudent(input: AdmissionValues) {
  return api<Student>("/api/students", { method: "POST", body: JSON.stringify(input) })
}

export function importStudents(rows: CsvStudent[]) {
  return api<{ count: number }>("/api/students/import", { method: "POST", body: JSON.stringify({ rows }) })
}

export function promoteStudents(ids: string[]) {
  return api<{ ids: string[] }>("/api/students/promote", { method: "POST", body: JSON.stringify({ ids }) })
}

export function messageStudents(ids: string[], message: string) {
  return api<{ ids: string[] }>("/api/students/message", { method: "POST", body: JSON.stringify({ ids, message }) })
}

export function archiveStudents(ids: string[]) {
  return api<{ ids: string[] }>("/api/students/archive", { method: "POST", body: JSON.stringify({ ids }) })
}

export function restoreStudents(ids: string[]) {
  return api<{ ids: string[] }>("/api/students/restore", { method: "POST", body: JSON.stringify({ ids }) })
}
