import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { PageHeader } from "@/apps/banking/components/PageHeader"
import { loadLookups, loadStatement } from "@/apps/banking/features/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Modal } from "@/shared/Modal"
import { openAppPopup } from "@/shared/popup"
import { api } from "@/shared/lib/api-client"
import { downloadCsv } from "@/shared/lib/csv"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })

export function StatementsPage() {
  const [params] = useSearchParams()
  const lookups = useQuery({ queryKey: ["banking", "lookups"], queryFn: loadLookups })
  const [accountId, setAccountId] = useState(params.get("accountId") ?? "")
  const [period, setPeriod] = useState("30d")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [q, setQ] = useState("")
  const [txnType, setTxnType] = useState("all")
  const [status, setStatus] = useState("all")
  const [sort, setSort] = useState("date_desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [detailId, setDetailId] = useState("")

  useEffect(() => {
    if (!accountId && lookups.data?.accounts[0]) setAccountId(lookups.data.accounts[0].id)
  }, [lookups.data, accountId])

  const statement = useQuery({
    queryKey: ["banking", "statement", accountId, period, from, to, q, txnType, status, sort, page, pageSize],
    queryFn: () =>
      loadStatement({
        accountId,
        period,
        from: period === "custom" ? from : undefined,
        to: period === "custom" ? to : undefined,
        q,
        txnType: txnType === "all" ? undefined : txnType,
        status: status === "all" ? undefined : status,
        sort,
        page,
        pageSize,
      }),
    enabled: Boolean(accountId),
  })

  const detail = useQuery({
    queryKey: ["banking", "txn", detailId],
    queryFn: () => api<Record<string, unknown>>(`/api/transactions/${detailId}`),
    enabled: Boolean(detailId),
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Account statements"
        description="Filter by period, type, and status. Open details or export CSV."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!statement.data}
              onClick={() => {
                if (!statement.data) return
                downloadCsv(`statement-${statement.data.account.accountNo}.csv`, [
                  ["Date", "Reference", "Description", "Type", "Amount", "Balance", "Status"],
                  ...statement.data.data.map((r) => [
                    r.createdAt,
                    r.txnRef,
                    r.description,
                    r.txnType,
                    String(r.amount),
                    String(r.balanceAfter),
                    r.status,
                  ]),
                ])
              }}
            >
              Download CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!accountId}
              onClick={() =>
                openAppPopup(`statements/print?accountId=${accountId}&period=${period}`, {
                  name: "statement-print",
                  width: 900,
                  height: 700,
                })
              }
            >
              Open in new tab
            </Button>
          </div>
        }
      />

      <form className="grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-3 lg:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-1">
          <Label htmlFor="stmt-account">Account</Label>
          <Select value={accountId} onValueChange={(v) => { setAccountId(v); setPage(1) }}>
            <SelectTrigger id="stmt-account" data-testid="stmt-account">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {(lookups.data?.accounts ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nickname || a.accountType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="stmt-period">Period</Label>
          <Select value={period} onValueChange={(v) => { setPeriod(v); setPage(1) }}>
            <SelectTrigger id="stmt-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {period === "custom" ? (
          <>
            <div className="grid gap-1">
              <Label htmlFor="stmt-from">From</Label>
              <Input id="stmt-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="stmt-to">To</Label>
              <Input id="stmt-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </>
        ) : null}
        <div className="grid gap-1">
          <Label htmlFor="stmt-search">Search</Label>
          <Input id="stmt-search" type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Description or reference" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="stmt-type">Credit / debit</Label>
          <Select value={txnType} onValueChange={setTxnType}>
            <SelectTrigger id="stmt-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="stmt-status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="stmt-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="stmt-sort">Sort</Label>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger id="stmt-sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Date (newest)</SelectItem>
              <SelectItem value="date_asc">Date (oldest)</SelectItem>
              <SelectItem value="amount_desc">Amount (high)</SelectItem>
              <SelectItem value="amount_asc">Amount (low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="stmt-pagesize">Rows</Label>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
            <SelectTrigger id="stmt-pagesize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </form>

      {statement.data ? (
        <section className="grid gap-3 sm:grid-cols-4" aria-label="Statement summary">
          <article className="rounded-lg border border-border p-3 text-sm">
            <p className="text-muted-foreground">Opening</p>
            <p className="font-semibold">{inr.format(statement.data.summary.openingBalance)}</p>
          </article>
          <article className="rounded-lg border border-border p-3 text-sm">
            <p className="text-muted-foreground">Credits</p>
            <p className="font-semibold text-emerald-700">{inr.format(statement.data.summary.totalCredits)}</p>
          </article>
          <article className="rounded-lg border border-border p-3 text-sm">
            <p className="text-muted-foreground">Debits</p>
            <p className="font-semibold text-rose-700">{inr.format(statement.data.summary.totalDebits)}</p>
          </article>
          <article className="rounded-lg border border-border p-3 text-sm">
            <p className="text-muted-foreground">Closing</p>
            <p className="font-semibold">{inr.format(statement.data.summary.closingBalance)}</p>
          </article>
        </section>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm" data-testid="statement-table">
          <caption className="sr-only">Account transactions</caption>
          <thead>
            <tr className="bg-muted/40">
              <th scope="col" className="px-3 py-2 text-left">Date</th>
              <th scope="col" className="px-3 py-2 text-left">Reference</th>
              <th scope="col" className="px-3 py-2 text-left">Description</th>
              <th scope="col" className="px-3 py-2 text-left">Type</th>
              <th scope="col" className="px-3 py-2 text-right">Amount</th>
              <th scope="col" className="px-3 py-2 text-right">Balance</th>
              <th scope="col" className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {(statement.data?.data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(row.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </td>
                <td className="px-3 py-2">
                  <button type="button" className="underline" onClick={() => setDetailId(row.id)}>
                    {row.txnRef}
                  </button>
                </td>
                <td className="px-3 py-2">{row.description}</td>
                <td className="px-3 py-2 capitalize">{row.txnType}</td>
                <td className="px-3 py-2 text-right">{inr.format(row.amount)}</td>
                <td className="px-3 py-2 text-right">{inr.format(row.balanceAfter)}</td>
                <td className="px-3 py-2">{row.status}</td>
              </tr>
            ))}
            {(statement.data?.data.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No transactions match the selected filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {statement.data ? (
        <div className="flex items-center justify-between text-sm">
          <p>
            Page {statement.data.page} · {statement.data.total} records
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page * pageSize >= statement.data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <Modal open={Boolean(detailId)} title="Transaction details" onClose={() => setDetailId("")}>
        {detail.data ? (
          <dl className="grid gap-2 text-sm">
            {Object.entries(detail.data).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{k}</dt>
                <dd>{String(v ?? "—")}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
      </Modal>
    </div>
  )
}
