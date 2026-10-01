import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { EmptyState } from "@/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { Role } from "@/apps/schoolmanagement/config/permissions"
import { examKeys, fetchMarks, fetchOwnReport, fetchReport } from "@/apps/schoolmanagement/features/exams/api"
import { downloadReportPdf } from "@/apps/schoolmanagement/features/exams/pdf"
import type { ReportCard } from "@/apps/schoolmanagement/features/exams/types"
import { SECTIONS, type Section } from "@/apps/schoolmanagement/features/students/types"

export function ReportCardPanel({
  examId,
  className,
  role,
  personal,
  canExport,
}: {
  examId: string
  className: string
  role: Role
  personal: boolean
  canExport: boolean
}) {
  const [section, setSection] = useState<Section>("A")
  const [studentId, setStudentId] = useState("")
  const roll = useQuery({
    queryKey: examKeys.marks(examId, section),
    queryFn: () => fetchMarks(examId, section),
    enabled: !personal,
  })
  const students = roll.data?.rows ?? []
  const selectedId = students.some((student) => student.studentId === studentId) ? studentId : (students[0]?.studentId ?? "")
  const own = useQuery({
    queryKey: examKeys.ownReport(role, examId),
    queryFn: () => fetchOwnReport(examId, role),
    enabled: personal,
  })
  const staff = useQuery({
    queryKey: examKeys.report(examId, selectedId),
    queryFn: () => fetchReport(examId, selectedId),
    enabled: !personal && selectedId.length > 0,
  })
  const card = personal ? own.data : staff.data
  const loading = personal ? own.isLoading : roll.isLoading || staff.isLoading
  const failed = personal ? own.isError : roll.isError || staff.isError

  return (
    <div className="grid gap-3">
      {personal ? null : (
        <div className="grid gap-3 sm:grid-cols-2" data-print-hide>
          <div className="grid gap-1.5">
            <Label>
              Section<span className="text-destructive"> *</span>
            </Label>
            <Select value={section} onValueChange={(value) => setSection(value as Section)}>
              <SelectTrigger aria-label="Section" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>
              Student<span className="text-destructive"> *</span>
            </Label>
            <Select value={selectedId || undefined} onValueChange={setStudentId} disabled={students.length === 0}>
              <SelectTrigger aria-label="Student" className="h-10">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.studentId} value={student.studentId}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      {loading ? <Skeleton className="h-64 w-full" /> : null}
      {failed ? (
        <EmptyState
          title="Could not load the report card"
          description="The card did not load."
          actionLabel="Retry"
          onAction={() => {
            if (personal) void own.refetch()
            else {
              void roll.refetch()
              void staff.refetch()
            }
          }}
        />
      ) : null}
      {!personal && roll.data && students.length === 0 ? <EmptyState title="No students" description={`Class ${className}-${section} has no active students.`} /> : null}
      {card ? <ReportSheet card={card} canExport={canExport} /> : null}
    </div>
  )
}

function ReportSheet({ card, canExport }: { card: ReportCard; canExport: boolean }) {
  return (
    <article data-report-card className="mx-auto grid w-full max-w-3xl gap-4 rounded-md border border-border bg-background p-4 print:border-0 print:p-0">
      <header className="grid gap-1">
        <p className="text-lg font-semibold">{card.school}</p>
        <h2 className="text-base font-medium">Report card</h2>
        <p className="text-sm text-muted-foreground">
          {card.examName} · {card.term}
        </p>
        <p className="text-sm">
          {card.name} · {card.admissionNo}
        </p>
        <p className="text-sm">
          Class {card.className}-{card.section}
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-2 font-medium">Subject</th>
              <th className="py-2 pr-2 font-medium">Date</th>
              <th className="py-2 pr-2 font-medium">Marks</th>
              <th className="py-2 pr-2 font-medium">Max</th>
              <th className="py-2 pr-2 font-medium">%</th>
              <th className="py-2 font-medium">Grade</th>
            </tr>
          </thead>
          <tbody>
            {card.rows.map((row) => (
              <tr key={row.subject} className="border-b border-border">
                <td className="py-2 pr-2">{row.subject}</td>
                <td className="py-2 pr-2">{row.date}</td>
                <td className="py-2 pr-2 tabular-nums">{row.score ?? "—"}</td>
                <td className="py-2 pr-2 tabular-nums">{row.max}</td>
                <td className="py-2 pr-2 tabular-nums">{row.percent ?? "—"}</td>
                <td className="py-2">{row.grade}</td>
              </tr>
            ))}
            <tr>
              <td className="py-2 pr-2 font-medium">Total</td>
              <td />
              <td className="py-2 pr-2 font-medium tabular-nums">{card.total}</td>
              <td className="py-2 pr-2 font-medium tabular-nums">{card.totalMax}</td>
              <td className="py-2 pr-2 font-medium tabular-nums">{card.percent ?? "—"}</td>
              <td className="py-2 font-medium">{card.grade}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex gap-2" data-print-hide>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          Print
        </Button>
        {canExport ? (
          <Button type="button" onClick={() => void downloadReportPdf(card)}>
            Download PDF
          </Button>
        ) : null}
      </div>
    </article>
  )
}
