import type { StayValues } from "@/apps/schoolmanagement/features/hostel/schemas"
import type { HostelRoom, HostelStay } from "@/apps/schoolmanagement/features/hostel/types"
import { api } from "@/shared/lib/api-client"

export const hostelKeys = { all: ["hostel"] as const }

export function listRooms() {
  return api<HostelRoom[]>("/api/hostel/rooms")
}

export function listStays() {
  return api<HostelStay[]>("/api/hostel/stays")
}

export function allocateRoom(values: StayValues) {
  return api<HostelStay>("/api/hostel/stays", { method: "POST", body: JSON.stringify(values) })
}
