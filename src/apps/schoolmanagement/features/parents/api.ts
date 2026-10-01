import type { GuardianRow } from "@/apps/schoolmanagement/features/parents/types"
import { api } from "@/shared/lib/api-client"

export const parentsKeys = { all: ["parents"] as const }

export function listGuardians() {
  return api<GuardianRow[]>("/api/parents")
}
