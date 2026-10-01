import type { SchoolReport } from "@/apps/schoolmanagement/features/reports/types"
import { api } from "@/shared/lib/api-client"

export const reportsKeys = { all: ["reports"] as const }

export function loadReport() {
  return api<SchoolReport>("/api/reports")
}
