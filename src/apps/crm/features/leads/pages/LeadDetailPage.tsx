import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { PageHeader } from "@/apps/crm/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs } from "@/shared/Tabs"
import { openAppPopup } from "@/shared/popup"
import { ApiError, api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"

type LeadDetail = {
  id: string
  leadNo: string
  firstName: string
  lastName: string
  company: string
  email: string
  phone: string
  jobTitle: string
  source: string
  industry: string
  status: string
  rating: string
  ownerUsername: string
  notes: string
  tags: string
  nextFollowUpAt: string | null
  createdAt: string
  activities: { id: string; activityNo: string; title: string; activityType: string; status: string; startAt: string }[]
  interactionNotes: { id: string; body: string; actor: string; createdAt: string }[]
  history: { id: string; action: string; details: string; actor: string; createdAt: string }[]
}

export function LeadDetailPage() {
  const { leadId = "" } = useParams()
  const queryClient = useQueryClient()
  const [note, setNote] = useState("")
  const query = useQuery({
    queryKey: ["crm", "lead", leadId],
    queryFn: () => api<LeadDetail>(`/api/leads/${leadId}`),
    enabled: Boolean(leadId),
  })

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading lead…</p>
  if (!query.data) {
    return (
      <p className="text-sm text-destructive">
        Lead not found. <Link className="underline" to={appPath("leads")}>Back</Link>
      </p>
    )
  }

  const lead = query.data

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <PageHeader
        title={`${lead.firstName} ${lead.lastName}`}
        description={`${lead.leadNo} · ${lead.status} · ${lead.rating}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" asChild>
              <Link to={appPath("leads")}>All leads</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => openAppPopup(`leads/${leadId}`, { name: "lead-window", width: 800, height: 700 })}
            >
              Open window
            </Button>
          </div>
        }
      />

      <Tabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <dl className="grid gap-3 sm:grid-cols-2 text-sm" data-testid="lead-overview">
                <div><dt className="text-muted-foreground">Company</dt><dd>{lead.company || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Job title</dt><dd>{lead.jobTitle || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Source</dt><dd>{lead.source}</dd></div>
                <div><dt className="text-muted-foreground">Industry</dt><dd>{lead.industry || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Owner</dt><dd>{lead.ownerUsername}</dd></div>
                <div><dt className="text-muted-foreground">Tags</dt><dd>{lead.tags || "—"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-muted-foreground">Internal notes</dt><dd>{lead.notes || "—"}</dd></div>
              </dl>
            ),
          },
          {
            id: "contact",
            label: "Contact information",
            content: (
              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <div><dt className="text-muted-foreground">Email</dt><dd><a className="underline" href={`mailto:${lead.email}`}>{lead.email}</a></dd></div>
                <div><dt className="text-muted-foreground">Phone</dt><dd>{lead.phone || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Next follow-up</dt><dd>{lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleString("en-IN") : "—"}</dd></div>
              </dl>
            ),
          },
          {
            id: "activities",
            label: "Activities",
            content: (
              <ul className="space-y-2 text-sm">
                {lead.activities.map((a) => (
                  <li key={a.id}>{a.activityNo} · {a.title} · {a.activityType} · {a.status}</li>
                ))}
                {lead.activities.length === 0 ? <li>No activities yet.</li> : null}
                <li>
                  <Link className="underline" to={appPath(`activities?new=1&relatedType=lead&relatedId=${leadId}`)}>
                    Schedule follow-up
                  </Link>
                </li>
              </ul>
            ),
          },
          {
            id: "notes",
            label: "Notes",
            content: (
              <div className="grid gap-3">
                <form
                  className="grid gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    try {
                      await api(`/api/leads/${leadId}/notes`, { method: "POST", body: JSON.stringify({ body: note }) })
                      toast.success("Note added")
                      setNote("")
                      await queryClient.invalidateQueries({ queryKey: ["crm", "lead", leadId] })
                    } catch (error) {
                      toast.error(error instanceof ApiError ? error.message : "Failed")
                    }
                  }}
                >
                  <Label htmlFor="lead-note">Add note</Label>
                  <Textarea id="lead-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} required />
                  <Button type="submit" size="sm">Save note</Button>
                </form>
                <ul className="space-y-2 text-sm">
                  {lead.interactionNotes.map((n) => (
                    <li key={n.id} className="border-b border-border py-1">
                      <p>{n.body}</p>
                      <p className="text-xs text-muted-foreground">{n.actor} · {new Date(n.createdAt).toLocaleString("en-IN")}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          },
          {
            id: "history",
            label: "History",
            content: (
              <ul className="space-y-1 text-sm">
                {lead.history.map((h) => (
                  <li key={h.id}>{h.action} · {h.details || "—"} · {h.actor}</li>
                ))}
              </ul>
            ),
          },
        ]}
      />
    </div>
  )
}
