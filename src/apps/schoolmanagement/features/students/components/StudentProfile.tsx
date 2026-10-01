import { Badge } from "@/components/ui/badge"
import { DetailTabs } from "@/apps/schoolmanagement/components/DetailTabs"
import { MonthHeatmap } from "@/apps/schoolmanagement/features/attendance/components/MonthHeatmap"
import { SCHOOL_MONTH, attendedPercent } from "@/apps/schoolmanagement/features/attendance/types"
import { formatInr } from "@/apps/schoolmanagement/features/dashboard/format"
import type { Student } from "@/apps/schoolmanagement/features/students/types"

const GENDER_LABEL = { female: "Female", male: "Male", other: "Other" } as const

export function StudentProfile({ student }: { student: Student }) {
  const present = student.attendance.filter((day) => day.status === "present").length
  const late = student.attendance.filter((day) => day.status === "late").length
  const absent = student.attendance.filter((day) => day.status === "absent").length
  const month = student.attendance.at(-1)?.date.slice(0, 7) ?? SCHOOL_MONTH
  return (
    <DetailTabs
      title={`${student.firstName} ${student.lastName}`}
      subtitle={`${student.admissionNo} · Class ${student.className}-${student.section}`}
      tabs={[
        {
          value: "overview",
          label: "Overview",
          content: (
            <Facts
              rows={[
                ["Gender", GENDER_LABEL[student.gender]],
                ["Date of birth", student.dateOfBirth || "—"],
                ["Blood group", student.bloodGroup || "—"],
                ["Status", student.status],
                ["Address", student.address || "—"],
                ["Previous school", `${student.previousSchool.name} · ${student.previousSchool.board}`],
              ]}
            />
          ),
        },
        {
          value: "academics",
          label: "Academics",
          content: (
            <ul className="divide-y divide-border text-sm">
              {student.academics.map((mark) => (
                <li key={mark.subject} className="flex justify-between gap-3 py-2">
                  <span>{mark.subject}</span>
                  <span className="text-muted-foreground">
                    {mark.score}/{mark.max}
                  </span>
                </li>
              ))}
            </ul>
          ),
        },
        {
          value: "attendance",
          label: "Attendance",
          content: (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                {present} present · {late} late · {absent} absent · {attendedPercent(present, late, absent)}% attended
              </p>
              {student.attendance.length === 0 ? <p className="text-sm text-muted-foreground">No attendance yet.</p> : <MonthHeatmap month={month} days={student.attendance} />}
            </div>
          ),
        },
        {
          value: "fees",
          label: "Fees",
          content: (
            <ul className="divide-y divide-border text-sm">
              {student.fees.map((fee) => (
                <li key={fee.term} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p>{fee.term}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatInr(fee.paid)} of {formatInr(fee.amount)}
                    </p>
                  </div>
                  <Badge className="capitalize">{fee.status}</Badge>
                </li>
              ))}
            </ul>
          ),
        },
        {
          value: "documents",
          label: "Documents",
          content: (
            <ul className="divide-y divide-border text-sm">
              {student.documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-3 py-2">
                  <span>{document.name}</span>
                  <Badge className="capitalize">{document.status}</Badge>
                </li>
              ))}
            </ul>
          ),
        },
        {
          value: "parents",
          label: "Parents",
          content: (
            <ul className="divide-y divide-border">
              {student.parents.map((parent) => (
                <li key={parent.relation} className="grid gap-0.5 py-2 text-sm">
                  <p className="font-medium">
                    {parent.relation} · {parent.name}
                  </p>
                  <p className="text-muted-foreground">{parent.phone || "No mobile"}{parent.occupation ? ` · ${parent.occupation}` : ""}</p>
                </li>
              ))}
            </ul>
          ),
        },
      ]}
    />
  )
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-border text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 py-2">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right capitalize">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
