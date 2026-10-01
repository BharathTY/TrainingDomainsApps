import { todayIst } from "@/shared/lib/dates"

export function CalendarView({ month = todayIst().slice(0, 7) }: { month?: string }) {
  const [year, monthIndex] = month.split("-").map(Number)
  const first = new Date(Date.UTC(year, (monthIndex ?? 1) - 1, 1))
  const days = new Date(Date.UTC(year, monthIndex ?? 1, 0)).getUTCDate()
  const cells = Array.from({ length: days }, (_, index) => index + 1)
  return (
    <div data-testid="calendar-view">
      <h2 className="mb-2 text-sm font-semibold">{month}</h2>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {cells.map((day) => (
          <span key={day} data-testid={`calendar-day-${day}`} className="rounded border border-border py-2">
            {day}
          </span>
        ))}
      </div>
      <p className="sr-only">{first.toISOString()}</p>
    </div>
  )
}
