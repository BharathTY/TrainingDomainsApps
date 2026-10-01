import type { Section } from "@/apps/schoolmanagement/features/students/types"

export const STAFF_ROLES = ["teacher", "office"] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export const STAFF_STATUSES = ["active", "inactive"] as const
export type StaffStatus = (typeof STAFF_STATUSES)[number]

export const SUBJECTS = ["English", "Hindi", "Mathematics", "Science", "Social Science"] as const
export type Subject = (typeof SUBJECTS)[number]

export const LEAVE_TYPES = ["casual", "sick", "earned"] as const
export type LeaveType = (typeof LEAVE_TYPES)[number]

export const LEAVE_STATUSES = ["pending", "approved", "rejected"] as const
export type LeaveStatus = (typeof LEAVE_STATUSES)[number]

export type Assignment = {
  id: string
  className: string
  section: Section
  subject: Subject
}

export type LeaveRequest = {
  id: string
  type: LeaveType
  from: string
  to: string
  reason: string
  status: LeaveStatus
}

export type StaffMember = {
  id: string
  employeeNo: string
  firstName: string
  lastName: string
  role: StaffRole
  subject: Subject | ""
  phone: string
  email: string
  status: StaffStatus
  joiningDate: string
  assignments: Assignment[]
  leaves: LeaveRequest[]
  deletedAt: string | null
}

export type LeaveRow = LeaveRequest & {
  staffId: string
  staffName: string
}
