import { z } from "zod"

export const visitorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  purpose: z.string().min(1, "Purpose is required"),
  whom: z.string().min(1, "Whom to meet is required"),
  inAt: z.string().min(1, "In time is required"),
})

export type VisitorValues = z.infer<typeof visitorSchema>
