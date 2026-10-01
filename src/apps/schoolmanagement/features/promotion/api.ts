import type { PromotionDecision, PromotionRow } from "@/apps/schoolmanagement/features/promotion/types"
import { api } from "@/shared/lib/api-client"

export const promotionKeys = { all: ["promotion"] as const }

export function listPromotion() {
  return api<PromotionRow[]>("/api/promotion")
}

export function decidePromotion(studentIds: string[], decision: PromotionDecision) {
  return api<{ count: number }>("/api/promotion", { method: "POST", body: JSON.stringify({ studentIds, decision }) })
}
