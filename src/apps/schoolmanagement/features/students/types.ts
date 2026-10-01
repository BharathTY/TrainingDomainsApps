export const SECTIONS = ["A", "B", "C", "D"] as const
export type Section = (typeof SECTIONS)[number]

export const GENDERS = ["female", "male", "other"] as const
export type Gender = (typeof GENDERS)[number]

export const STUDENT_STATUSES = ["active", "inactive", "alumni"] as const
export type StudentStatus = (typeof STUDENT_STATUSES)[number]

export type ParentContact = {
  relation: "Father" | "Mother" | "Guardian"
  name: string
  phone: string
  occupation: string
}

export type PreviousSchool = {
  name: string
  board: string
  lastClass: string
  year: string
}

export type StudentDocument = {
  id: string
  name: string
  status: "received" | "pending"
}

export type SubjectMark = {
  subject: string
  score: number
  max: number
}

export type AttendanceMark = {
  date: string
  status: "present" | "absent" | "late"
}

export type FeeInvoice = {
  term: string
  amount: number
  paid: number
  status: "paid" | "partial" | "due"
}

export type Student = {
  id: string
  admissionNo: string
  firstName: string
  lastName: string
  gender: Gender
  dateOfBirth: string
  className: string
  section: Section
  status: StudentStatus
  guardianName: string
  guardianPhone: string
  address: string
  bloodGroup: string
  parents: ParentContact[]
  previousSchool: PreviousSchool
  documents: StudentDocument[]
  academics: SubjectMark[]
  attendance: AttendanceMark[]
  fees: FeeInvoice[]
  deletedAt: string | null
}
