import type { ClassSection, SchoolClass } from "@/apps/schoolmanagement/features/classes/types"
import { api } from "@/shared/lib/api-client"

export const classesKeys = { all: ["classes"] as const }

export function listClasses() {
  return api<SchoolClass[]>("/api/classes")
}

export function assignClassTeacher(sectionId: string, teacherId: string | null) {
  return api<ClassSection>("/api/classes/teacher", { method: "POST", body: JSON.stringify({ sectionId, teacherId }) })
}
