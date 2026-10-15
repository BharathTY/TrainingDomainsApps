import type { ReactNode } from "react"
import { Route, Routes } from "react-router-dom"
import { appMeta } from "@/apps/meta"
import { MODULES, type ModuleId } from "@/apps/hospital/config/permissions"
import { LoginPage } from "@/apps/hospital/features/auth/pages/LoginPage"
import { RequireSession } from "@/apps/hospital/features/auth/RequireSession"
import { AdmissionsPage } from "@/apps/hospital/features/admissions/pages/AdmissionsPage"
import { AppointmentsPage } from "@/apps/hospital/features/appointments/pages/AppointmentsPage"
import { CalendarPage } from "@/apps/hospital/features/appointments/pages/CalendarPage"
import { BillingPage } from "@/apps/hospital/features/billing/pages/BillingPage"
import { DashboardPage } from "@/apps/hospital/features/dashboard/pages/DashboardPage"
import { DoctorDetailPage } from "@/apps/hospital/features/doctors/pages/DoctorDetailPage"
import { DoctorsPage } from "@/apps/hospital/features/doctors/pages/DoctorsPage"
import { PatientDetailPage } from "@/apps/hospital/features/patients/pages/PatientDetailPage"
import { PatientsPage } from "@/apps/hospital/features/patients/pages/PatientsPage"
import { PracticePage } from "@/apps/hospital/features/practice/pages/PracticePage"
import { ReportsPage } from "@/apps/hospital/features/reports/pages/ReportsPage"
import { SettingsPage } from "@/apps/hospital/features/settings/pages/SettingsPage"
import { StaffPage } from "@/apps/hospital/features/staff/pages/StaffPage"
import { WardsPage } from "@/apps/hospital/features/wards/pages/WardsPage"
import { AppNotFound } from "@/shell/AppNotFound"
import { AppProvider } from "@/shared/lib/app-context"

const pages: Record<ModuleId, ReactNode> = {
  dashboard: <DashboardPage />,
  doctors: <DoctorsPage />,
  patients: <PatientsPage />,
  wards: <WardsPage />,
  appointments: <AppointmentsPage />,
  calendar: <CalendarPage />,
  admissions: <AdmissionsPage />,
  staff: <StaffPage />,
  billing: <BillingPage />,
  reports: <ReportsPage />,
  practice: <PracticePage />,
  settings: <SettingsPage />,
}

export default function HospitalApp() {
  return (
    <AppProvider app={appMeta("hospital")}>
      <Routes>
        <Route index element={<LoginPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireSession />}>
          {MODULES.map((module) => (
            <Route key={module.id} path={module.path} element={pages[module.id]} />
          ))}
          <Route path="doctors/:doctorId" element={<DoctorDetailPage />} />
          <Route path="patients/:patientId" element={<PatientDetailPage />} />
          <Route path="*" element={<AppNotFound />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
