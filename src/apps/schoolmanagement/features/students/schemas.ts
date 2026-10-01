import { z } from "zod"
import { GENDERS, SECTIONS } from "@/apps/schoolmanagement/features/students/types"

const phone = z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile starting with 6–9")
const optionalPhone = z.string().trim().refine((value) => value === "" || /^[6-9]\d{9}$/.test(value), "Enter a 10-digit mobile starting with 6–9")

export const admissionSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  gender: z.string().refine((value): value is (typeof GENDERS)[number] => (GENDERS as readonly string[]).includes(value), "Gender is required"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((value) => value < new Date().toISOString().slice(0, 10), "Date of birth must be in the past"),
  className: z.string().regex(/^(?:[1-9]|1[0-2])$/, "Class is required"),
  section: z.enum(SECTIONS),
  bloodGroup: z.string(),
  fatherName: z.string().trim().min(1, "Father's name is required"),
  fatherPhone: optionalPhone,
  motherName: z.string().trim().min(1, "Mother's name is required"),
  motherPhone: optionalPhone,
  guardianName: z.string().trim().min(1, "Guardian name is required"),
  guardianPhone: phone,
  address: z.string().trim().min(1, "Address is required"),
  previousSchool: z.string().trim().min(1, "School name is required"),
  board: z.string().trim().min(1, "Board is required"),
  lastClass: z.string().trim().min(1, "Last class is required"),
  year: z.string().regex(/^\d{4}$/, "Enter a 4-digit year"),
  birthCertificate: z.boolean().refine((value) => value, "Birth certificate is required"),
  photograph: z.boolean().refine((value) => value, "Photograph is required"),
  transferCertificate: z.boolean(),
})

export type AdmissionInput = z.input<typeof admissionSchema>
export type AdmissionValues = z.output<typeof admissionSchema>

export const csvStudentSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  gender: z.string().refine((value): value is (typeof GENDERS)[number] => (GENDERS as readonly string[]).includes(value), "Gender must be female, male, or other"),
  className: z.string().regex(/^(?:[1-9]|1[0-2])$/, "Class must be 1–12"),
  section: z.enum(SECTIONS, { errorMap: () => ({ message: "Section must be A, B, C, or D" }) }),
  guardianName: z.string().trim().min(1, "Guardian name is required"),
  guardianPhone: phone,
})

export type CsvStudent = z.output<typeof csvStudentSchema>

export const messageSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(500, "Keep the message under 500 characters"),
})
