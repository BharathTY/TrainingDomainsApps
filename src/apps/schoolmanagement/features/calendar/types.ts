export type CalendarKind = "holiday" | "exam" | "event"

export type CalendarEvent = {
  id: string
  date: string
  title: string
  detail: string
  kind: CalendarKind
}
