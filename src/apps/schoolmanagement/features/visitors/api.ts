import type { VisitorValues } from "@/apps/schoolmanagement/features/visitors/schemas"
import type { Visitor } from "@/apps/schoolmanagement/features/visitors/types"
import { api } from "@/shared/lib/api-client"

export const visitorsKeys = { all: ["visitors"] as const }

export function listVisitors() {
  return api<Visitor[]>("/api/visitors")
}

export function checkInVisitor(values: VisitorValues) {
  return api<Visitor>("/api/visitors", { method: "POST", body: JSON.stringify(values) })
}

export function checkOutVisitor(id: string) {
  return api<Visitor>(`/api/visitors/${id}/checkout`, { method: "POST" })
}
