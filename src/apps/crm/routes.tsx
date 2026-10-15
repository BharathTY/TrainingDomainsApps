import type { ReactNode } from "react"
import { Route, Routes } from "react-router-dom"
import { appMeta } from "@/apps/meta"
import { MODULES, type ModuleId } from "@/apps/crm/config/permissions"
import { LoginPage } from "@/apps/crm/features/auth/pages/LoginPage"
import { RequireSession } from "@/apps/crm/features/auth/RequireSession"
import { ActivitiesPage } from "@/apps/crm/features/activities/pages/ActivitiesPage"
import { CalendarPage } from "@/apps/crm/features/calendar/pages/CalendarPage"
import { ContactDetailPage } from "@/apps/crm/features/contacts/pages/ContactDetailPage"
import { ContactsPage } from "@/apps/crm/features/contacts/pages/ContactsPage"
import { DashboardPage } from "@/apps/crm/features/dashboard/pages/DashboardPage"
import { LeadDetailPage } from "@/apps/crm/features/leads/pages/LeadDetailPage"
import { LeadsPage } from "@/apps/crm/features/leads/pages/LeadsPage"
import { PipelinePage } from "@/apps/crm/features/pipeline/pages/PipelinePage"
import { PracticePage } from "@/apps/crm/features/practice/pages/PracticePage"
import { ReportsPage } from "@/apps/crm/features/reports/pages/ReportsPage"
import { SettingsPage } from "@/apps/crm/features/settings/pages/SettingsPage"
import { AppNotFound } from "@/shell/AppNotFound"
import { AppProvider } from "@/shared/lib/app-context"

const pages: Record<ModuleId, ReactNode> = {
  dashboard: <DashboardPage />,
  leads: <LeadsPage />,
  contacts: <ContactsPage />,
  activities: <ActivitiesPage />,
  calendar: <CalendarPage />,
  pipeline: <PipelinePage />,
  reports: <ReportsPage />,
  practice: <PracticePage />,
  settings: <SettingsPage />,
}

export default function CrmApp() {
  return (
    <AppProvider app={appMeta("crm")}>
      <Routes>
        <Route index element={<LoginPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireSession />}>
          {MODULES.map((module) => (
            <Route key={module.id} path={module.path} element={pages[module.id]} />
          ))}
          <Route path="leads/:leadId" element={<LeadDetailPage />} />
          <Route path="contacts/:contactId" element={<ContactDetailPage />} />
          <Route path="*" element={<AppNotFound />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
