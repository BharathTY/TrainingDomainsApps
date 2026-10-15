import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "@/apps/crm/components/PageHeader"
import { loadLookups, qs } from "@/apps/crm/features/api"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Modal } from "@/shared/Modal"
import { Tabs } from "@/shared/Tabs"
import { api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"

type Activity = {
  id: string
  activityNo: string
  title: string
  activityType: string
  status: string
  startAt: string
  endAt: string
  ownerUsername: string
  priority: string
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date())
  const [type, setType] = useState("all")
  const [status, setStatus] = useState("all")
  const [selected, setSelected] = useState<Activity | null>(null)
  const lookups = useQuery({ queryKey: ["crm", "lookups"], queryFn: loadLookups })

  const from = useMemo(() => {
    const d = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    d.setDate(d.getDate() - 7)
    return d.toISOString()
  }, [cursor])
  const to = useMemo(() => {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 7)
    return d.toISOString()
  }, [cursor])

  const query = useQuery({
    queryKey: ["crm", "calendar", from, to, type, status],
    queryFn: () =>
      api<{ data: Activity[] }>(
        `/api/activities${qs({
          from,
          to,
          type: type === "all" ? undefined : type,
          status: status === "all" ? undefined : status,
          pageSize: 100,
        })}`,
      ),
  })

  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const firstDow = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay()
  const activities = query.data?.data ?? []

  function eventsOn(day: number) {
    return activities.filter((a) => {
      const d = new Date(a.startAt)
      return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth() && d.getDate() === day
    })
  }

  const weekStart = useMemo(() => {
    const d = new Date(cursor)
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  }, [cursor])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Calendar"
        description="Month, week, day, and agenda views for CRM activities."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              Previous
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setCursor(new Date())}>
              Today
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              Next
            </Button>
            <Button asChild size="sm">
              <Link to={appPath("activities?new=1")}>New activity</Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="grid gap-1">
          <Label htmlFor="cal-type">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="cal-type" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {(lookups.data?.activityTypes ?? []).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="cal-status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="cal-status" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(lookups.data?.activityStatuses ?? []).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="self-end text-sm text-muted-foreground pb-2">{monthKey(cursor)}</p>
      </div>

      <Tabs
        tabs={[
          {
            id: "month",
            label: "Month",
            content: (
              <div data-testid="calendar-month" className="grid grid-cols-7 gap-1 text-xs">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="px-1 py-1 font-medium text-muted-foreground">{d}</div>
                ))}
                {Array.from({ length: firstDow }).map((_, i) => (
                  <div key={`pad-${i}`} className="min-h-20 rounded border border-dashed border-border" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const events = eventsOn(day)
                  return (
                    <div key={day} className="min-h-20 rounded border border-border p-1" data-testid={`calendar-day-${day}`}>
                      <div className="font-medium">{day}</div>
                      <ul className="mt-1 space-y-0.5">
                        {events.slice(0, 3).map((e) => (
                          <li key={e.id}>
                            <button
                              type="button"
                              className={`w-full truncate text-left underline ${e.status === "completed" ? "text-emerald-700" : new Date(e.startAt) < new Date() && e.status === "planned" ? "text-rose-700" : ""}`}
                              onClick={() => setSelected(e)}
                            >
                              {e.title}
                            </button>
                          </li>
                        ))}
                        {events.length > 3 ? <li className="text-muted-foreground">+{events.length - 3} more</li> : null}
                      </ul>
                    </div>
                  )
                })}
              </div>
            ),
          },
          {
            id: "week",
            label: "Week",
            content: (
              <ul className="space-y-2 text-sm" data-testid="calendar-week">
                {Array.from({ length: 7 }, (_, i) => {
                  const day = new Date(weekStart)
                  day.setDate(weekStart.getDate() + i)
                  const list = activities.filter((a) => new Date(a.startAt).toDateString() === day.toDateString())
                  return (
                    <li key={i} className="rounded border border-border p-2">
                      <p className="font-medium">{day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</p>
                      <ul className="mt-1 space-y-1">
                        {list.map((e) => (
                          <li key={e.id}>
                            <button type="button" className="underline" onClick={() => setSelected(e)}>
                              {new Date(e.startAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · {e.title}
                            </button>
                          </li>
                        ))}
                        {list.length === 0 ? <li className="text-muted-foreground">No events</li> : null}
                      </ul>
                    </li>
                  )
                })}
              </ul>
            ),
          },
          {
            id: "day",
            label: "Day",
            content: (
              <ul className="space-y-2 text-sm" data-testid="calendar-day-view">
                {activities
                  .filter((a) => new Date(a.startAt).toDateString() === cursor.toDateString())
                  .map((e) => (
                    <li key={e.id}>
                      <button type="button" className="underline" onClick={() => setSelected(e)}>
                        {new Date(e.startAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} –{" "}
                        {new Date(e.endAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · {e.title} ({e.status})
                      </button>
                    </li>
                  ))}
              </ul>
            ),
          },
          {
            id: "agenda",
            label: "Agenda",
            content: (
              <ul className="space-y-2 text-sm" data-testid="calendar-agenda">
                {[...activities]
                  .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
                  .map((e) => (
                    <li key={e.id} className="flex justify-between gap-2 border-b border-border py-1">
                      <button type="button" className="text-left underline" onClick={() => setSelected(e)}>
                        {e.title} · {e.activityType}
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {new Date(e.startAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                      </span>
                    </li>
                  ))}
              </ul>
            ),
          },
        ]}
      />

      <Modal open={Boolean(selected)} title={selected?.title ?? "Event"} onClose={() => setSelected(null)}>
        {selected ? (
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4"><dt>Reference</dt><dd>{selected.activityNo}</dd></div>
            <div className="flex justify-between gap-4"><dt>Type</dt><dd>{selected.activityType}</dd></div>
            <div className="flex justify-between gap-4"><dt>Status</dt><dd>{selected.status}</dd></div>
            <div className="flex justify-between gap-4"><dt>Owner</dt><dd>{selected.ownerUsername}</dd></div>
            <div className="flex justify-between gap-4"><dt>Start</dt><dd>{new Date(selected.startAt).toLocaleString("en-IN")}</dd></div>
            <div className="flex justify-between gap-4"><dt>End</dt><dd>{new Date(selected.endAt).toLocaleString("en-IN")}</dd></div>
            <Button asChild size="sm" className="mt-2"><Link to={appPath("activities")}>Open follow-ups</Link></Button>
          </dl>
        ) : null}
      </Modal>
    </div>
  )
}
