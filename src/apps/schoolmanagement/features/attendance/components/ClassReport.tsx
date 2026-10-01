import { Button } from "@/components/ui/button"
import { monthLabel, type ClassReport as Report } from "@/apps/schoolmanagement/features/attendance/types"
import { cn } from "@/shared/lib/utils"

export function ClassReport({ report, onOpenStudent }: { report: Report; onOpenStudent: (studentId: string) => void }) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Marked days" value={String(report.markedDays)} />
        <Stat label="Attended" value={`${report.attendedPercent}%`} />
        <Stat label="Students" value={String(report.rows.length)} />
      </div>
      {report.days.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {report.days.map((day) => (
            <div key={day.date} className={cn("min-w-16 rounded-md border px-2 py-1.5 text-center", tone(day.percent))}>
              <p className="text-[10px] text-muted-foreground">{Number(day.date.slice(8))}</p>
              <p className="text-sm font-medium">{day.percent}%</p>
              <p className="text-[10px] text-muted-foreground">
                {day.present}P {day.late}L {day.absent}A
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No days marked in {monthLabel(report.month)}.</p>
      )}
      <ul className="grid gap-2">
        {report.rows.map((row) => (
          <li key={row.studentId}>
            <Button type="button" variant="outline" className="h-auto w-full justify-between px-3 py-2 text-left" onClick={() => onOpenStudent(row.studentId)}>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{row.name}</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {row.present} present · {row.late} late · {row.absent} absent
                </span>
              </span>
              <span className="shrink-0 text-sm">{row.percent}%</span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

function tone(percent: number) {
  if (percent >= 90) return "border-emerald-600/40 bg-emerald-500/10"
  if (percent >= 75) return "border-amber-500/40 bg-amber-500/10"
  return "border-destructive/40 bg-destructive/10"
}
