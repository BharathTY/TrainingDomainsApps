import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "@/apps/hospital/components/PageHeader"
import { asRows, loadPaged } from "@/apps/hospital/features/catalog/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { appPath } from "@/shared/lib/app-context"

type Appt = {
  id: string
  appointmentNo: string
  appointmentDate: string
  startTime: string
  endTime: string
  status: string
  patient: string
  doctor: string
}

export function CalendarPage() {
  const [month, setMonth] = useState("2026-10")
  const [selected, setSelected] = useState("2026-10-14")
  const [view, setView] = useState<"month" | "week" | "day">("month")
  const list = useQuery({
    queryKey: ["hospital", "appointments", "calendar"],
    queryFn: () => loadPaged<Appt>("/api/appointments", { page: 1, pageSize: 100 }),
  })
  const rows = asRows(list.data ?? [])
  const byDate = useMemo(() => {
    const map = new Map<string, Appt[]>()
    for (const row of rows) {
      const key = String(row.appointmentDate).slice(0, 10)
      const bucket = map.get(key) ?? []
      bucket.push(row)
      map.set(key, bucket)
    }
    return map
  }, [rows])

  const days = useMemo(() => {
    const [y, m] = month.split("-").map(Number)
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return Array.from({ length: count }, (_, i) => {
      const day = String(i + 1).padStart(2, "0")
      return `${month}-${day}`
    }).map((iso) => ({ iso, label: iso.slice(8), weekday: new Date(`${iso}T00:00:00Z`).getUTCDay() }))
  }, [month])

  const dayAppts = byDate.get(selected) ?? []

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Appointment calendar"
        description="Month / week / day views with status indicators. Select a day to schedule from Appointments."
        actions={
          <Link className="text-sm underline" to={appPath("appointments")}>
            Open appointments table
          </Link>
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="cal-month">Month</Label>
          <Input id="cal-month" name="cal-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cal-date">Selected date</Label>
          <Input id="cal-date" name="cal-date" type="date" value={selected} onChange={(e) => setSelected(e.target.value)} />
        </div>
        <div className="flex gap-1" role="group" aria-label="Calendar view">
          {(["month", "week", "day"] as const).map((v) => (
            <Button key={v} type="button" size="sm" variant={view === v ? "default" : "outline"} onClick={() => setView(v)}>
              {v}
            </Button>
          ))}
        </div>
      </div>
      {view === "month" ? (
        <div className="grid grid-cols-7 gap-1" data-testid="calendar-month">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="p-1 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {Array.from({ length: days[0]?.weekday ?? 0 }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map((day) => {
            const count = byDate.get(day.iso)?.length ?? 0
            return (
              <button
                key={day.iso}
                type="button"
                className={`min-h-16 rounded border p-1 text-left text-xs ${selected === day.iso ? "border-primary bg-primary/10" : "border-border"}`}
                onClick={() => setSelected(day.iso)}
                data-date={day.iso}
              >
                <span className="font-semibold">{day.label}</span>
                {count ? <span className="mt-1 block text-muted-foreground">{count} appt</span> : null}
              </button>
            )
          })}
        </div>
      ) : null}
      <section className="rounded-lg border border-border bg-card p-4" aria-label="Selected day appointments">
        <h2 className="text-sm font-semibold">
          <time dateTime={selected}>{selected}</time> · {view} view
        </h2>
        <ul className="mt-2 space-y-2 text-sm">
          {dayAppts.map((appt) => (
            <li key={appt.id} className="rounded border border-border px-3 py-2" data-status={appt.status}>
              <strong>{appt.startTime?.toString().slice(0, 5)}</strong> {appt.patient} with {appt.doctor}{" "}
              <span className="rounded border px-1 text-xs">{appt.status}</span>
            </li>
          ))}
          {dayAppts.length === 0 ? <li className="text-muted-foreground">No appointments on this date.</li> : null}
        </ul>
      </section>
    </div>
  )
}
