import { z } from "zod"

export const loanSchema = z.object({
  bookId: z.string().min(1, "Choose a book"),
  studentId: z.string().min(1, "Choose a student"),
  issuedOn: z.string().min(1, "Issued on is required"),
  dueOn: z.string().min(1, "Due on is required"),
})

export type LoanValues = z.infer<typeof loanSchema>
