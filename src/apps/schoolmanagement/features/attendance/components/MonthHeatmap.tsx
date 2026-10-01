import { SCHOOL_TODAY, monthLabel, type MarkStatus, type MonthDay } from "@/apps/schoolmanagement/features/attendance/types"
import { cn } from "@/shared/lib/utils"

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

const FILL: Record<MarkStatus, string> = {
  present: "bg-emerald-500 text-white",
  late: "bg-amber-500 text-white",
  absent: "bg-destructive text-destructive-foreground",
}

export function MonthHeatmap({ month, days }: { month: string; days: MonthDay[] }) {
  const [year, index] = month.split("-").map(Number)
  const count = year && index ? new Date(Date.UTC(year, index, 0)).getUTCDate() : 0
  const lead = year && index ? new Date(Date.UTC(year, index - 1, 1)).getUTCDay() : 0
  const byDate = new Map(days.map((day) => [day.date, day.status]))
  const cells = Array.from({ length: count }, (_, offset) => {
    const day = offset + 1
    const date = `${month}-${String(day).padStart(2, "0")}`
    const weekday = new Date(Date.UTC(year, (index ?? 1) - 1, day)).getUTCDay()
    return { date, day, weekday, status: byDate.get(date) ?? null }
  })

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground" aria-hidden>
        {WEEKDAYS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Attendance for ${monthLabel(month)}`}>
        {Array.from({ length: lead }, (_, offset) => (
          <div key={`lead-${offset}`} />
        ))}
        {cells.map((cell) => (
          <div
            key={cell.date}
            role="gridcell"
            aria-label={cellLabel(cell.date, cell.weekday, cell.status)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-sm text-xs",
              cell.status ? FILL[cell.status] : cell.weekday === 0 ? "bg-muted text-muted-foreground" : "border border-dashed border-border text-muted-foreground",
              cell.date === SCHOOL_TODAY && "ring-2 ring-ring",
            )}
          >
            {cell.day}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <Swatch className="bg-emerald-500" label="Present" />
        <Swatch className="bg-amber-500" label="Late" />
        <Swatch className="bg-destructive" label="Absent" />
        <Swatch className="border border-dashed border-border" label="Not marked" />
        <Swatch className="bg-muted" label="Sunday" />
      </div>
    </div>
  )
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm", className)} />
      {label}
    </span>
  )
}

function cellLabel(date: string, weekday: number, status: MarkStatus | null) {
  if (status) return `${date} ${status}`
  if (weekday === 0) return `${date} Sunday`
  return `${date} not marked`
}
