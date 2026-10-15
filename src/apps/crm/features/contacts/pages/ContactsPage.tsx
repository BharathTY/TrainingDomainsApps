import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/apps/crm/components/PageHeader"
import { can, type Role } from "@/apps/crm/config/permissions"
import { loadContacts, loadLookups } from "@/apps/crm/features/api"
import { useUiStore } from "@/apps/crm/stores/ui-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { FormDrawer } from "@/shared/FormDrawer"
import { ApiError, api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"
import { openAppPopup } from "@/shared/popup"

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  altPhone: z.string().optional(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  ownerUsername: z.string().min(1),
  status: z.string().min(1),
  preferredChannel: z.string().min(1),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function ContactsPage() {
  const role = useUiStore((s) => s.role) as Role
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const lookups = useQuery({ queryKey: ["crm", "lookups"], queryFn: loadLookups })
  const query = useQuery({
    queryKey: ["crm", "contacts", q, status],
    queryFn: () => loadContacts({ q, status: status === "all" ? undefined : status, pageSize: 50 }),
  })

  useEffect(() => {
    if (params.get("new") === "1" && can(role, "contacts", "create")) setDrawerOpen(true)
  }, [params, role])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Contacts"
        description="Customer and business contact directory."
        actions={
          can(role, "contacts", "create") ? (
            <Button type="button" data-testid="add-contact" onClick={() => setDrawerOpen(true)}>
              Add contact
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="grid gap-1">
          <Label htmlFor="contacts-search">Search</Label>
          <Input id="contacts-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="contacts-status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="contacts-status" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm" data-testid="contacts-table">
          <caption className="sr-only">Contacts</caption>
          <thead>
            <tr className="bg-muted/40">
              <th scope="col" className="px-3 py-2 text-left">Name</th>
              <th scope="col" className="px-3 py-2 text-left">Company</th>
              <th scope="col" className="px-3 py-2 text-left">Email</th>
              <th scope="col" className="px-3 py-2 text-left">Owner</th>
              <th scope="col" className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.data ?? []).map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <Link className="font-medium underline" to={appPath(`contacts/${c.id}`)}>{c.fullName}</Link>
                  <div className="text-xs text-muted-foreground">{c.contactNo} · {c.jobTitle}</div>
                </td>
                <td className="px-3 py-2">{c.company || "—"}</td>
                <td className="px-3 py-2">{c.email}</td>
                <td className="px-3 py-2">{c.ownerUsername}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => openAppPopup(`contacts/${c.id}`, { name: "contact-print", width: 720, height: 640 })}>
                      New window
                    </Button>
                    {can(role, "contacts", "delete") ? (
                      <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteId(c.id)}>Delete</Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {(query.data?.data.length ?? 0) === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No contacts found.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <FormDrawer<FormValues>
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Add contact"
        schema={schema}
        defaultValues={{
          fullName: "",
          email: "",
          phone: "",
          altPhone: "",
          jobTitle: "",
          company: "",
          department: "",
          location: "",
          address: "",
          ownerUsername: lookups.data?.owners[0]?.username ?? "rep1",
          status: "active",
          preferredChannel: "email",
          notes: "",
        }}
        fields={[
          { name: "fullName", label: "Full name", type: "text" },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Phone", type: "tel" },
          { name: "altPhone", label: "Alternate phone", type: "tel" },
          { name: "jobTitle", label: "Job title", type: "text" },
          { name: "company", label: "Company", type: "text" },
          { name: "department", label: "Department", type: "text" },
          { name: "location", label: "Location", type: "text" },
          { name: "address", label: "Address", type: "textarea" },
          { name: "ownerUsername", label: "Owner", type: "select", options: (lookups.data?.owners ?? []).map((o) => ({ value: o.username, label: o.name })) },
          { name: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
          { name: "preferredChannel", label: "Preferred channel", type: "select", options: ["email", "phone", "whatsapp", "in_person"].map((s) => ({ value: s, label: s })) },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSubmit={async (values) => {
          try {
            await api("/api/contacts", { method: "POST", body: JSON.stringify(values) })
            toast.success("Contact created")
            await queryClient.invalidateQueries({ queryKey: ["crm", "contacts"] })
          } catch (error) {
            if (error instanceof ApiError && error.message.includes("already exists")) {
              const ok = window.confirm(`${error.message}. Create anyway?`)
              if (ok) {
                await api("/api/contacts", { method: "POST", body: JSON.stringify({ ...values, allowDuplicate: true }) })
                toast.success("Contact created (duplicate allowed)")
                await queryClient.invalidateQueries({ queryKey: ["crm", "contacts"] })
                return
              }
            }
            toast.error(error instanceof ApiError ? error.message : "Save failed")
            throw error
          }
        }}
      />

      <ConfirmSheet
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete contact?"
        description="Soft-delete this contact from the directory."
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={async () => {
          await api(`/api/contacts/${deleteId}`, { method: "DELETE" })
          toast.success("Contact deleted")
          setDeleteId(null)
          await queryClient.invalidateQueries({ queryKey: ["crm", "contacts"] })
        }}
      />
    </div>
  )
}
