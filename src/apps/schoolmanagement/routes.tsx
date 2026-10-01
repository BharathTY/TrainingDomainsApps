import type { ReactNode } from "react"
import { Route, Routes } from "react-router-dom"
import { appMeta } from "@/apps/meta"
import { MODULES, type ModuleId } from "@/apps/schoolmanagement/config/permissions"
import { LoginPage } from "@/apps/schoolmanagement/features/auth/pages/LoginPage"
import { RequireSession } from "@/apps/schoolmanagement/features/auth/RequireSession"
import { AcademicsPage } from "@/apps/schoolmanagement/features/academics/pages/AcademicsPage"
import { AdmissionsPage } from "@/apps/schoolmanagement/features/admissions/pages/AdmissionsPage"
import { AttendancePage } from "@/apps/schoolmanagement/features/attendance/pages/AttendancePage"
import { CalendarPage } from "@/apps/schoolmanagement/features/calendar/pages/CalendarPage"
import { CertificatesPage } from "@/apps/schoolmanagement/features/certificates/pages/CertificatesPage"
import { ClassesPage } from "@/apps/schoolmanagement/features/classes/pages/ClassesPage"
import { CommunicationPage } from "@/apps/schoolmanagement/features/communication/pages/CommunicationPage"
import { DashboardPage } from "@/apps/schoolmanagement/features/dashboard/pages/DashboardPage"
import { ExamsPage } from "@/apps/schoolmanagement/features/exams/pages/ExamsPage"
import { FeesPage } from "@/apps/schoolmanagement/features/fees/pages/FeesPage"
import { HealthPage } from "@/apps/schoolmanagement/features/health/pages/HealthPage"
import { HostelPage } from "@/apps/schoolmanagement/features/hostel/pages/HostelPage"
import { LibraryPage } from "@/apps/schoolmanagement/features/library/pages/LibraryPage"
import { ParentsPage } from "@/apps/schoolmanagement/features/parents/pages/ParentsPage"
import { PromotionPage } from "@/apps/schoolmanagement/features/promotion/pages/PromotionPage"
import { ReportsPage } from "@/apps/schoolmanagement/features/reports/pages/ReportsPage"
import { SettingsPage } from "@/apps/schoolmanagement/features/settings/pages/SettingsPage"
import { StaffPage } from "@/apps/schoolmanagement/features/staff/pages/StaffPage"
import { StudentsPage } from "@/apps/schoolmanagement/features/students/pages/StudentsPage"
import { TimetablePage } from "@/apps/schoolmanagement/features/timetable/pages/TimetablePage"
import { TransportPage } from "@/apps/schoolmanagement/features/transport/pages/TransportPage"
import { VisitorsPage } from "@/apps/schoolmanagement/features/visitors/pages/VisitorsPage"
import { AppNotFound } from "@/shell/AppNotFound"
import { AppProvider } from "@/shared/lib/app-context"

const pages: Record<ModuleId, ReactNode> = {
  dashboard: <DashboardPage />,
  admissions: <AdmissionsPage />,
  students: <StudentsPage />,
  staff: <StaffPage />,
  parents: <ParentsPage />,
  classes: <ClassesPage />,
  attendance: <AttendancePage />,
  timetable: <TimetablePage />,
  academics: <AcademicsPage />,
  exams: <ExamsPage />,
  calendar: <CalendarPage />,
  fees: <FeesPage />,
  library: <LibraryPage />,
  transport: <TransportPage />,
  hostel: <HostelPage />,
  certificates: <CertificatesPage />,
  promotion: <PromotionPage />,
  communication: <CommunicationPage />,
  visitors: <VisitorsPage />,
  health: <HealthPage />,
  reports: <ReportsPage />,
  settings: <SettingsPage />,
}

export default function SchoolManagementApp() {
  return (
    <AppProvider app={appMeta("schoolmanagement")}>
      <Routes>
        <Route index element={<LoginPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireSession />}>
          {MODULES.map((module) => (
            <Route key={module.id} path={module.path} element={pages[module.id]} />
          ))}
          <Route path="*" element={<AppNotFound />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
