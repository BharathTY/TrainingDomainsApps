import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

export function TransferReceiptPage() {
  const { transferId = "" } = useParams()
  const query = useQuery({
    queryKey: ["banking", "transfer", transferId],
    queryFn: () =>
      api<{
        transferRef: string
        status: string
        amount: number
        fromAccountNo: string
        fromNickname: string
        toAccountNo: string
        toLabel: string
        remarks: string
        completedAt: string | null
        createdAt: string
        failureReason: string | null
      }>(`/api/transfers/${transferId}`),
    enabled: Boolean(transferId),
  })

  if (query.isLoading) return <p className="p-6 text-sm">Loading receipt…</p>
  if (!query.data) {
    return (
      <p className="p-6 text-sm text-destructive">
        Receipt not found. <Link to={appPath("transfers")}>Back</Link>
      </p>
    )
  }

  const t = query.data
  return (
    <div className="mx-auto max-w-lg p-6 print:p-2" data-testid="receipt-page">
      <header className="mb-4 border-b border-border pb-3">
        <h1 className="text-lg font-semibold">Transfer receipt</h1>
        <p className="text-sm text-muted-foreground">Demo National Bank — synthetic training printout</p>
      </header>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Reference</dt>
          <dd className="font-medium">{t.transferRef}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Status</dt>
          <dd>{t.status}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Amount</dt>
          <dd>{inr.format(t.amount)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>From</dt>
          <dd>
            {t.fromNickname} ({t.fromAccountNo})
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>To</dt>
          <dd>
            {t.toLabel} ({t.toAccountNo})
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Remarks</dt>
          <dd>{t.remarks || "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Created</dt>
          <dd>{new Date(t.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</dd>
        </div>
        {t.failureReason ? (
          <div className="flex justify-between gap-4 text-destructive">
            <dt>Failure</dt>
            <dd>{t.failureReason}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-4 flex gap-2 print:hidden">
        <Button type="button" onClick={() => window.print()}>
          Print
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link to={appPath("transfers")}>Close</Link>
        </Button>
      </div>
    </div>
  )
}
