import type { Section } from "@/apps/schoolmanagement/features/students/types"

export type ClassSection = {
  id: string
  className: string
  section: Section
  classTeacherId: string | null
}

export type SchoolClass = {
  id: string
  name: string
  sections: ClassSection[]
}
