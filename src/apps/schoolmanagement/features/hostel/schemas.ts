import { z } from "zod"

export const staySchema = z.object({
  roomId: z.string().min(1, "Choose a room"),
  studentId: z.string().min(1, "Choose a student"),
  since: z.string().min(1, "Since is required"),
})

export type StayValues = z.infer<typeof staySchema>
