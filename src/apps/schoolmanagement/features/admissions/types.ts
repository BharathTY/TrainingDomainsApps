export const ENQUIRY_STATUSES = ["new", "contacted", "admitted"] as const
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number]

export type Enquiry = {
  id: string
  name: string
  phone: string
  className: string
  status: EnquiryStatus
  appliedOn: string
}
