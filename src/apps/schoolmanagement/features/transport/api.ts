import type { AssignmentValues } from "@/apps/schoolmanagement/features/transport/schemas"
import type { BusRoute, RouteAssignment } from "@/apps/schoolmanagement/features/transport/types"
import { api } from "@/shared/lib/api-client"

export const transportKeys = { all: ["transport"] as const }

export function listRoutes() {
  return api<BusRoute[]>("/api/transport/routes")
}

export function listAssignments() {
  return api<RouteAssignment[]>("/api/transport/assignments")
}

export function assignRoute(values: AssignmentValues) {
  return api<RouteAssignment>("/api/transport/assignments", { method: "POST", body: JSON.stringify(values) })
}
