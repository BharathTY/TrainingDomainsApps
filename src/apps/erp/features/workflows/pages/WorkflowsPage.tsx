import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/apps/erp/components/PageHeader"
import { Button } from "@/components/ui/button"
import { ApiError, api } from "@/shared/lib/api-client"

function Chain({ title, steps, children }: { title: string; steps: string[]; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <ol className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {steps.map((step, index) => (
          <li key={step} className="rounded border border-border px-2 py-1">
            {index + 1}. {step}
          </li>
        ))}
      </ol>
      <div className="mt-3 space-y-2 text-sm">{children}</div>
    </section>
  )
}

export function WorkflowsPage() {
  const queryClient = useQueryClient()
  const p2p = useQuery({ queryKey: ["erp", "wf", "p2p"], queryFn: () => api<{ steps: string[]; data: Record<string, unknown[]> }>("/api/workflows/procure-to-pay") })
  const o2c = useQuery({ queryKey: ["erp", "wf", "o2c"], queryFn: () => api<{ steps: string[]; data: Record<string, unknown[]> }>("/api/workflows/order-to-cash") })
  const h2r = useQuery({ queryKey: ["erp", "wf", "h2r"], queryFn: () => api<{ steps: string[]; data: Record<string, unknown[]> }>("/api/workflows/hire-to-retire") })
  const r2r = useQuery({ queryKey: ["erp", "wf", "r2r"], queryFn: () => api<{ steps: string[]; data: Record<string, unknown> }>("/api/workflows/record-to-report") })
  const e2r = useQuery({ queryKey: ["erp", "wf", "e2r"], queryFn: () => api<{ steps: string[]; data: { claims: { id: string; claimNo: string; status: string }[] } }>("/api/workflows/expense-to-reimbursement") })

  const receive = useMutation({
    mutationFn: () => api("/api/workflows/procure-to-pay/receive", { method: "POST", body: JSON.stringify({ purchaseOrderId: "po-2" }) }),
    onSuccess: async () => {
      toast("Goods received; inventory ledger updated")
      await queryClient.invalidateQueries({ queryKey: ["erp", "wf"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Receive failed"),
  })
  const fulfill = useMutation({
    mutationFn: () => api("/api/workflows/order-to-cash/fulfill", { method: "POST", body: JSON.stringify({ salesOrderId: "so-2" }) }),
    onSuccess: async () => {
      toast("Order fulfilled; delivery and invoice created")
      await queryClient.invalidateQueries({ queryKey: ["erp", "wf"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Fulfill failed"),
  })
  const hire = useMutation({
    mutationFn: () => api("/api/workflows/hire-to-retire/accept-offer", { method: "POST", body: JSON.stringify({ offerId: "off-1" }) }),
    onSuccess: async () => {
      toast("Offer accepted; employee record created")
      await queryClient.invalidateQueries({ queryKey: ["erp", "wf"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Hire failed"),
  })
  const reimburse = useMutation({
    mutationFn: (claimId: string) =>
      api("/api/workflows/expense-to-reimbursement/reimburse", { method: "POST", body: JSON.stringify({ claimId }) }),
    onSuccess: async () => {
      toast("Claim reimbursed and posted to GL")
      await queryClient.invalidateQueries({ queryKey: ["erp", "wf"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Reimburse failed"),
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Cross-module workflows"
        description="Connected processes: Procure-to-Pay, Hire-to-Retire, Order-to-Cash, Record-to-Report, Expense-to-Reimbursement."
      />
      <Chain title="1. Procure to Pay" steps={p2p.data?.steps ?? []}>
        <p>Sample PR/PO/GRN/invoice chain is seeded. Receive an approved PO to update the inventory ledger.</p>
        <Button type="button" onClick={() => receive.mutate()}>
          Receive PO-0002 goods
        </Button>
        <p className="text-xs text-muted-foreground">{p2p.data?.data.purchaseOrders?.length ?? 0} recent purchase orders</p>
      </Chain>
      <Chain title="2. Hire to Retire" steps={h2r.data?.steps ?? []}>
        <p>Accept a recruitment offer to create the employee, salary structure link, and employment history.</p>
        <Button type="button" onClick={() => hire.mutate()}>
          Accept seeded offer
        </Button>
      </Chain>
      <Chain title="3. Order to Cash" steps={o2c.data?.steps ?? []}>
        <p>Fulfill an approved sales order: stock out, delivery, and customer invoice.</p>
        <Button type="button" onClick={() => fulfill.mutate()}>
          Fulfill SO-0002
        </Button>
      </Chain>
      <Chain title="4. Record to Report" steps={r2r.data?.steps ?? []}>
        <p>
          Unposted journals: {Array.isArray(r2r.data?.data.unpostedJournals) ? r2r.data.data.unpostedJournals.length : 0}. Posted:{" "}
          {String(r2r.data?.data.postedCount ?? 0)}. Close periods from Chart of accounts / Reports after checks.
        </p>
      </Chain>
      <Chain title="5. Expense to Reimbursement" steps={e2r.data?.steps ?? []}>
        <p>Approved claims can be reimbursed; payment and expense GL posting are created together.</p>
        <ul className="space-y-1">
          {(e2r.data?.data.claims ?? [])
            .filter((claim) => claim.status === "approved")
            .slice(0, 5)
            .map((claim) => (
              <li key={claim.id} className="flex items-center justify-between gap-2">
                <span>
                  {claim.claimNo} · {claim.status}
                </span>
                <Button type="button" size="sm" onClick={() => reimburse.mutate(claim.id)}>
                  Reimburse
                </Button>
              </li>
            ))}
        </ul>
      </Chain>
    </div>
  )
}
