import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"
import { EmptyState } from "@/shared/EmptyState"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { Button } from "@/components/ui/button"
import { can } from "@/apps/schoolmanagement/config/permissions"
import { calendarKeys, listCalendar } from "@/apps/schoolmanagement/features/calendar/api"
import type { CalendarEvent, CalendarKind } from "@/apps/schoolmanagement/features/calendar/types"
import { monthLabel, shiftMonth } from "@/apps/schoolmanagement/features/attendance/types"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"
import { todayIst } from "@/shared/lib/dates"
import { cn } from "@/shared/lib/utils"

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

const KIND_LABEL: Record<CalendarKind, string> = {
  holiday: "Holiday",
  exam: "Exam",
  event: "Event",
}

export function CalendarPage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "calendar", "view")
  const [month, setMonth] = useState(() => todayIst().slice(0, 7))
  const query = useQuery({ queryKey: calendarKeys.all, queryFn: listCalendar, enabled: allowed })
  const events = useMemo(() => (query.data ?? []).filter((event) => event.date.startsWith(`${month}-`)), [month, query.data])

  if (!allowed) {
    return <EmptyState title="No access" description="Your account cannot open this module." />
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Calendar" description="Holidays, exams, and events." />
      <div className="flex h-10 max-w-xs items-center gap-1">
        <Button type="button" variant="outline" size="icon" aria-label="Previous month" onClick={() => setMonth((current) => shiftMonth(current, -1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <p className="min-w-0 flex-1 text-center text-sm font-medium">{monthLabel(month)}</p>
        <Button type="button" variant="outline" size="icon" aria-label="Next month" onClick={() => setMonth((current) => shiftMonth(current, 1))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading the calendar…</p> : null}
      {query.isError ? <EmptyState title="Could not load the calendar" description="Holidays and exams did not load." actionLabel="Retry" onAction={() => void query.refetch()} /> : null}
      {query.data ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)]">
          <MonthGrid month={month} events={events} />
          {events.length === 0 ? (
            <EmptyState title="Nothing scheduled" description={`No holidays, exams, or events in ${monthLabel(month)}.`} />
          ) : (
            <ul className="grid content-start gap-2">
              {events.map((event) => (
                <li key={event.id} className="rounded-md border border-border bg-card px-3 py-2">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {dayLabel(event.date)} · {KIND_LABEL[event.kind]} · {event.detail}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

function MonthGrid({ month, events }: { month: string; events: CalendarEvent[] }) {
  const [year, index] = month.split("-").map(Number)
  const count = year && index ? new Date(Date.UTC(year, index, 0)).getUTCDate() : 0
  const lead = year && index ? new Date(Date.UTC(year, index - 1, 1)).getUTCDay() : 0
  const byDate = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const list = byDate.get(event.date) ?? []
    list.push(event)
    byDate.set(event.date, list)
  }

  return (
    <div data-testid="calendar-view" className="rounded-md border border-border bg-card p-3">
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground" aria-hidden>
        {WEEKDAYS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={monthLabel(month)}>
        {Array.from({ length: lead }, (_, offset) => (
          <div key={`lead-${offset}`} />
        ))}
        {Array.from({ length: count }, (_, offset) => {
          const day = offset + 1
          const date = `${month}-${String(day).padStart(2, "0")}`
          const dayEvents = byDate.get(date) ?? []
          const holiday = dayEvents.some((event) => event.kind === "holiday")
          return (
            <div
              key={date}
              role="gridcell"
              data-testid={`calendar-day-${day}`}
              aria-label={dayEvents.length > 0 ? `${date} ${dayEvents.map((event) => event.title).join(", ")}` : date}
              className={cn(
                "flex min-h-14 flex-col items-start rounded-sm border border-border p-1 text-xs",
                holiday && "bg-primary-soft",
                dayEvents.length > 0 && !holiday && "bg-muted",
              )}
            >
              <span className="font-medium">{day}</span>
              {dayEvents.slice(0, 2).map((event) => (
                <span key={event.id} className="w-full truncate text-[10px] leading-tight text-muted-foreground">
                  {event.title}
                </span>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function dayLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number)
  if (!year || !month || !day) return date
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" })
}
