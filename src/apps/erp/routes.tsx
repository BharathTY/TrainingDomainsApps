import type { ReactNode } from "react"
import { Route, Routes } from "react-router-dom"
import { appMeta } from "@/apps/meta"
import { MODULES, type ModuleId } from "@/apps/erp/config/permissions"
import { LoginPage } from "@/apps/erp/features/auth/pages/LoginPage"
import { RequireSession } from "@/apps/erp/features/auth/RequireSession"
import { ApprovalsPage } from "@/apps/erp/features/approvals/pages/ApprovalsPage"
import { DashboardPage } from "@/apps/erp/features/dashboard/pages/DashboardPage"
import { JournalsPage } from "@/apps/erp/features/journals/pages/JournalsPage"
import {
  AccountsPage,
  ApPage,
  ArPage,
  AssetsPage,
  AttendancePage,
  AuditPage,
  BankingPage,
  BudgetsPage,
  CustomersPage,
  DepartmentsPage,
  EmployeesPage,
  ExpensesPage,
  InventoryPage,
  ItemsPage,
  LeavesPage,
  OrganizationsPage,
  PayrollPage,
  ProcurementPage,
  RecruitmentPage,
  SalesPage,
  VendorsPage,
  WarehousesPage,
} from "@/apps/erp/features/modules/pages/ModulePages"
import { PracticePage } from "@/apps/erp/features/practice/pages/PracticePage"
import { ReportsPage } from "@/apps/erp/features/reports/pages/ReportsPage"
import { SettingsPage } from "@/apps/erp/features/settings/pages/SettingsPage"
import { WorkflowsPage } from "@/apps/erp/features/workflows/pages/WorkflowsPage"
import { AppNotFound } from "@/shell/AppNotFound"
import { AppProvider } from "@/shared/lib/app-context"

const pages: Record<ModuleId, ReactNode> = {
  dashboard: <DashboardPage />,
  workflows: <WorkflowsPage />,
  organizations: <OrganizationsPage />,
  departments: <DepartmentsPage />,
  employees: <EmployeesPage />,
  attendance: <AttendancePage />,
  leaves: <LeavesPage />,
  payroll: <PayrollPage />,
  recruitment: <RecruitmentPage />,
  accounts: <AccountsPage />,
  journals: <JournalsPage />,
  ap: <ApPage />,
  ar: <ArPage />,
  banking: <BankingPage />,
  budgets: <BudgetsPage />,
  expenses: <ExpensesPage />,
  vendors: <VendorsPage />,
  customers: <CustomersPage />,
  items: <ItemsPage />,
  warehouses: <WarehousesPage />,
  inventory: <InventoryPage />,
  procurement: <ProcurementPage />,
  sales: <SalesPage />,
  assets: <AssetsPage />,
  approvals: <ApprovalsPage />,
  reports: <ReportsPage />,
  audit: <AuditPage />,
  practice: <PracticePage />,
  settings: <SettingsPage />,
}

export default function ErpApp() {
  return (
    <AppProvider app={appMeta("erp")}>
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
