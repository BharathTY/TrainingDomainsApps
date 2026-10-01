import { z } from "zod"

export const examSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    className: z.string().regex(/^(?:[1-9]|1[0-2])$/, "Class is required"),
    term: z.string().trim().min(1, "Term is required"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date is required"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date is required"),
  })
  .refine((value) => value.endDate >= value.startDate, { message: "End date is before the start", path: ["endDate"] })

export type ExamValues = z.infer<typeof examSchema>

export const paperSchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time is required"),
  durationMinutes: z.coerce.number().int().min(15, "At least 15 minutes").max(300, "At most 300 minutes"),
  maxMarks: z.coerce.number().int().min(1, "Max marks is required").max(200, "At most 200"),
})

export type PaperValues = z.infer<typeof paperSchema>

export const markSchema = z.object({
  studentId: z.string().min(1),
  paperId: z.string().min(1),
  score: z.number().min(0).nullable(),
})

export type MarkValues = z.infer<typeof markSchema>

export const gradingSchema = z.object({
  bands: z
    .array(
      z.object({
        grade: z.string().trim().min(1).max(4),
        min: z.number().min(0).max(100),
        max: z.number().min(0).max(100),
      }),
    )
    .min(1),
})

export type GradingValues = z.infer<typeof gradingSchema>
