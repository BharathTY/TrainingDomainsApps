import { z } from "zod"

export const headSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  className: z.string().regex(/^(?:all|[1-9]|1[0-2])$/, "Class is required"),
  amount: z.coerce.number().int().min(1, "Amount is required").max(500000),
})

export type HeadValues = z.infer<typeof headSchema>

export const installmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date is required"),
  sharePercent: z.coerce.number().int().min(1, "Share is required").max(100),
})

export type InstallmentValues = z.infer<typeof installmentSchema>

export const concessionSchema = z.object({
  className: z.string().regex(/^(?:[1-9]|1[0-2])$/, "Class is required"),
  label: z.string().trim().min(1, "Label is required").max(40),
  percent: z.coerce.number().int().min(1, "Percent is required").max(100),
})

export type ConcessionValues = z.infer<typeof concessionSchema>

export const paymentSchema = z.object({
  amount: z.coerce.number().int().min(1, "Amount is required"),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required"),
  mode: z.enum(["cash", "upi", "cheque"]),
  note: z.string().trim().max(80),
})

export type PaymentValues = z.infer<typeof paymentSchema>
