import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { PageHeader } from "@/apps/crm/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Tabs } from "@/shared/Tabs"
import { api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

type ContactDetail = {
  id: string
  contactNo: string
  fullName: string
  jobTitle: string
  company: string
  email: string
  phone: string
  altPhone: string
  department: string
  location: string
  address: string
  ownerUsername: string
  status: string
  preferredChannel: string
  notes: string
  opportunities: { id: string; opportunityNo: string; name: string; stage: string; amount: number; probability: number }[]
  activities: { id: string; activityNo: string; title: string; activityType: string; status: string; startAt: string }[]
  interactionNotes: { id: string; body: string; actor: string; createdAt: string }[]
}

export function ContactDetailPage() {
  const { contactId = "" } = useParams()
  const query = useQuery({
    queryKey: ["crm", "contact", contactId],
    queryFn: () => api<ContactDetail>(`/api/contacts/${contactId}`),
    enabled: Boolean(contactId),
  })

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading contact…</p>
  if (!query.data) {
    return (
      <p className="text-sm text-destructive">
        Contact not found. <Link className="underline" to={appPath("contacts")}>Back</Link>
      </p>
    )
  }
  const c = query.data

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <PageHeader
        title={c.fullName}
        description={`${c.contactNo} · ${c.company || "No company"} · ${c.status}`}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to={appPath("contacts")}>All contacts</Link>
          </Button>
        }
      />
      <Tabs
        tabs={[
          {
            id: "profile",
            label: "Profile",
            content: (
              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <div><dt className="text-muted-foreground">Email</dt><dd>{c.email}</dd></div>
                <div><dt className="text-muted-foreground">Phone</dt><dd>{c.phone || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Alt phone</dt><dd>{c.altPhone || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Title</dt><dd>{c.jobTitle || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Department</dt><dd>{c.department || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Location</dt><dd>{c.location || "—"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-muted-foreground">Address</dt><dd>{c.address || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Owner</dt><dd>{c.ownerUsername}</dd></div>
                <div><dt className="text-muted-foreground">Preferred channel</dt><dd>{c.preferredChannel}</dd></div>
              </dl>
            ),
          },
          {
            id: "opportunities",
            label: "Related opportunities",
            content: (
              <ul className="space-y-2 text-sm">
                {c.opportunities.map((o) => (
                  <li key={o.id}>
                    <Link className="underline" to={appPath("pipeline")}>{o.opportunityNo}</Link> · {o.name} · {o.stage} ·{" "}
                    {inr.format(o.amount)} ({o.probability}%)
                  </li>
                ))}
                {c.opportunities.length === 0 ? <li>No opportunities linked.</li> : null}
              </ul>
            ),
          },
          {
            id: "meetings",
            label: "Meetings",
            content: (
              <ul className="space-y-2 text-sm">
                {c.activities.map((a) => (
                  <li key={a.id}>
                    {a.activityNo} · {a.title} · {new Date(a.startAt).toLocaleString("en-IN")} · {a.status}
                  </li>
                ))}
                <li>
                  <Link className="underline" to={appPath(`activities?new=1&relatedType=contact&relatedId=${contactId}`)}>
                    Schedule meeting
                  </Link>
                </li>
              </ul>
            ),
          },
          {
            id: "interactions",
            label: "Interactions",
            content: (
              <ul className="space-y-2 text-sm">
                {c.interactionNotes.map((n) => (
                  <li key={n.id} className="border-b border-border py-1">
                    <p>{n.body}</p>
                    <p className="text-xs text-muted-foreground">{n.actor}</p>
                  </li>
                ))}
                {c.interactionNotes.length === 0 ? <li>No interaction notes.</li> : null}
              </ul>
            ),
          },
        ]}
      />
    </div>
  )
}
