import { z } from "zod"

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  address: z.string().trim().min(1, "Address is required").max(160),
  phone: z.string().regex(/^\d{10,12}$/, "Enter a phone number"),
  email: z.string().trim().email("Enter a valid email"),
  board: z.string().trim().min(1, "Board is required").max(40),
  principal: z.string().trim().min(1, "Principal is required").max(80),
})

export type ProfileValues = z.infer<typeof profileSchema>

export const yearSchema = z
  .object({
    label: z.string().trim().min(1, "Label is required").max(20),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date is required"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date is required"),
  })
  .refine((value) => value.endDate > value.startDate, { message: "End date is before the start", path: ["endDate"] })

export type YearValues = z.infer<typeof yearSchema>
