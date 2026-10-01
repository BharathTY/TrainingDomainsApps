import { z } from "zod"

export const classTeacherSchema = z.object({
  sectionId: z.string().min(1, "Section is required"),
  teacherId: z.string().nullable(),
})

export type ClassTeacherValues = z.output<typeof classTeacherSchema>
