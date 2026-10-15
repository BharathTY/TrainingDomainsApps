import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/apps/banking/components/PageHeader"
import { loadLookups } from "@/apps/banking/features/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { FormDrawer } from "@/shared/FormDrawer"
import { ApiError, api } from "@/shared/lib/api-client"

const schema = z.object({
  fromAccountId: z.string().min(1),
  beneficiaryId: z.string().min(1),
  amount: z.coerce.number().positive(),
  executeDate: z.string().min(1),
  executeTime: z.string().min(1),
  frequency: z.enum(["once", "daily", "weekly", "monthly"]),
  remarks: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type Row = {
  id: string
  scheduleNo: string
  amount: number
  remarks: string
  executeDate: string
  executeTime: string
  frequency: string
  status: string
  fromNickname: string
  beneficiaryName: string
}

export function ScheduledPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState("all")
  const [q, setQ] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const lookups = useQuery({ queryKey: ["banking", "lookups"], queryFn: loadLookups })
  const query = useQuery({
    queryKey: ["banking", "scheduled", status, q],
    queryFn: () =>
      api<{ data: Row[] }>(
        `/api/scheduled?pageSize=50${status !== "all" ? `&status=${status}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
      ),
  })

  const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <PageHeader
        title="Scheduled payments"
        description="Create recurring or one-time future transfers with calendar and time controls."
        actions={
          <Button type="button" data-testid="add-schedule" onClick={() => setDrawerOpen(true)}>
            New schedule
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="grid gap-1">
          <Label htmlFor="sched-status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="sched-status" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="sched-search">Search</Label>
          <Input id="sched-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm" data-testid="scheduled-table">
          <caption className="sr-only">Scheduled payments</caption>
          <thead>
            <tr className="bg-muted/40">
              <th scope="col" className="px-3 py-2 text-left">Schedule</th>
              <th scope="col" className="px-3 py-2 text-left">From → To</th>
              <th scope="col" className="px-3 py-2 text-right">Amount</th>
              <th scope="col" className="px-3 py-2 text-left">When</th>
              <th scope="col" className="px-3 py-2 text-left">Status</th>
              <th scope="col" className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-2">
                  {row.scheduleNo}
                  <div className="text-xs text-muted-foreground">{row.frequency}</div>
                </td>
                <td className="px-3 py-2">
                  {row.fromNickname} → {row.beneficiaryName}
                </td>
                <td className="px-3 py-2 text-right">{inr.format(row.amount)}</td>
                <td className="px-3 py-2">
                  {row.executeDate} {String(row.executeTime).slice(0, 5)}
                </td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">
                  {row.status === "scheduled" ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => setCancelId(row.id)}>
                      Cancel
                    </Button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormDrawer<FormValues>
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Create scheduled payment"
        schema={schema}
        defaultValues={{
          fromAccountId: lookups.data?.accounts[0]?.id ?? "",
          beneficiaryId: lookups.data?.beneficiaries[0]?.id ?? "",
          amount: 1000,
          executeDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          executeTime: "09:30",
          frequency: "once",
          remarks: "",
        }}
        fields={[
          {
            name: "fromAccountId",
            label: "From account",
            type: "select",
            options: (lookups.data?.accounts ?? []).map((a) => ({
              value: a.id,
              label: a.nickname || a.accountType,
            })),
          },
          {
            name: "beneficiaryId",
            label: "Beneficiary",
            type: "select",
            options: (lookups.data?.beneficiaries ?? []).map((b) => ({
              value: b.id,
              label: b.nickname || b.name,
            })),
          },
          { name: "amount", label: "Amount", type: "number" },
          { name: "executeDate", label: "Execute date", type: "date" },
          { name: "executeTime", label: "Execute time", type: "time" },
          {
            name: "frequency",
            label: "Frequency",
            type: "select",
            options: [
              { value: "once", label: "Once" },
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ],
          },
          { name: "remarks", label: "Remarks", type: "text" },
        ]}
        onSubmit={async (values) => {
          try {
            await api("/api/scheduled", { method: "POST", body: JSON.stringify(values) })
            toast.success("Scheduled payment created")
            await queryClient.invalidateQueries({ queryKey: ["banking", "scheduled"] })
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Could not schedule")
            throw error
          }
        }}
      />

      <ConfirmSheet
        open={Boolean(cancelId)}
        onOpenChange={(open) => !open && setCancelId(null)}
        title="Cancel scheduled payment?"
        description="The payment will not execute on the planned date."
        confirmLabel="Cancel payment"
        tone="destructive"
        onConfirm={async () => {
          await api(`/api/scheduled/${cancelId}/cancel`, { method: "POST" })
          toast.success("Schedule cancelled")
          setCancelId(null)
          await queryClient.invalidateQueries({ queryKey: ["banking", "scheduled"] })
        }}
      />
    </div>
  )
}
