import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { EmptyState } from "@/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatInr } from "@/apps/schoolmanagement/features/dashboard/format"
import { feeKeys, fetchAccount, fetchOwnAccount, recordPayment, searchFeeStudents } from "@/apps/schoolmanagement/features/fees/api"
import { paymentSchema, type PaymentValues } from "@/apps/schoolmanagement/features/fees/schemas"
import type { FeeAccount, FeePayment } from "@/apps/schoolmanagement/features/fees/types"
import { ApiError } from "@/shared/lib/api-client"

export function CollectionPanel({ personal, canCollect }: { personal: boolean; canCollect: boolean }) {
  const [queryText, setQueryText] = useState("")
  const [studentId, setStudentId] = useState("")
  const search = useQuery({
    queryKey: feeKeys.search(queryText),
    queryFn: () => searchFeeStudents(queryText),
    enabled: !personal && queryText.trim().length >= 2,
  })
  const account = useQuery({
    queryKey: personal ? feeKeys.mine : feeKeys.account(studentId),
    queryFn: () => (personal ? fetchOwnAccount() : fetchAccount(studentId)),
    enabled: personal || Boolean(studentId),
  })

  return (
    <div className="grid gap-4">
      {personal ? null : (
        <div className="grid gap-2">
          <Label htmlFor="fee-search">Student</Label>
          <Input id="fee-search" value={queryText} placeholder="Name or admission number" onChange={(event) => setQueryText(event.target.value)} />
          {search.data && search.data.length === 0 ? <p className="text-sm text-muted-foreground">No student matches that search.</p> : null}
          <ul className="grid gap-1">
            {(search.data ?? []).map((hit) => (
              <li key={hit.id}>
                <Button
                  type="button"
                  variant={hit.id === studentId ? "secondary" : "ghost"}
                  className="h-auto w-full justify-start px-2 py-1.5"
                  onClick={() => setStudentId(hit.id)}
                >
                  {hit.name} · {hit.admissionNo} · {hit.className}-{hit.section}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {account.isLoading ? <p className="text-sm text-muted-foreground">Loading dues…</p> : null}
      {account.isError ? <EmptyState title="Could not load dues" description="The fee account did not load." actionLabel="Retry" onAction={() => void account.refetch()} /> : null}
      {account.data ? <AccountCard account={account.data} canCollect={canCollect} /> : null}
      {!personal && queryText.trim().length < 2 ? <EmptyState title="Search a student" description="Type at least two letters to find a fee account." /> : null}
    </div>
  )
}

function AccountCard({ account, canCollect }: { account: FeeAccount; canCollect: boolean }) {
  const queryClient = useQueryClient()
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: account.outstanding || 1, paidOn: "2026-09-30", mode: "cash", note: "" },
  })
  const save = useMutation({
    mutationFn: (values: PaymentValues) => recordPayment(account.studentId, values),
    onSuccess: async (payment) => {
      toast(`Receipt ${payment.receiptNo}`)
      await queryClient.invalidateQueries({ queryKey: ["fees"] })
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not record the payment"),
  })

  return (
    <div className="grid gap-4">
      <section className="grid gap-2 rounded-lg border border-border p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">
            {account.name} · {account.className}-{account.section}
          </h2>
          <p className="text-sm text-muted-foreground">Outstanding {formatInr(account.outstanding)}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Annual {formatInr(account.gross)}
          {account.concessionPercent > 0 ? ` · ${account.concessionPercent}% concession · net ${formatInr(account.net)}` : ""}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-1 pr-2 font-medium">Installment</th>
                <th className="py-1 pr-2 font-medium">Due</th>
                <th className="py-1 pr-2 font-medium">Amount</th>
                <th className="py-1 pr-2 font-medium">Paid</th>
                <th className="py-1 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {account.lines.map((line) => (
                <tr key={line.installmentId} className="border-t border-border">
                  <td className="py-1.5 pr-2">{line.name}</td>
                  <td className="py-1.5 pr-2">{line.dueDate}</td>
                  <td className="py-1.5 pr-2">{formatInr(line.amount)}</td>
                  <td className="py-1.5 pr-2">{formatInr(line.paid)}</td>
                  <td className="py-1.5">{line.overdue ? <span className="text-destructive">{formatInr(line.balance)} overdue</span> : formatInr(line.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {canCollect && account.outstanding > 0 ? (
        <form
          className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await save.mutateAsync(values)
            } catch {
              /* toast comes from the mutation */
            }
          })}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="amount">
              Amount <span className="text-destructive">*</span>
            </Label>
            <Input id="amount" type="number" {...form.register("amount")} />
            {form.formState.errors.amount ? <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="paidOn">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input id="paidOn" type="date" {...form.register("paidOn")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mode">
              Mode <span className="text-destructive">*</span>
            </Label>
            <Select value={form.watch("mode")} onValueChange={(value) => form.setValue("mode", value as PaymentValues["mode"])}>
              <SelectTrigger id="mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="note">Note</Label>
            <Input id="note" {...form.register("note")} placeholder="Optional" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={save.isPending}>
              Record payment
            </Button>
          </div>
        </form>
      ) : null}
      {account.outstanding === 0 ? <p className="text-sm text-muted-foreground">This account is clear.</p> : null}
      {account.payments.length > 0 ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold">Receipts</h2>
          <ul className="grid gap-2">
            {account.payments.map((payment) => (
              <li key={payment.id}>
                <Receipt account={account} payment={payment} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

export function Receipt({ account, payment }: { account: FeeAccount; payment: FeePayment }) {
  return (
    <article data-receipt className="grid gap-1 rounded-md border border-border p-3 text-sm">
      <p className="text-xs text-muted-foreground">{account.schoolName}</p>
      <h3 className="font-semibold">Receipt {payment.receiptNo}</h3>
      <p>
        {account.name} · {account.admissionNo} · Class {account.className}-{account.section}
      </p>
      <p>
        {formatInr(payment.amount)} · {payment.mode} · {payment.paidOn}
      </p>
      {payment.note ? <p className="text-muted-foreground">{payment.note}</p> : null}
      <div data-print-hide>
        <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
          Print
        </Button>
      </div>
    </article>
  )
}
