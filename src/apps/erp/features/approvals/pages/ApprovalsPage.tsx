import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PageHeader } from "@/apps/erp/components/PageHeader"
import { Button } from "@/components/ui/button"
import { ApiError, api } from "@/shared/lib/api-client"

type Approval = {
  id: string
  entityType: string
  entityId: string
  amount: number
  requestedBy: string
  approverRole: string
  status: string
}

export function ApprovalsPage() {
  const queryClient = useQueryClient()
  const list = useQuery({
    queryKey: ["erp", "approvals"],
    queryFn: () => api<Approval[]>("/api/approvals"),
  })
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
      api(`/api/approvals/${id}/decide`, {
        method: "POST",
        body: JSON.stringify({ decision, comment: decision === "rejected" ? "Needs correction" : "OK" }),
      }),
    onSuccess: async () => {
      toast("Decision recorded")
      await queryClient.invalidateQueries({ queryKey: ["erp", "approvals"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Decision failed"),
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Approvals" description="Amount/role matrix with audit trail. Rejection requires a comment." />
      {list.isLoading ? <p className="text-sm text-muted-foreground">Loading approvals…</p> : null}
      <ul className="space-y-2">
        {(list.data ?? []).map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
            <div className="text-sm">
              <p className="font-medium">
                {row.entityType} · {row.entityId}
              </p>
              <p className="text-muted-foreground">
                ₹{row.amount} · requested by {row.requestedBy} · step role {row.approverRole}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => decide.mutate({ id: row.id, decision: "approved" })}>
                Approve
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => decide.mutate({ id: row.id, decision: "rejected" })}>
                Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {!list.isLoading && (list.data?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">No pending approvals for your role.</p> : null}
    </div>
  )
}
