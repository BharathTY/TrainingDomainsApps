import { z } from "zod"
import { CERTIFICATE_TYPES } from "@/apps/schoolmanagement/features/certificates/types"

export const certificateSchema = z.object({
  studentId: z.string().min(1, "Choose a student"),
  type: z.enum(CERTIFICATE_TYPES, { message: "Choose a certificate" }),
})

export type CertificateValues = z.infer<typeof certificateSchema>
