import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Role } from "@/apps/schoolmanagement/config/permissions"
import { MarksGrid } from "@/apps/schoolmanagement/features/exams/components/MarksGrid"
import { ReportCardPanel } from "@/apps/schoolmanagement/features/exams/components/ReportCardPanel"
import { ScheduleList } from "@/apps/schoolmanagement/features/exams/components/ScheduleList"
import type { Exam } from "@/apps/schoolmanagement/features/exams/types"

export function ExamWorkspace({
  exam,
  role,
  canCreate,
  canEdit,
  canDelete,
  canExport,
  onBack,
}: {
  exam: Exam
  role: Role
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canExport: boolean
  onBack: () => void
}) {
  const [tab, setTab] = useState("schedule")
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2" data-print-hide>
        <div>
          <h2 className="text-base font-semibold">
            {exam.name} · Class {exam.className}
          </h2>
          <p className="text-sm text-muted-foreground">
            {exam.term} · {exam.startDate} to {exam.endDate}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onBack}>
          All exams
        </Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3" data-print-hide>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="marks">Marks</TabsTrigger>
          <TabsTrigger value="report">Report card</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule">
          <ScheduleList examId={exam.id} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />
        </TabsContent>
        <TabsContent value="marks">
          <MarksGrid examId={exam.id} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="report">
          <ReportCardPanel examId={exam.id} className={exam.className} role={role} personal={false} canExport={canExport} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
