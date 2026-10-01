import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { NEXT_MARK, type RegisterStudent } from "@/apps/schoolmanagement/features/attendance/types"
import { cn } from "@/shared/lib/utils"

const STATUS_CLASS = {
  present: "border-emerald-600/40 bg-emerald-500/15",
  absent: "border-destructive/40 bg-destructive/10",
  late: "border-amber-500/50 bg-amber-500/15",
} as const

export function RegisterList({
  scope,
  server,
  canMark,
  saving,
  onSave,
}: {
  scope: string
  server: RegisterStudent[]
  canMark: boolean
  saving: boolean
  onSave: (students: RegisterStudent[]) => Promise<unknown>
}) {
  const [edit, setEdit] = useState<{ scope: string; students: RegisterStudent[] } | null>(null)
  const students = edit?.scope === scope ? edit.students : server
  const dirty = signature(students) !== signature(server) || students.some((student) => !student.recorded)

  function cycle(id: string) {
    if (!canMark) return
    setEdit({
      scope,
      students: students.map((student) => (student.id === id ? { ...student, status: NEXT_MARK[student.status] } : student)),
    })
  }

  const present = students.filter((student) => student.status === "present").length
  const absent = students.filter((student) => student.status === "absent").length
  const late = students.filter((student) => student.status === "late").length

  return (
    <div className={cn("grid gap-2", canMark && students.length > 0 && "pb-24")}>
      {students.map((student) => (
        <Button
          key={student.id}
          type="button"
          variant="outline"
          className={cn("h-auto min-h-14 w-full justify-between px-3 py-2 text-left", STATUS_CLASS[student.status])}
          onClick={() => cycle(student.id)}
          aria-label={`${student.name}, ${student.status}. ${canMark ? `Tap to mark ${NEXT_MARK[student.status]}` : ""}`}
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{student.name}</span>
            <span className="block text-xs font-normal text-muted-foreground">{student.admissionNo}</span>
          </span>
          <span className="shrink-0 text-sm capitalize">{student.status}</span>
        </Button>
      ))}
      {canMark && students.length > 0 ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6"
        >
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
            <p className="text-sm">
              {present} present · {absent} absent · {late} late
            </p>
            <Button
              type="button"
              disabled={!dirty || saving}
              onClick={() => {
                void onSave(students)
                  .then(() => {
                    setEdit(null)
                    toast("Attendance saved")
                  })
                  .catch(() => undefined)
              }}
            >
              {saving ? "Saving…" : "Save register"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function RegisterSkeleton() {
  return (
    <div className="grid gap-2">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  )
}

function signature(students: RegisterStudent[]) {
  return students.map((student) => `${student.id}:${student.status}`).join(",")
}
