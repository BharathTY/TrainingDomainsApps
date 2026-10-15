import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/apps/crm/components/PageHeader"
import { can, type Role } from "@/apps/crm/config/permissions"
import { loadLookups, qs } from "@/apps/crm/features/api"
import { useUiStore } from "@/apps/crm/stores/ui-store"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { FormDrawer } from "@/shared/FormDrawer"
import { ApiError, api } from "@/shared/lib/api-client"

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  activityType: z.string().min(1),
  relatedType: z.string().optional(),
  relatedId: z.string().optional(),
  ownerUsername: z.string().min(1),
  priority: z.string().min(1),
  status: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  reminderMinutes: z.string().optional(),
  recurrence: z.string().min(1),
})

type FormValues = z.infer<typeof schema>
type Row = {
  id: string
  activityNo: string
  title: string
  activityType: string
  ownerUsername: string
  priority: string
  status: string
  startAt: string
  endAt: string
}

export function ActivitiesPage() {
  const role = useUiStore((s) => s.role) as Role
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [status, setStatus] = useState("all")
  const [overdue, setOverdue] = useState(params.get("overdue") === "1")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const lookups = useQuery({ queryKey: ["crm", "lookups"], queryFn: loadLookups })
  const query = useQuery({
    queryKey: ["crm", "activities", status, overdue],
    queryFn: () =>
      api<{ data: Row[] }>(
        `/api/activities${qs({
          status: status === "all" ? undefined : status,
          overdue: overdue ? "true" : undefined,
          pageSize: 50,
        })}`,
      ),
  })

  useEffect(() => {
    if (params.get("new") === "1" && can(role, "activities", "create")) setDrawerOpen(true)
  }, [params, role])

  const defaultStart = new Date()
  defaultStart.setMinutes(0, 0, 0)
  defaultStart.setHours(defaultStart.getHours() + 1)
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Follow-ups & activities"
        description="Calls, emails, meetings, demos, tasks, and visits."
        actions={
          can(role, "activities", "create") ? (
            <Button type="button" data-testid="add-activity" onClick={() => setDrawerOpen(true)}>
              Schedule activity
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-3 items-end">
        <div className="grid gap-1">
          <Label htmlFor="act-status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="act-status" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {(lookups.data?.activityStatuses ?? []).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} />
          Overdue only
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm" data-testid="activities-table">
          <caption className="sr-only">Activities</caption>
          <thead>
            <tr className="bg-muted/40">
              <th scope="col" className="px-3 py-2 text-left">Activity</th>
              <th scope="col" className="px-3 py-2 text-left">Type</th>
              <th scope="col" className="px-3 py-2 text-left">When</th>
              <th scope="col" className="px-3 py-2 text-left">Owner</th>
              <th scope="col" className="px-3 py-2 text-left">Status</th>
              <th scope="col" className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.data ?? []).map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.activityNo} · {a.priority}</div>
                </td>
                <td className="px-3 py-2 capitalize">{a.activityType}</td>
                <td className="px-3 py-2">{new Date(a.startAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                <td className="px-3 py-2">{a.ownerUsername}</td>
                <td className="px-3 py-2">{a.status}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {can(role, "activities", "edit") && a.status !== "completed" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await api(`/api/activities/${a.id}/complete`, { method: "POST" })
                          toast.success("Marked completed")
                          await queryClient.invalidateQueries({ queryKey: ["crm", "activities"] })
                        }}
                      >
                        Complete
                      </Button>
                    ) : null}
                    {can(role, "activities", "edit") && a.status === "planned" ? (
                      <Button type="button" size="sm" variant="ghost" onClick={() => setCancelId(a.id)}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormDrawer<FormValues>
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Schedule activity"
        schema={schema}
        defaultValues={{
          title: "",
          description: "",
          activityType: "call",
          relatedType: params.get("relatedType") ?? "none",
          relatedId: params.get("relatedId") ?? "",
          ownerUsername: lookups.data?.owners[0]?.username ?? "rep1",
          priority: "medium",
          status: "planned",
          startAt: defaultStart.toISOString().slice(0, 16),
          endAt: defaultEnd.toISOString().slice(0, 16),
          reminderMinutes: "30",
          recurrence: "none",
        }}
        fields={[
          { name: "title", label: "Title", type: "text" },
          { name: "activityType", label: "Type", type: "select", options: (lookups.data?.activityTypes ?? []).map((s) => ({ value: s, label: s })) },
          { name: "startAt", label: "Start", type: "datetime-local" },
          { name: "endAt", label: "End", type: "datetime-local" },
          { name: "priority", label: "Priority", type: "select", options: ["low", "medium", "high"].map((s) => ({ value: s, label: s })) },
          { name: "status", label: "Status", type: "select", options: (lookups.data?.activityStatuses ?? []).map((s) => ({ value: s, label: s })) },
          { name: "ownerUsername", label: "Owner", type: "select", options: (lookups.data?.owners ?? []).map((o) => ({ value: o.username, label: o.name })) },
          { name: "recurrence", label: "Recurrence", type: "select", options: ["none", "daily", "weekly", "monthly"].map((s) => ({ value: s, label: s })) },
          { name: "reminderMinutes", label: "Reminder (minutes)", type: "number" },
          {
            name: "relatedType",
            label: "Related type",
            type: "select",
            options: [
              { value: "none", label: "None" },
              { value: "lead", label: "Lead" },
              { value: "contact", label: "Contact" },
              { value: "opportunity", label: "Opportunity" },
            ],
          },
          { name: "relatedId", label: "Related ID", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
        ]}
        onSubmit={async (values) => {
          const relatedType = values.relatedType === "none" ? undefined : values.relatedType
          const payload = {
            ...values,
            relatedType,
            relatedId: values.relatedId || undefined,
            reminderMinutes: values.reminderMinutes ? Number(values.reminderMinutes) : null,
          }
          try {
            await api("/api/activities", { method: "POST", body: JSON.stringify(payload) })
            toast.success("Activity scheduled")
            await queryClient.invalidateQueries({ queryKey: ["crm"] })
          } catch (error) {
            if (error instanceof ApiError && error.message.includes("conflict")) {
              const ok = window.confirm(`${error.message}. Schedule anyway?`)
              if (ok) {
                await api("/api/activities", {
                  method: "POST",
                  body: JSON.stringify({ ...payload, ignoreConflict: true }),
                })
                toast.success("Activity scheduled despite conflict")
                await queryClient.invalidateQueries({ queryKey: ["crm"] })
                return
              }
            }
            toast.error(error instanceof ApiError ? error.message : "Could not schedule")
            throw error
          }
        }}
      />

      <ConfirmSheet
        open={Boolean(cancelId)}
        onOpenChange={(o) => !o && setCancelId(null)}
        title="Cancel activity?"
        description="The activity will be marked cancelled."
        confirmLabel="Cancel activity"
        tone="destructive"
        onConfirm={async () => {
          await api(`/api/activities/${cancelId}/cancel`, { method: "POST" })
          toast.success("Activity cancelled")
          setCancelId(null)
          await queryClient.invalidateQueries({ queryKey: ["crm", "activities"] })
        }}
      />
    </div>
  )
}
