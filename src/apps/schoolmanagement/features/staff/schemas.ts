import { z } from "zod"
import { LEAVE_TYPES, STAFF_ROLES, SUBJECTS } from "@/apps/schoolmanagement/features/staff/types"
import { SECTIONS } from "@/apps/schoolmanagement/features/students/types"

const phone = z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile starting with 6–9")

export const staffCreateSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    role: z.enum(STAFF_ROLES),
    subject: z.string(),
    phone,
    email: z.string().trim().email("Enter a valid email"),
  })
  .superRefine((value, context) => {
    if (value.role === "teacher" && !(SUBJECTS as readonly string[]).includes(value.subject)) {
      context.addIssue({ code: "custom", path: ["subject"], message: "Subject is required" })
    }
  })

export type StaffCreateInput = z.input<typeof staffCreateSchema>
export type StaffCreateValues = z.output<typeof staffCreateSchema>

export const assignmentSchema = z.object({
  className: z.string().regex(/^(?:[1-9]|1[0-2])$/, "Class is required"),
  section: z.enum(SECTIONS),
  subject: z.string().refine((value): value is (typeof SUBJECTS)[number] => (SUBJECTS as readonly string[]).includes(value), "Subject is required"),
})

export type AssignmentInput = z.input<typeof assignmentSchema>
export type AssignmentValues = z.output<typeof assignmentSchema>

const leaveFields = {
  type: z.enum(LEAVE_TYPES),
  from: z.string().min(1, "Start date is required"),
  to: z.string().min(1, "End date is required"),
  reason: z.string().trim().min(1, "Reason is required"),
}

function checkDates(value: { from: string; to: string }, context: z.RefinementCtx) {
  if (value.from && value.to && value.to < value.from) {
    context.addIssue({ code: "custom", path: ["to"], message: "End date must be on or after the start date" })
  }
}

export const leaveSchema = z
  .object({
    staffId: z.string().min(1, "Staff member is required"),
    ...leaveFields,
  })
  .superRefine(checkDates)

export const ownLeaveSchema = z.object(leaveFields).superRefine(checkDates)

export type LeaveValues = z.output<typeof leaveSchema>
export type OwnLeaveValues = z.output<typeof ownLeaveSchema>
