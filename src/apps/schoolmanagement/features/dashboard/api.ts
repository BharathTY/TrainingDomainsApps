import type { Role } from "@/apps/schoolmanagement/config/permissions"
import type { DashboardPayload } from "@/apps/schoolmanagement/features/dashboard/types"
import { api } from "@/shared/lib/api-client"

export const dashboardKeys = {
  role: (role: Role) => ["dashboard", role] as const,
}

export function loadDashboard(role: Role) {
  return api<DashboardPayload>(`/api/dashboard?role=${role}`)
}
