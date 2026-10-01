import { z } from "zod"
import { WEEKDAYS } from "@/apps/schoolmanagement/features/timetable/types"
import { SECTIONS } from "@/apps/schoolmanagement/features/students/types"

export const slotSchema = z.object({
  className: z.string().regex(/^(?:[1-9]|1[0-2])$/, "Class is required"),
  section: z.enum(SECTIONS),
  day: z.enum(WEEKDAYS),
  period: z.string().regex(/^[1-8]$/, "Period is required"),
  subjectId: z.string().min(1, "Subject is required"),
  teacherId: z.string().min(1, "Teacher is required"),
})

export type SlotInput = z.input<typeof slotSchema>
export type SlotValues = z.output<typeof slotSchema>
