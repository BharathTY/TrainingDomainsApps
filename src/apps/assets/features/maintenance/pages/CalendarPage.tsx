import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/apps/assets/components/PageHeader"
import { asRows, loadPaged } from "@/apps/assets/features/catalog/api"
import { Button } from "@/components/ui/button"

type Wo = { id: string; workOrderNo: string; asset: string; scheduledAt: string; status: string; priority: string }

export function CalendarPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [selected, setSelected] = useState(() => new Date().toISOString().slice(0, 10))
  const list = useQuery({
    queryKey: ["assets", "work-orders", "calendar"],
    queryFn: () => loadPaged<Wo>("/api/work-orders", { page: 1, pageSize: 100 }),
  })
  const rows = asRows(list.data ?? [])
  const byDate = useMemo(() => {
    const map = new Map<string, Wo[]>()
    for (const row of rows) {
      if (!row.scheduledAt) continue
      const key = String(row.scheduledAt).slice(0, 10)
      const bucket = map.get(key) ?? []
      bucket.push(row)
      map.set(key, bucket)
    }
    return map
  }, [rows])

  const days = useMemo(() => {
    const [, m] = month.split("-").map(Number)
    const y = Number(month.slice(0, 4))
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return Array.from({ length: count }, (_, i) => {
      const day = String(i + 1).padStart(2, "0")
      return `${month}-${day}`
    })
  }, [month])

  const dayItems = byDate.get(selected) ?? []

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Maintenance calendar" description="Month navigation with scheduled work orders." />
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm" htmlFor="cal-month">
          Month
          <input
            id="cal-month"
            type="month"
            className="ml-2 h-9 rounded-md border border-input px-2 text-sm"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const d = new Date(`${month}-01T00:00:00`)
            d.setMonth(d.getMonth() - 1)
            setMonth(d.toISOString().slice(0, 7))
          }}
        >
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const d = new Date(`${month}-01T00:00:00`)
            d.setMonth(d.getMonth() + 1)
            setMonth(d.toISOString().slice(0, 7))
          }}
        >
          Next
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1" data-testid="calendar-view" role="grid" aria-label="Maintenance month">
        {days.map((iso) => {
          const count = byDate.get(iso)?.length ?? 0
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              aria-selected={iso === selected}
              data-date={iso}
              className={`min-h-16 rounded border p-1 text-left text-xs ${iso === selected ? "border-primary bg-accent" : "border-border"}`}
              onClick={() => setSelected(iso)}
            >
              <span className="font-semibold">{iso.slice(8)}</span>
              {count ? <span className="mt-1 block text-muted-foreground">{count} WO</span> : null}
            </button>
          )
        })}
      </div>
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">
          Work orders on <time dateTime={selected}>{selected}</time>
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {dayItems.length === 0 ? <li className="text-muted-foreground">No scheduled work orders.</li> : null}
          {dayItems.map((row) => (
            <li key={row.id} data-wo-id={row.id}>
              <strong>{row.workOrderNo}</strong> — {row.asset} ({row.status}, {row.priority})
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
