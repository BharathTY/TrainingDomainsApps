import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { loadStatement } from "@/apps/banking/features/api"
import { Button } from "@/components/ui/button"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })

export function StatementPrintPage() {
  const [params] = useSearchParams()
  const accountId = params.get("accountId") ?? ""
  const period = params.get("period") ?? "30d"
  const query = useQuery({
    queryKey: ["banking", "statement-print", accountId, period],
    queryFn: () => loadStatement({ accountId, period, pageSize: 100 }),
    enabled: Boolean(accountId),
  })

  if (!accountId) return <p className="p-6 text-sm">Missing accountId</p>
  if (query.isLoading) return <p className="p-6 text-sm">Loading statement…</p>
  if (!query.data) return <p className="p-6 text-sm text-destructive">Could not load statement</p>

  const s = query.data
  return (
    <div className="mx-auto max-w-4xl p-6" data-testid="statement-print">
      <header className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-3">
        <div>
          <h1 className="text-lg font-semibold">Account statement</h1>
          <p className="text-sm text-muted-foreground">
            {s.account.nickname} · {s.account.maskedAccountNo}
          </p>
        </div>
        <Button type="button" className="print:hidden" onClick={() => window.print()}>
          Print
        </Button>
      </header>
      <p className="mb-3 text-sm">
        Period: {new Date(s.period.from).toLocaleDateString("en-IN")} – {new Date(s.period.to).toLocaleDateString("en-IN")}
      </p>
      <p className="mb-4 text-sm">
        Opening {inr.format(s.summary.openingBalance)} · Credits {inr.format(s.summary.totalCredits)} · Debits{" "}
        {inr.format(s.summary.totalDebits)} · Closing {inr.format(s.summary.closingBalance)}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th scope="col" className="border-b py-1 text-left">Date</th>
            <th scope="col" className="border-b py-1 text-left">Ref</th>
            <th scope="col" className="border-b py-1 text-left">Description</th>
            <th scope="col" className="border-b py-1 text-right">Amount</th>
            <th scope="col" className="border-b py-1 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {s.data.map((row) => (
            <tr key={row.id}>
              <td className="border-b py-1">{new Date(row.createdAt).toLocaleDateString("en-IN")}</td>
              <td className="border-b py-1">{row.txnRef}</td>
              <td className="border-b py-1">{row.description}</td>
              <td className="border-b py-1 text-right">
                {row.txnType === "credit" ? "+" : "-"}
                {inr.format(row.amount)}
              </td>
              <td className="border-b py-1 text-right">{inr.format(row.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
