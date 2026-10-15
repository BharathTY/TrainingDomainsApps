import { useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "@/apps/crm/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { NativeDialog } from "@/shared/NativeDialog"
import { Modal } from "@/shared/Modal"
import { PracticePage as PracticeSheet, type PracticeRow } from "@/shared/PracticePage"
import { Tabs } from "@/shared/Tabs"
import { AppFrame, frameUrl } from "@/shared/frames"
import { appPath } from "@/shared/lib/app-context"

const scenarios: PracticeRow[] = [
  { feature: "Login RBAC", screen: "login", level: 1, exercise: "Sign in as admin, salesmgr, rep1, rep2, viewer." },
  { feature: "Dashboard KPIs", screen: "dashboard", level: 1, exercise: "Read conversion rate and overdue follow-ups." },
  { feature: "Create lead", screen: "leads", level: 1, exercise: "Add lead with email/phone validation." },
  { feature: "Filter & paginate leads", screen: "leads", level: 2, exercise: "Filter by status/source and change page size." },
  { feature: "Bulk delete cancel", screen: "leads", level: 2, exercise: "Select leads, open bulk delete, cancel confirm." },
  { feature: "Convert lead", screen: "leads", level: 3, exercise: "Qualify then convert into contact + opportunity." },
  { feature: "Lead detail tabs", screen: "leads/:id", level: 2, exercise: "Switch Overview/Activities/Notes/History tabs." },
  { feature: "Duplicate contact warning", screen: "contacts", level: 3, exercise: "Create contact with existing email and confirm prompt." },
  { feature: "Schedule conflict", screen: "activities", level: 3, exercise: "Create overlapping activity and resolve conflict prompt." },
  { feature: "Calendar views", screen: "calendar", level: 2, exercise: "Navigate month/week/day/agenda and open event modal." },
  { feature: "Pipeline stage move", screen: "pipeline", level: 2, exercise: "Open deal card and move to Proposal." },
  { feature: "Mark Won with reason", screen: "pipeline", level: 3, exercise: "Close opportunity as Won with reason." },
  { feature: "Reports export", screen: "reports", level: 2, exercise: "Export leads-by-status CSV." },
  { feature: "Lead new window", screen: "leads", level: 3, exercise: "Open lead profile in popup window." },
  { feature: "Help iframe", screen: "practice", level: 4, exercise: "Submit help form inside CRM help frame." },
  { feature: "Nested frames", screen: "practice", level: 4, exercise: "Use nested-host training embed." },
  { feature: "Basic Auth vault", screen: "secure/account-vault", level: 3, exercise: "admin / admin@123 on account vault." },
  { feature: "Native dialogs", screen: "practice", level: 3, exercise: "alert/confirm/prompt practice buttons." },
  { feature: "Reset data", screen: "settings", level: 1, exercise: "Reset training data as admin." },
]

export function PracticePage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [frameKey, setFrameKey] = useState(0)
  const [helpSheetOpen, setHelpSheetOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title="Automation Practice Lab"
        description="HTML Learning Lab and browser automation scenarios for Pulse CRM — synthetic data only."
      />
      <PracticeSheet title="Scenario catalogue" rows={scenarios} />

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">HTML Learning Lab</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-2" data-testid="training-form" onSubmit={(e) => e.preventDefault()}>
          <fieldset className="grid gap-2 rounded border border-border p-3 md:col-span-2">
            <legend>Quick lead intake</legend>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-first">First name</Label>
              <Input id="lab-first" name="lab-first" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-email">Email</Label>
              <Input id="lab-email" name="lab-email" type="email" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-phone">Phone</Label>
              <Input id="lab-phone" name="lab-phone" type="tel" pattern="[6-9][0-9]{9}" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-followup">Follow-up</Label>
              <Input id="lab-followup" name="lab-followup" type="datetime-local" />
            </div>
            <div className="grid gap-1.5 md:col-span-2">
              <Label htmlFor="lab-notes">Notes</Label>
              <Textarea id="lab-notes" name="lab-notes" rows={2} />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="lab-hot" /> Hot lead</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="lab-channel" value="email" defaultChecked /> Email</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="lab-channel" value="phone" /> Phone</label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Validate</Button>
              <Button type="button" variant="outline" onClick={() => { window.alert("OK"); if (window.confirm("Continue?")) window.prompt("Note", "done") }}>
                Native JS dialogs
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(true)}>HTML dialog</Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(true)}>Modal</Button>
              <Button type="button" variant="outline" onClick={() => setHelpSheetOpen(true)}>Help sheet</Button>
              <Button type="button" variant="outline" onClick={() => setVoidOpen(true)}>Confirm sheet</Button>
            </div>
          </fieldset>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Frames</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setFrameKey((k) => k + 1)}>Reload frames</Button>
          <Link className="text-sm underline" to="/crm/secure/account-vault" target="_blank" rel="noopener noreferrer">Basic Auth account vault</Link>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Frame base: <code>{frameUrl("frames/help-guide.html")}</code></p>
        <div className="mt-3">
          <Tabs
            tabs={[
              { id: "help", label: "Help guide", content: <AppFrame key={`h-${frameKey}`} title="Help guide" src="frames/help-guide.html" /> },
              { id: "process", label: "Sales process", content: <AppFrame key={`p-${frameKey}`} title="Sales process" src="frames/sales-process.html" /> },
              { id: "support", label: "Support", content: <AppFrame key={`s-${frameKey}`} title="Support" src="frames/support.html" /> },
              { id: "nested", label: "Nested", content: <AppFrame key={`n-${frameKey}`} title="Nested host" src="frames/nested-host.html" /> },
            ]}
          />
        </div>
      </section>

      <NativeDialog open={dialogOpen} title="HTML dialog" onClose={() => setDialogOpen(false)}>
        <p>Native dialog element for CRM training.</p>
      </NativeDialog>
      <Modal open={modalOpen} title="CRM notice" onClose={() => setModalOpen(false)}>
        <p className="text-sm">Acknowledge this synthetic CRM notice.</p>
        <Button type="button" className="mt-3" onClick={() => setModalOpen(false)}>Acknowledge</Button>
      </Modal>
      <Sheet open={helpSheetOpen} onOpenChange={setHelpSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Side help</SheetTitle>
            <SheetDescription>CRM tips for locator practice.</SheetDescription>
          </SheetHeader>
          <p className="text-sm">
            <Link className="underline" to={appPath("leads")}>Go to leads</Link>
          </p>
        </SheetContent>
      </Sheet>
      <ConfirmSheet
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title="Discard draft lead?"
        description="Practice confirm/cancel on a destructive action."
        confirmLabel="Discard"
        tone="destructive"
        onConfirm={async () => window.alert("Draft discarded (simulated).")}
      />
    </div>
  )
}
