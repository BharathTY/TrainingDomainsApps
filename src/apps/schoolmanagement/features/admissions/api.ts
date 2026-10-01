import type { EnquiryValues } from "@/apps/schoolmanagement/features/admissions/schemas"
import type { Enquiry } from "@/apps/schoolmanagement/features/admissions/types"
import { api } from "@/shared/lib/api-client"

export const admissionsKeys = { all: ["admissions"] as const }

export function listEnquiries() {
  return api<Enquiry[]>("/api/admissions")
}

export function createEnquiry(values: EnquiryValues) {
  return api<Enquiry>("/api/admissions", { method: "POST", body: JSON.stringify(values) })
}
