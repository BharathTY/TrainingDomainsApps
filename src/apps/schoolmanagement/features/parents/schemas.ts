import { z } from "zod"

export const parentsSchema = z.object({
  name: z.string().min(1, "Name is required"),
})
