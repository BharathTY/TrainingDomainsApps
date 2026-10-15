import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { PageHeader } from "@/apps/banking/components/PageHeader"
import { loadAccount, maskAccountNo } from "@/apps/banking/features/api"
import { useUiStore } from "@/apps/banking/stores/ui-store"
import { Tabs } from "@/shared/Tabs"
import { appPath } from "@/shared/lib/app-context"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

export function AccountDetailPage() {
  const { accountId = "" } = useParams()
  const mask = useUiStore((s) => s.maskAccounts)
  const query = useQuery({
    queryKey: ["banking", "account", accountId],
    queryFn: () => loadAccount(accountId),
    enabled: Boolean(accountId),
  })

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading account…</p>
  if (!query.data) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Account not found. <Link className="underline" to={appPath("accounts")}>Back to accounts</Link>
      </p>
    )
  }

  const a = query.data

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <PageHeader
        title={a.nickname || a.accountType}
        description={`${maskAccountNo(a.accountNo, mask)} · ${a.status}`}
        actions={
          <Link className="text-sm underline" to={appPath("accounts")}>
            All accounts
          </Link>
        }
      />

      <Tabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <dl className="grid gap-3 sm:grid-cols-2 text-sm" data-testid="account-overview">
                <div>
                  <dt className="text-muted-foreground">Available balance</dt>
                  <dd className="font-semibold">{inr.format(a.availableBalance)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Ledger balance</dt>
                  <dd className="font-semibold">{inr.format(a.balance)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="capitalize">{a.accountType.replace("_", " ")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Interest rate</dt>
                  <dd>{a.interestRate ?? 0}%</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Opened</dt>
                  <dd>{a.openedAt}</dd>
                </div>
                {a.maturityDate ? (
                  <div>
                    <dt className="text-muted-foreground">Maturity</dt>
                    <dd>{a.maturityDate}</dd>
                  </div>
                ) : null}
              </dl>
            ),
          },
          {
            id: "customer",
            label: "Customer & branch",
            content: (
              <dl className="grid gap-3 sm:grid-cols-2 text-sm" data-testid="account-customer">
                <div>
                  <dt className="text-muted-foreground">Customer</dt>
                  <dd>{a.customerName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">CIF</dt>
                  <dd>{a.customerNo}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>{a.email}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>{a.phone}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Address</dt>
                  <dd>{a.address}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Branch</dt>
                  <dd>
                    {a.branchName} ({a.branchCode})
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">KYC</dt>
                  <dd>{a.kycStatus}</dd>
                </div>
              </dl>
            ),
          },
          {
            id: "actions",
            label: "Quick actions",
            content: (
              <ul className="space-y-2 text-sm">
                <li>
                  <Link className="underline" to={appPath(`transfers?from=${a.id}`)}>
                    Transfer from this account
                  </Link>
                </li>
                <li>
                  <Link className="underline" to={appPath(`statements?accountId=${a.id}`)}>
                    View statement
                  </Link>
                </li>
              </ul>
            ),
          },
        ]}
      />
    </div>
  )
}
