import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { PageHeader } from "@/apps/inventory/components/PageHeader"
import { CalendarView } from "@/shared/CalendarView"
import { api } from "@/shared/lib/api-client"

type EventRow = { date: string; title: string; kind: string }

export function CalendarPage() {
  const [month, setMonth] = useState("2026-10")
  const events = useQuery({ queryKey: ["inventory", "calendar"], queryFn: () => api<EventRow[]>("/api/calendar") })
  const visible = useMemo(
    () => (events.data ?? []).filter((row) => String(row.date).slice(0, 7) === month),
    [events.data, month],
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Calendar" description="Cycle counts, near-expiry batches, and expected deliveries." />
      <label className="grid max-w-xs gap-1.5 text-sm" htmlFor="cal-month">
        Month
        <input id="cal-month" type="month" className="h-10 rounded-md border border-border bg-background px-2" value={month} onChange={(event) => setMonth(event.target.value)} />
      </label>
      <CalendarView month={month} />
      <ul className="grid gap-1 text-sm">
        {visible.map((row, index) => (
          <li key={`${row.kind}-${row.date}-${index}`}>{String(row.date).slice(0, 10)} · {row.title}</li>
        ))}
      </ul>
    </div>
  )
}
