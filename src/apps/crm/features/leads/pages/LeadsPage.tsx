import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/apps/crm/components/PageHeader"
import { can, type Role } from "@/apps/crm/config/permissions"
import { loadLeads, loadLookups, type Lead } from "@/apps/crm/features/api"
import { useUiStore } from "@/apps/crm/stores/ui-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { FormDrawer } from "@/shared/FormDrawer"
import { ApiError, api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  company: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  source: z.string().min(1),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  status: z.string().min(1),
  rating: z.string().min(1),
  ownerUsername: z.string().min(1),
  notes: z.string().optional(),
  tags: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function LeadsPage() {
  const role = useUiStore((s) => s.role) as Role
  const canCreate = can(role, "leads", "create")
  const canDelete = can(role, "leads", "delete")
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [q, setQ] = useState("")
  const [status, setStatus] = useState(params.get("status") ?? "all")
  const [source, setSource] = useState("all")
  const [rating, setRating] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selected, setSelected] = useState<string[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [convertId, setConvertId] = useState<string | null>(null)

  const lookups = useQuery({ queryKey: ["crm", "lookups"], queryFn: loadLookups })
  const query = useQuery({
    queryKey: ["crm", "leads", q, status, source, rating, page, pageSize],
    queryFn: () =>
      loadLeads({
        q,
        status: status === "all" ? undefined : status,
        source: source === "all" ? undefined : source,
        rating: rating === "all" ? undefined : rating,
        page,
        pageSize,
      }),
  })

  useEffect(() => {
    if (params.get("new") === "1" && canCreate) setDrawerOpen(true)
  }, [params, canCreate])

  const rows = query.data?.data ?? []

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Leads"
        description="Capture, qualify, assign, and convert inbound leads."
        actions={
          canCreate ? (
            <Button
              type="button"
              data-testid="add-lead"
              onClick={() => {
                setEditing(null)
                setDrawerOpen(true)
              }}
            >
              Add lead
            </Button>
          ) : null
        }
      />

      <form className="grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-5" onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-1 md:col-span-2">
          <Label htmlFor="leads-search">Search</Label>
          <Input id="leads-search" type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Name, company, email" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="leads-status">Status</Label>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
            <SelectTrigger id="leads-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {(lookups.data?.leadStatuses ?? []).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="leads-source">Source</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger id="leads-source"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {(lookups.data?.sources ?? []).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="leads-rating">Rating</Label>
          <Select value={rating} onValueChange={setRating}>
            <SelectTrigger id="leads-rating"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {(lookups.data?.ratings ?? []).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </form>

      {canDelete && selected.length > 0 ? (
        <div className="flex items-center gap-2 text-sm">
          <span>{selected.length} selected</span>
          <Button type="button" size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
            Bulk delete
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm" data-testid="leads-table">
          <caption className="sr-only">Leads list</caption>
          <thead>
            <tr className="bg-muted/40">
              <th scope="col" className="px-3 py-2 text-left">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={rows.length > 0 && selected.length === rows.length}
                  onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                />
              </th>
              <th scope="col" className="px-3 py-2 text-left">Lead</th>
              <th scope="col" className="px-3 py-2 text-left">Company</th>
              <th scope="col" className="px-3 py-2 text-left">Status</th>
              <th scope="col" className="px-3 py-2 text-left">Rating</th>
              <th scope="col" className="px-3 py-2 text-left">Owner</th>
              <th scope="col" className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => (
              <tr key={lead.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Select ${lead.leadNo}`}
                    checked={selected.includes(lead.id)}
                    onChange={(e) =>
                      setSelected((prev) => (e.target.checked ? [...prev, lead.id] : prev.filter((id) => id !== lead.id)))
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <Link className="font-medium underline" to={appPath(`leads/${lead.id}`)}>
                    {lead.firstName} {lead.lastName}
                  </Link>
                  <div className="text-xs text-muted-foreground">{lead.leadNo} · {lead.email}</div>
                </td>
                <td className="px-3 py-2">{lead.company || "—"}</td>
                <td className="px-3 py-2 capitalize">{lead.status}</td>
                <td className="px-3 py-2 capitalize">{lead.rating}</td>
                <td className="px-3 py-2">{lead.ownerUsername}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {can(role, "leads", "edit") ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(lead)
                          setDrawerOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                    ) : null}
                    {can(role, "leads", "edit") && lead.status !== "converted" ? (
                      <Button type="button" size="sm" variant="ghost" onClick={() => setConvertId(lead.id)}>
                        Convert
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteId(lead.id)}>
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No leads match the filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Label htmlFor="leads-pagesize">Rows</Label>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
            <SelectTrigger id="leads-pagesize" className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>Page {query.data?.page ?? 1} · {query.data?.total ?? 0} total</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button type="button" size="sm" variant="outline" disabled={page * pageSize >= (query.data?.total ?? 0)} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      <FormDrawer<FormValues>
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editing ? "Edit lead" : "Add lead"}
        schema={schema}
        defaultValues={{
          firstName: editing?.firstName ?? "",
          lastName: editing?.lastName ?? "",
          company: editing?.company ?? "",
          email: editing?.email ?? "",
          phone: editing?.phone ?? "",
          jobTitle: editing?.jobTitle ?? "",
          source: editing?.source ?? "website",
          industry: editing?.industry ?? "",
          companySize: editing?.companySize ?? "",
          status: editing?.status ?? "new",
          rating: editing?.rating ?? "warm",
          ownerUsername: editing?.ownerUsername ?? lookups.data?.owners[0]?.username ?? "rep1",
          notes: editing?.notes ?? "",
          tags: editing?.tags ?? "",
          nextFollowUpAt: editing?.nextFollowUpAt ? String(editing.nextFollowUpAt).slice(0, 16) : "",
        }}
        fields={[
          { name: "firstName", label: "First name", type: "text" },
          { name: "lastName", label: "Last name", type: "text" },
          { name: "company", label: "Company", type: "text" },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Phone", type: "tel" },
          { name: "jobTitle", label: "Job title", type: "text" },
          { name: "source", label: "Source", type: "select", options: (lookups.data?.sources ?? []).map((s) => ({ value: s, label: s })) },
          { name: "industry", label: "Industry", type: "select", options: (lookups.data?.industries ?? []).map((s) => ({ value: s, label: s })) },
          { name: "companySize", label: "Company size", type: "select", options: ["1-10", "11-50", "51-200", "201-500", "500+"].map((s) => ({ value: s, label: s })) },
          { name: "status", label: "Status", type: "select", options: (lookups.data?.leadStatuses ?? []).map((s) => ({ value: s, label: s })) },
          { name: "rating", label: "Rating", type: "select", options: (lookups.data?.ratings ?? []).map((s) => ({ value: s, label: s })) },
          { name: "ownerUsername", label: "Owner", type: "select", options: (lookups.data?.owners ?? []).map((o) => ({ value: o.username, label: o.name })) },
          { name: "nextFollowUpAt", label: "Next follow-up", type: "datetime-local" },
          { name: "tags", label: "Tags", type: "text" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSubmit={async (values) => {
          try {
            if (editing) {
              await api(`/api/leads/${editing.id}`, { method: "PATCH", body: JSON.stringify(values) })
              toast.success("Lead updated")
            } else {
              await api("/api/leads", { method: "POST", body: JSON.stringify(values) })
              toast.success("Lead created")
            }
            await queryClient.invalidateQueries({ queryKey: ["crm"] })
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Save failed")
            throw error
          }
        }}
      />

      <ConfirmSheet
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete lead?"
        description="This soft-deletes the lead. You can cancel to keep it."
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={async () => {
          await api(`/api/leads/${deleteId}`, { method: "DELETE" })
          toast.success("Lead deleted")
          setDeleteId(null)
          await queryClient.invalidateQueries({ queryKey: ["crm", "leads"] })
        }}
      />

      <ConfirmSheet
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selected.length} leads?`}
        description="Bulk soft-delete selected leads."
        confirmLabel="Delete selected"
        tone="destructive"
        onConfirm={async () => {
          await api("/api/leads/bulk-delete", { method: "POST", body: JSON.stringify({ ids: selected }) })
          toast.success("Leads deleted")
          setSelected([])
          await queryClient.invalidateQueries({ queryKey: ["crm", "leads"] })
        }}
      />

      <ConfirmSheet
        open={Boolean(convertId)}
        onOpenChange={(o) => !o && setConvertId(null)}
        title="Convert lead?"
        description="Creates a contact and a pipeline opportunity from this lead."
        confirmLabel="Convert"
        onConfirm={async () => {
          try {
            const result = await api<{ contactNo: string; opportunityNo: string }>(`/api/leads/${convertId}/convert`, {
              method: "POST",
              body: JSON.stringify({}),
            })
            toast.success(`Converted → ${result.contactNo} / ${result.opportunityNo}`)
            setConvertId(null)
            await queryClient.invalidateQueries({ queryKey: ["crm"] })
          } catch (error) {
            if (error instanceof ApiError && error.message.includes("qualified")) {
              const force = window.confirm(`${error.message}. Convert anyway?`)
              if (force) {
                const result = await api<{ contactNo: string; opportunityNo: string }>(`/api/leads/${convertId}/convert`, {
                  method: "POST",
                  body: JSON.stringify({ force: true }),
                })
                toast.success(`Converted → ${result.contactNo} / ${result.opportunityNo}`)
                setConvertId(null)
                await queryClient.invalidateQueries({ queryKey: ["crm"] })
                return
              }
            }
            toast.error(error instanceof ApiError ? error.message : "Convert failed")
            throw error
          }
        }}
      />
    </div>
  )
}
