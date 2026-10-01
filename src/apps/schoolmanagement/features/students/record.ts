import type { AdmissionValues, CsvStudent } from "@/apps/schoolmanagement/features/students/schemas"
import type { Student, StudentDocument } from "@/apps/schoolmanagement/features/students/types"

const SUBJECTS = ["English", "Hindi", "Mathematics", "Science", "Social Science"]

function documents(flags: { birth: boolean; photo: boolean; transfer: boolean }): StudentDocument[] {
  return [
    { id: "birth", name: "Birth certificate", status: flags.birth ? "received" : "pending" },
    { id: "photo", name: "Photograph", status: flags.photo ? "received" : "pending" },
    { id: "transfer", name: "Transfer certificate", status: flags.transfer ? "received" : "pending" },
  ]
}

export function studentFromAdmission(input: AdmissionValues, admissionNo: string): Student {
  return {
    id: crypto.randomUUID(),
    admissionNo,
    firstName: input.firstName,
    lastName: input.lastName,
    gender: input.gender,
    dateOfBirth: input.dateOfBirth,
    className: input.className,
    section: input.section,
    status: "active",
    guardianName: input.guardianName,
    guardianPhone: input.guardianPhone,
    address: input.address,
    bloodGroup: input.bloodGroup,
    parents: [
      { relation: "Father", name: input.fatherName, phone: input.fatherPhone, occupation: "" },
      { relation: "Mother", name: input.motherName, phone: input.motherPhone, occupation: "" },
      { relation: "Guardian", name: input.guardianName, phone: input.guardianPhone, occupation: "" },
    ],
    previousSchool: {
      name: input.previousSchool,
      board: input.board,
      lastClass: input.lastClass,
      year: input.year,
    },
    documents: documents({ birth: input.birthCertificate, photo: input.photograph, transfer: input.transferCertificate }),
    academics: SUBJECTS.map((subject) => ({ subject, score: 0, max: 100 })),
    attendance: [],
    fees: [{ term: "Term 2", amount: 18000, paid: 0, status: "due" }],
    deletedAt: null,
  }
}

export function studentFromCsv(input: CsvStudent, admissionNo: string): Student {
  return studentFromAdmission(
    {
      ...input,
      dateOfBirth: "2014-06-15",
      bloodGroup: "",
      fatherName: input.guardianName,
      fatherPhone: "",
      motherName: input.guardianName,
      motherPhone: "",
      address: "Address pending",
      previousSchool: "Not recorded",
      board: "CBSE",
      lastClass: input.className,
      year: "2026",
      birthCertificate: false,
      photograph: false,
      transferCertificate: false,
    },
    admissionNo,
  )
}
