import { z } from "zod"

export const reportsSchema = z.object({
  name: z.string().min(1, "Name is required"),
})
