import type { ReactNode } from "react"
import { Route, Routes } from "react-router-dom"
import { appMeta } from "@/apps/meta"
import { MODULES, type ModuleId } from "@/apps/assets/config/permissions"
import { LoginPage } from "@/apps/assets/features/auth/pages/LoginPage"
import { RequireSession } from "@/apps/assets/features/auth/RequireSession"
import { AssignmentsPage } from "@/apps/assets/features/assignments/pages/AssignmentsPage"
import { CategoriesPage } from "@/apps/assets/features/categories/pages/CategoriesPage"
import { DashboardPage } from "@/apps/assets/features/dashboard/pages/DashboardPage"
import { CalendarPage } from "@/apps/assets/features/maintenance/pages/CalendarPage"
import { MaintenancePage } from "@/apps/assets/features/maintenance/pages/MaintenancePage"
import { PracticePage } from "@/apps/assets/features/practice/pages/PracticePage"
import { AssetDetailPage } from "@/apps/assets/features/register/pages/AssetDetailPage"
import { AssetsPage } from "@/apps/assets/features/register/pages/AssetsPage"
import { ReportsPage } from "@/apps/assets/features/reports/pages/ReportsPage"
import { SettingsPage } from "@/apps/assets/features/settings/pages/SettingsPage"
import { VendorsPage } from "@/apps/assets/features/vendors/pages/VendorsPage"
import { AppNotFound } from "@/shell/AppNotFound"
import { AppProvider } from "@/shared/lib/app-context"

const pages: Record<ModuleId, ReactNode> = {
  dashboard: <DashboardPage />,
  assets: <AssetsPage />,
  categories: <CategoriesPage />,
  assignments: <AssignmentsPage />,
  maintenance: <MaintenancePage />,
  calendar: <CalendarPage />,
  vendors: <VendorsPage />,
  reports: <ReportsPage />,
  practice: <PracticePage />,
  settings: <SettingsPage />,
}

export default function AssetsApp() {
  return (
    <AppProvider app={appMeta("assets")}>
      <Routes>
        <Route index element={<LoginPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireSession />}>
          {MODULES.map((module) => (
            <Route key={module.id} path={module.path} element={pages[module.id]} />
          ))}
          <Route path="assets/:assetId" element={<AssetDetailPage />} />
          <Route path="*" element={<AppNotFound />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
