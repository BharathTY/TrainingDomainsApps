import { z } from "zod"
import { PROMOTION_DECISIONS } from "@/apps/schoolmanagement/features/promotion/types"

export const promotionSchema = z.object({
  decision: z.enum(PROMOTION_DECISIONS),
})

export type PromotionValues = z.infer<typeof promotionSchema>
