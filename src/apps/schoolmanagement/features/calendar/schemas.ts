import { z } from "zod"

export const calendarSchema = z.object({
  name: z.string().min(1, "Name is required"),
})
