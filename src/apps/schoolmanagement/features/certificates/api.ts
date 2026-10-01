import type { CertificateValues } from "@/apps/schoolmanagement/features/certificates/schemas"
import type { CertificateRequest } from "@/apps/schoolmanagement/features/certificates/types"
import { api } from "@/shared/lib/api-client"

export const certificatesKeys = { all: ["certificates"] as const }

export function listCertificates() {
  return api<CertificateRequest[]>("/api/certificates")
}

export function requestCertificate(values: CertificateValues) {
  return api<CertificateRequest>("/api/certificates", { method: "POST", body: JSON.stringify(values) })
}

export function issueCertificate(id: string) {
  return api<CertificateRequest>(`/api/certificates/${id}/issue`, { method: "POST" })
}
