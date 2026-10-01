import { z } from "zod"

export const dashboardNoteSchema = z.object({
  note: z.string().min(1, "Note is required"),
})
