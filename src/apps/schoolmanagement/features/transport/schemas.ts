import { z } from "zod"

export const assignmentSchema = z.object({
  routeId: z.string().min(1, "Choose a route"),
  studentId: z.string().min(1, "Choose a student"),
})

export type AssignmentValues = z.infer<typeof assignmentSchema>
