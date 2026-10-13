import type { ReactNode } from "react"
import { Route, Routes } from "react-router-dom"
import { appMeta } from "@/apps/meta"
import { MODULES, type ModuleId } from "@/apps/inventory/config/permissions"
import { LoginPage } from "@/apps/inventory/features/auth/pages/LoginPage"
import { RequireSession } from "@/apps/inventory/features/auth/RequireSession"
import { AdjustmentsPage } from "@/apps/inventory/features/adjustments/pages/AdjustmentsPage"
import { CalendarPage } from "@/apps/inventory/features/calendar/pages/CalendarPage"
import { CategoriesPage } from "@/apps/inventory/features/categories/pages/CategoriesPage"
import { CountsPage } from "@/apps/inventory/features/counts/pages/CountsPage"
import { DashboardPage } from "@/apps/inventory/features/dashboard/pages/DashboardPage"
import { GrnPage, PickItemPage } from "@/apps/inventory/features/grn/pages/GrnPage"
import { IssuesPage } from "@/apps/inventory/features/issues/pages/IssuesPage"
import { ItemDetailPage, LabelPage } from "@/apps/inventory/features/items/pages/ItemDetailPage"
import { ItemsPage } from "@/apps/inventory/features/items/pages/ItemsPage"
import { OrdersPage } from "@/apps/inventory/features/orders/pages/OrdersPage"
import { PracticePage } from "@/apps/inventory/features/practice/pages/PracticePage"
import { ReportsPage } from "@/apps/inventory/features/reports/pages/ReportsPage"
import { SettingsPage } from "@/apps/inventory/features/settings/pages/SettingsPage"
import { SuppliersPage } from "@/apps/inventory/features/suppliers/pages/SuppliersPage"
import { TransfersPage } from "@/apps/inventory/features/transfers/pages/TransfersPage"
import { WarehousesPage } from "@/apps/inventory/features/warehouses/pages/WarehousesPage"
import { AppNotFound } from "@/shell/AppNotFound"
import { AppProvider } from "@/shared/lib/app-context"

const pages: Record<ModuleId, ReactNode> = {
  dashboard: <DashboardPage />,
  items: <ItemsPage />,
  categories: <CategoriesPage />,
  suppliers: <SuppliersPage />,
  warehouses: <WarehousesPage />,
  grn: <GrnPage />,
  issues: <IssuesPage />,
  transfers: <TransfersPage />,
  adjustments: <AdjustmentsPage />,
  orders: <OrdersPage />,
  counts: <CountsPage />,
  calendar: <CalendarPage />,
  reports: <ReportsPage />,
  practice: <PracticePage />,
  settings: <SettingsPage />,
}

export default function InventoryApp() {
  return (
    <AppProvider app={appMeta("inventory")}>
      <Routes>
        <Route index element={<LoginPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireSession />}>
          {MODULES.map((module) => (
            <Route key={module.id} path={module.path} element={pages[module.id]} />
          ))}
          <Route path="items/:itemId/label" element={<LabelPage />} />
          <Route path="items/:itemId" element={<ItemDetailPage />} />
          <Route path="pick-item" element={<PickItemPage />} />
          <Route path="*" element={<AppNotFound />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
