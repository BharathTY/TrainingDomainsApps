import { z } from "zod"
import { AUDIENCES } from "@/apps/schoolmanagement/features/communication/types"

export const announcementSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(80),
  body: z.string().trim().min(1, "Message is required").max(400),
  audience: z.enum(AUDIENCES),
  className: z.string().regex(/^(?:any|[1-9]|1[0-2])$/, "Class is required"),
})

export type AnnouncementValues = z.infer<typeof announcementSchema>

export const homeworkSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(80),
  subject: z.string().trim().min(1, "Subject is required").max(40),
  className: z.string().regex(/^(?:[1-9]|1[0-2])$/, "Class is required"),
  section: z.enum(["A", "B", "C", "D"]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date is required"),
  details: z.string().trim().min(1, "Details are required").max(400),
})

export type HomeworkValues = z.infer<typeof homeworkSchema>
