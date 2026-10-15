import type { ReactNode } from "react"
import { Route, Routes } from "react-router-dom"
import { appMeta } from "@/apps/meta"
import { MODULES, type ModuleId } from "@/apps/retail/config/permissions"
import { LoginPage } from "@/apps/retail/features/auth/pages/LoginPage"
import { RequireSession } from "@/apps/retail/features/auth/RequireSession"
import { CustomersPage } from "@/apps/retail/features/customers/pages/CustomersPage"
import { DashboardPage } from "@/apps/retail/features/dashboard/pages/DashboardPage"
import { InventoryPage } from "@/apps/retail/features/inventory/pages/InventoryPage"
import { PosPage } from "@/apps/retail/features/pos/pages/PosPage"
import { PracticePage } from "@/apps/retail/features/practice/pages/PracticePage"
import { ProductDetailPage } from "@/apps/retail/features/products/pages/ProductDetailPage"
import { ProductsPage } from "@/apps/retail/features/products/pages/ProductsPage"
import { PromotionsPage } from "@/apps/retail/features/promotions/pages/PromotionsPage"
import { PurchasesPage } from "@/apps/retail/features/purchases/pages/PurchasesPage"
import { ReportsPage } from "@/apps/retail/features/reports/pages/ReportsPage"
import { SalesPage } from "@/apps/retail/features/sales/pages/SalesPage"
import { SettingsPage } from "@/apps/retail/features/settings/pages/SettingsPage"
import { SuppliersPage } from "@/apps/retail/features/suppliers/pages/SuppliersPage"
import { AppNotFound } from "@/shell/AppNotFound"
import { AppProvider } from "@/shared/lib/app-context"

const pages: Record<ModuleId, ReactNode> = {
  dashboard: <DashboardPage />,
  pos: <PosPage />,
  products: <ProductsPage />,
  inventory: <InventoryPage />,
  suppliers: <SuppliersPage />,
  purchases: <PurchasesPage />,
  sales: <SalesPage />,
  promotions: <PromotionsPage />,
  customers: <CustomersPage />,
  reports: <ReportsPage />,
  practice: <PracticePage />,
  settings: <SettingsPage />,
}

export default function RetailApp() {
  return (
    <AppProvider app={appMeta("retail")}>
      <Routes>
        <Route index element={<LoginPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireSession />}>
          {MODULES.map((module) => (
            <Route key={module.id} path={module.path} element={pages[module.id]} />
          ))}
          <Route path="products/:productId" element={<ProductDetailPage />} />
          <Route path="*" element={<AppNotFound />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
