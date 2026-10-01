import { z } from "zod"

export const enquirySchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().regex(/^[6-9][0-9]{9}$/, "Enter a 10-digit mobile number"),
  className: z.string().regex(/^(?:[1-9]|1[0-2])$/, "Choose a class"),
})

export type EnquiryValues = z.infer<typeof enquirySchema>
