import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/apps/crm/components/PageHeader"
import { can, type Role } from "@/apps/crm/config/permissions"
import { loadLookups } from "@/apps/crm/features/api"
import { useUiStore } from "@/apps/crm/stores/ui-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormDrawer } from "@/shared/FormDrawer"
import { Modal } from "@/shared/Modal"
import { ApiError, api } from "@/shared/lib/api-client"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

const STAGES = ["new", "qualification", "needs_analysis", "proposal", "negotiation", "won", "lost"] as const

const schema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  contactId: z.string().optional(),
  amount: z.coerce.number().min(0),
  probability: z.coerce.number().min(0).max(100),
  expectedClose: z.string().optional(),
  stage: z.string().min(1),
  ownerUsername: z.string().min(1),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>
type Opp = {
  id: string
  opportunityNo: string
  name: string
  company: string
  stage: string
  amount: number
  probability: number
  expectedClose: string | null
  ownerUsername: string
  contactName: string
  closeReason: string
  notes: string
}

export function PipelinePage() {
  const role = useUiStore((s) => s.role) as Role
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detail, setDetail] = useState<Opp | null>(null)
  const [closeReason, setCloseReason] = useState("")
  const lookups = useQuery({ queryKey: ["crm", "lookups"], queryFn: loadLookups })
  const contacts = useQuery({
    queryKey: ["crm", "contacts-mini"],
    queryFn: () => api<{ data: { id: string; fullName: string }[] }>("/api/contacts?pageSize=100"),
  })
  const query = useQuery({
    queryKey: ["crm", "pipeline"],
    queryFn: () => api<{ data: Opp[]; summary: { stage: string; n: number; value: number }[] }>("/api/opportunities"),
  })

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <PageHeader
        title="Sales pipeline"
        description="Track opportunities from new through won or lost."
        actions={
          can(role, "pipeline", "create") ? (
            <Button type="button" data-testid="add-opportunity" onClick={() => setDrawerOpen(true)}>
              New opportunity
            </Button>
          ) : null
        }
      />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Pipeline summary">
        {(query.data?.summary ?? []).map((s) => (
          <article key={s.stage} className="rounded-lg border border-border p-3 text-sm">
            <p className="capitalize text-muted-foreground">{s.stage.replaceAll("_", " ")}</p>
            <p className="text-lg font-semibold">{s.n} · {inr.format(s.value)}</p>
          </article>
        ))}
      </section>

      <div className="flex gap-3 overflow-x-auto pb-2" data-testid="pipeline-board">
        {STAGES.map((stage) => {
          const cards = (query.data?.data ?? []).filter((o) => o.stage === stage)
          return (
            <section key={stage} className="min-w-[220px] flex-1 rounded-lg border border-border bg-muted/20 p-2" aria-label={stage}>
              <h2 className="px-1 text-sm font-semibold capitalize">{stage.replaceAll("_", " ")}</h2>
              <p className="px-1 text-xs text-muted-foreground">{cards.length} deals</p>
              <ul className="mt-2 space-y-2">
                {cards.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      className="w-full rounded-md border border-border bg-card p-2 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        setDetail(o)
                        setCloseReason(o.closeReason || "")
                      }}
                    >
                      <p className="font-medium">{o.name}</p>
                      <p className="text-xs text-muted-foreground">{o.opportunityNo} · {o.contactName || o.company}</p>
                      <p className="mt-1 text-xs">{inr.format(o.amount)} · {o.probability}%</p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <FormDrawer<FormValues>
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Create opportunity"
        schema={schema}
        defaultValues={{
          name: "",
          company: "",
          contactId: contacts.data?.data[0]?.id ?? "",
          amount: 100000,
          probability: 20,
          expectedClose: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          stage: "new",
          ownerUsername: lookups.data?.owners[0]?.username ?? "rep1",
          notes: "",
        }}
        fields={[
          { name: "name", label: "Opportunity name", type: "text" },
          { name: "company", label: "Company", type: "text" },
          {
            name: "contactId",
            label: "Contact",
            type: "select",
            options: (contacts.data?.data ?? []).map((c) => ({ value: c.id, label: c.fullName })),
          },
          { name: "amount", label: "Estimated value", type: "number" },
          { name: "probability", label: "Probability %", type: "number" },
          { name: "expectedClose", label: "Expected close", type: "date" },
          { name: "stage", label: "Stage", type: "select", options: STAGES.map((s) => ({ value: s, label: s.replaceAll("_", " ") })) },
          { name: "ownerUsername", label: "Owner", type: "select", options: (lookups.data?.owners ?? []).map((o) => ({ value: o.username, label: o.name })) },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSubmit={async (values) => {
          try {
            await api("/api/opportunities", { method: "POST", body: JSON.stringify(values) })
            toast.success("Opportunity created")
            await queryClient.invalidateQueries({ queryKey: ["crm", "pipeline"] })
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Create failed")
            throw error
          }
        }}
      />

      <Modal open={Boolean(detail)} title={detail?.name ?? "Opportunity"} onClose={() => setDetail(null)}>
        {detail ? (
          <div className="grid gap-3 text-sm">
            <p>{detail.opportunityNo} · {inr.format(detail.amount)} · {detail.probability}%</p>
            <p className="text-muted-foreground">{detail.contactName} · {detail.company}</p>
            <div className="grid gap-1">
              <Label htmlFor="opp-stage">Move stage</Label>
              <select
                id="opp-stage"
                className="h-9 rounded-md border border-border bg-background px-2"
                defaultValue={detail.stage}
                disabled={!can(role, "pipeline", "edit")}
                onChange={async (e) => {
                  const stage = e.target.value
                  if (stage === "won" || stage === "lost") {
                    const reason = closeReason || window.prompt("Enter close reason") || ""
                    if (!reason) {
                      toast.error("Close reason required")
                      e.target.value = detail.stage
                      return
                    }
                    setCloseReason(reason)
                    try {
                      await api(`/api/opportunities/${detail.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ stage, closeReason: reason, probability: stage === "won" ? 100 : 0 }),
                      })
                      toast.success(`Marked ${stage}`)
                      setDetail(null)
                      await queryClient.invalidateQueries({ queryKey: ["crm"] })
                    } catch (error) {
                      toast.error(error instanceof ApiError ? error.message : "Update failed")
                    }
                    return
                  }
                  try {
                    await api(`/api/opportunities/${detail.id}`, { method: "PATCH", body: JSON.stringify({ stage }) })
                    toast.success("Stage updated")
                    setDetail(null)
                    await queryClient.invalidateQueries({ queryKey: ["crm", "pipeline"] })
                  } catch (error) {
                    toast.error(error instanceof ApiError ? error.message : "Update failed")
                  }
                }}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="close-reason">Close reason</Label>
              <Input id="close-reason" value={closeReason} onChange={(e) => setCloseReason(e.target.value)} placeholder="Required for Won/Lost" />
            </div>
            <p>{detail.notes || "No notes"}</p>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
