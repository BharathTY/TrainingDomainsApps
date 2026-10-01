export const PROMOTION_DECISIONS = ["pending", "promoted", "detained"] as const
export type PromotionDecision = (typeof PROMOTION_DECISIONS)[number]

export type PromotionRow = {
  studentId: string
  admissionNo: string
  name: string
  className: string
  section: string
  decision: PromotionDecision
}
