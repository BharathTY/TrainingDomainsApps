import type { ReactNode } from "react"
import { Route, Routes } from "react-router-dom"
import { appMeta } from "@/apps/meta"
import { MODULES, type ModuleId } from "@/apps/banking/config/permissions"
import { LoginPage } from "@/apps/banking/features/auth/pages/LoginPage"
import { RequireSession } from "@/apps/banking/features/auth/RequireSession"
import { AccountDetailPage } from "@/apps/banking/features/accounts/pages/AccountDetailPage"
import { AccountsPage } from "@/apps/banking/features/accounts/pages/AccountsPage"
import { BeneficiariesPage } from "@/apps/banking/features/beneficiaries/pages/BeneficiariesPage"
import { DashboardPage } from "@/apps/banking/features/dashboard/pages/DashboardPage"
import { PracticePage } from "@/apps/banking/features/practice/pages/PracticePage"
import { ProfilePage } from "@/apps/banking/features/profile/pages/ProfilePage"
import { ScheduledPage } from "@/apps/banking/features/scheduled/pages/ScheduledPage"
import { SettingsPage } from "@/apps/banking/features/settings/pages/SettingsPage"
import { StatementPrintPage } from "@/apps/banking/features/statements/pages/StatementPrintPage"
import { StatementsPage } from "@/apps/banking/features/statements/pages/StatementsPage"
import { TransferReceiptPage } from "@/apps/banking/features/transfers/pages/TransferReceiptPage"
import { TransfersPage } from "@/apps/banking/features/transfers/pages/TransfersPage"
import { AppNotFound } from "@/shell/AppNotFound"
import { AppProvider } from "@/shared/lib/app-context"

const pages: Record<ModuleId, ReactNode> = {
  dashboard: <DashboardPage />,
  accounts: <AccountsPage />,
  transfers: <TransfersPage />,
  statements: <StatementsPage />,
  beneficiaries: <BeneficiariesPage />,
  scheduled: <ScheduledPage />,
  profile: <ProfilePage />,
  practice: <PracticePage />,
  settings: <SettingsPage />,
}

export default function BankingApp() {
  return (
    <AppProvider app={appMeta("banking")}>
      <Routes>
        <Route index element={<LoginPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="statements/print" element={<StatementPrintPage />} />
        <Route path="transfers/receipt/:transferId" element={<TransferReceiptPage />} />
        <Route element={<RequireSession />}>
          {MODULES.map((module) => (
            <Route key={module.id} path={module.path} element={pages[module.id]} />
          ))}
          <Route path="accounts/:accountId" element={<AccountDetailPage />} />
          <Route path="*" element={<AppNotFound />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
