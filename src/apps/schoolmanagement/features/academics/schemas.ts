import { z } from "zod"

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(8, "Use at most 8 characters")
    .regex(/^[A-Za-z0-9]+$/, "Use letters and numbers"),
})

export type SubjectValues = z.output<typeof subjectSchema>
