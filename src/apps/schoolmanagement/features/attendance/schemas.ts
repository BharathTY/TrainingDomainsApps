import { z } from "zod"
import { MARKS } from "@/apps/schoolmanagement/features/attendance/types"
import { SECTIONS } from "@/apps/schoolmanagement/features/students/types"

export const saveRegisterSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required"),
  className: z.string().regex(/^(?:[1-9]|1[0-2])$/, "Class is required"),
  section: z.enum(SECTIONS),
  marks: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(MARKS),
      }),
    )
    .min(1, "The roll is empty"),
})

export type SaveRegisterValues = z.infer<typeof saveRegisterSchema>
