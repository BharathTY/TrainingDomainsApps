import { z } from "zod"

export const visitSchema = z.object({
  studentId: z.string().min(1, "Choose a student"),
  date: z.string().min(1, "Date is required"),
  note: z.string().min(1, "Note is required"),
})

export const vaccineSchema = z.object({
  studentId: z.string().min(1, "Choose a student"),
  name: z.string().min(1, "Vaccine is required"),
  date: z.string().min(1, "Date is required"),
})

export type VisitValues = z.infer<typeof visitSchema>
export type VaccineValues = z.infer<typeof vaccineSchema>
