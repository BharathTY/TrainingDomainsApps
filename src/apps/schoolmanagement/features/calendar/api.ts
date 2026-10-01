import { api } from "@/shared/lib/api-client"
import type { CalendarEvent } from "@/apps/schoolmanagement/features/calendar/types"

export const calendarKeys = { all: ["calendar"] as const }

export function listCalendar() {
  return api<CalendarEvent[]>("/api/calendar")
}
