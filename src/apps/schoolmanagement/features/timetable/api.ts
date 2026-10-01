import type { SlotValues } from "@/apps/schoolmanagement/features/timetable/schemas"
import type { TimetableSlot, Weekday } from "@/apps/schoolmanagement/features/timetable/types"
import { api } from "@/shared/lib/api-client"

export const timetableKeys = { all: ["timetable"] as const }

export function listSlots() {
  return api<TimetableSlot[]>("/api/timetable")
}

export function placeSlot(input: SlotValues) {
  return api<TimetableSlot>("/api/timetable", { method: "POST", body: JSON.stringify(input) })
}

export function moveSlot(slotId: string, day: Weekday, period: number) {
  return api<TimetableSlot>("/api/timetable/move", { method: "POST", body: JSON.stringify({ slotId, day, period }) })
}

export function archiveSlots(ids: string[]) {
  return api<{ ids: string[] }>("/api/timetable/archive", { method: "POST", body: JSON.stringify({ ids }) })
}

export function restoreSlots(ids: string[]) {
  return api<{ ids: string[] }>("/api/timetable/restore", { method: "POST", body: JSON.stringify({ ids }) })
}
