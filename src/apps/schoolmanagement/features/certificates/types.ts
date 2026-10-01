export const CERTIFICATE_TYPES = ["transfer", "bonafide", "character"] as const
export type CertificateType = (typeof CERTIFICATE_TYPES)[number]

export const CERTIFICATE_STATUSES = ["requested", "ready", "issued"] as const
export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number]

export type CertificateRequest = {
  id: string
  studentId: string
  studentName: string
  type: CertificateType
  status: CertificateStatus
  requestedOn: string
}
