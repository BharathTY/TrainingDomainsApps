import { useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "@/apps/assets/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { NativeDialog } from "@/shared/NativeDialog"
import { Modal } from "@/shared/Modal"
import { PracticePage as PracticeSheet, type PracticeRow } from "@/shared/PracticePage"
import { Tabs } from "@/shared/Tabs"
import { AppFrame, frameUrl } from "@/shared/frames"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { appPath } from "@/shared/lib/app-context"

const scenarios: PracticeRow[] = [
  { feature: "Login RBAC", screen: "login", level: 1, exercise: "Sign in as admin, assetmgr, tech, deptmgr, employee." },
  { feature: "Dashboard KPIs", screen: "dashboard", level: 1, exercise: "Read total assets, overdue WO, warranty alerts." },
  { feature: "Register asset", screen: "assets", level: 2, exercise: "Create asset; duplicate serial should fail." },
  { feature: "Retire asset", screen: "assets", level: 2, exercise: "Retire via side confirm panel; status becomes retired." },
  { feature: "Assign asset", screen: "assignments", level: 2, exercise: "Assign free asset; second active assign fails." },
  { feature: "Transfer panel", screen: "assignments", level: 3, exercise: "Transfer via side panel with required reason." },
  { feature: "Work order flow", screen: "maintenance", level: 3, exercise: "Create WO and transition open→scheduled→in_progress→completed." },
  { feature: "Calendar", screen: "calendar", level: 2, exercise: "Navigate months and select a date cell." },
  { feature: "Vendor CRUD", screen: "vendors", level: 2, exercise: "Add vendor; duplicate email rejected." },
  { feature: "Reports export table", screen: "reports", level: 2, exercise: "Switch warranty and depreciation reports." },
  { feature: "New browser tab", screen: "practice", level: 3, exercise: "Open asset register in a new tab." },
  { feature: "Popup window", screen: "practice", level: 3, exercise: "Open maintenance summary popup." },
  { feature: "Iframe specs", screen: "practice", level: 4, exercise: "Enter embedded asset info frame and submit parts form." },
  { feature: "Basic Auth vault", screen: "secure/asset-register", level: 3, exercise: "admin / admin@123 on protected register." },
  { feature: "Reset data", screen: "settings", level: 1, exercise: "Reset training data as admin." },
]

export function PracticePage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [frameKey, setFrameKey] = useState(0)
  const [transferSheetOpen, setTransferSheetOpen] = useState(false)
  const [retireSheetOpen, setRetireSheetOpen] = useState(false)
  const [helpSheetOpen, setHelpSheetOpen] = useState(false)
  const [transferReason, setTransferReason] = useState("")

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title="Automation Practice Lab"
        description="HTML Learning Lab and browser automation scenarios for Asset EAM — synthetic data only."
      />
      <PracticeSheet title="Scenario catalogue" rows={scenarios} />

      <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="html-lab-heading">
        <h2 id="html-lab-heading" className="text-sm font-semibold">HTML Learning Lab</h2>
        <p className="mt-1 text-sm text-muted-foreground">Inspect simple → advanced controls in a business form context.</p>
        <form className="mt-3 grid gap-3 md:grid-cols-2" data-testid="training-form" onSubmit={(e) => e.preventDefault()}>
          <fieldset className="grid gap-2 rounded border border-border p-3 md:col-span-2">
            <legend>Quick asset intake</legend>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-name">Asset name</Label>
              <Input id="lab-name" name="lab-name" required minLength={2} autoComplete="off" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-email">Owner email</Label>
              <Input id="lab-email" name="lab-email" type="email" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-phone">Owner phone</Label>
              <Input id="lab-phone" name="lab-phone" type="tel" pattern="[0-9]{10}" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-cost">Purchase cost</Label>
              <Input id="lab-cost" name="lab-cost" type="number" min={0} step={0.01} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-purchase">Purchase date</Label>
              <Input id="lab-purchase" name="lab-purchase" type="date" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-time">Preferred service time</Label>
              <Input id="lab-time" name="lab-time" type="time" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-when">Maintenance window</Label>
              <Input id="lab-when" name="lab-when" type="datetime-local" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-month">Capitalization month</Label>
              <Input id="lab-month" name="lab-month" type="month" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-url">Manual URL</Label>
              <Input id="lab-url" name="lab-url" type="url" placeholder="https://example.com" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-file">Attachment</Label>
              <Input id="lab-file" name="lab-file" type="file" accept=".pdf,image/*" multiple />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-health">Asset health</Label>
              <Input id="lab-health" name="lab-health" type="range" min={0} max={100} defaultValue={80} />
              <output htmlFor="lab-health">Training meter only</output>
            </div>
            <div>
              <Label>Condition</Label>
              <div className="mt-1 flex gap-3">
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" name="condition" value="good" defaultChecked /> Good
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" name="condition" value="fair" /> Fair
                </label>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="insured" value="yes" /> Insured (training)
            </label>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-cat">Category</Label>
              <input id="lab-cat" name="lab-cat" list="cat-list" className="h-9 rounded-md border border-input px-2 text-sm" />
              <datalist id="cat-list">
                <option value="IT equipment" />
                <option value="Vehicles" />
                <option value="Office furniture" />
              </datalist>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-priority">Priority</Label>
              <select id="lab-priority" name="lab-priority" className="h-9 rounded-md border border-input px-2 text-sm">
                <optgroup label="Standard">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                </optgroup>
                <optgroup label="Urgent">
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </optgroup>
              </select>
            </div>
            <progress value={55} max={100} aria-label="Form completion">55%</progress>
            <meter min={0} max={100} value={70} aria-label="Utilization demo">70%</meter>
          </fieldset>
        </form>
        <details className="mt-3">
          <summary>Locator notes</summary>
          <p className="mt-2 text-sm text-muted-foreground">Prefer role/name, label, and data-testid. Avoid brittle CSS class chains.</p>
        </details>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">In-app tabs</h2>
        <Tabs
          tabs={[
            { id: "overview", label: "Overview", content: <p>Overview panel for locator practice.</p> },
            { id: "specs", label: "Specifications", content: <p>Specifications panel.</p> },
            { id: "assignments", label: "Assignments", content: <p>Assignments panel.</p> },
            { id: "maintenance", label: "Maintenance", content: <p>Maintenance panel.</p> },
            { id: "audit", label: "Audit", content: <p>Audit panel.</p> },
          ]}
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Browser tabs & side panels</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className="text-sm underline" href={appPath("assets")} target="_blank" rel="noopener noreferrer" data-testid="open-assets-tab">
            Open register in new tab
          </a>
          <a className="text-sm underline" href={appPath("vendors")} target="_blank" rel="noopener noreferrer">
            Open vendors in new tab
          </a>
          <Button type="button" size="sm" onClick={() => setHelpSheetOpen(true)}>Help documentation panel</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setTransferSheetOpen(true)}>
            Transfer reason panel
          </Button>
          <a className="text-sm underline" href="https://example.com" target="_blank" rel="noopener noreferrer">
            External policy page
          </a>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Embedded Asset Information (iframe)</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => setFrameKey((k) => k + 1)}>Reload frame</Button>
        </div>
        <div className="mt-3">
          <AppFrame key={frameKey} title="Embedded asset information" src="frames/asset-info.html" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Same-origin frame at <code>{frameUrl("frames/asset-info.html")}</code></p>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Side panels & auth</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => setRetireSheetOpen(true)}>Retire confirm panel</Button>
          <Button type="button" size="sm" onClick={() => setTransferSheetOpen(true)}>Transfer form panel</Button>
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>HTML dialog</Button>
          <Button type="button" size="sm" onClick={() => setModalOpen(true)}>Modal dialog</Button>
          <Link className="text-sm underline" to={appPath("secure/asset-register")} target="_blank" rel="noopener noreferrer">
            Basic Auth asset register
          </Link>
          <Link className="text-sm underline" to={appPath("secure/maintenance-docs")} target="_blank" rel="noopener noreferrer">
            Basic Auth maintenance docs
          </Link>
        </div>
        <details className="mt-4">
          <summary className="text-sm font-medium">Native browser dialogs (automation training only)</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => window.alert("Asset registered (training)")}>JS alert</Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (window.confirm("Retire training asset?")) window.alert("Retired (synthetic)")
              }}
            >
              JS confirm
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const reason = window.prompt("Enter transfer reason")
                if (reason) window.alert(`Reason: ${reason}`)
              }}
            >
              JS prompt
            </Button>
          </div>
        </details>
      </section>

      <NativeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Add asset (dialog)">
        <p className="text-sm">Native <code>&lt;dialog&gt;</code> example for automation practice.</p>
      </NativeDialog>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Unsaved changes">
        <p className="text-sm">Modal with aria-modal for focus practice.</p>
      </Modal>

      <ConfirmSheet
        open={retireSheetOpen}
        onOpenChange={setRetireSheetOpen}
        title="Retire training asset?"
        description="This is a side-panel confirmation used in the product UI."
        confirmLabel="Retire"
        tone="destructive"
        onConfirm={() => undefined}
      />

      <Sheet open={transferSheetOpen} onOpenChange={setTransferSheetOpen}>
        <SheetContent side="right" className="w-[min(100%,28rem)]" data-testid="practice-transfer-sheet">
          <SheetHeader>
            <SheetTitle>Transfer reason</SheetTitle>
            <SheetDescription>Side panel form instead of a browser prompt.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="practice-transfer-reason">Reason</Label>
              <Textarea
                id="practice-transfer-reason"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Why is this asset moving?"
                rows={4}
              />
            </div>
            <Button
              type="button"
              disabled={!transferReason.trim()}
              onClick={() => {
                setTransferSheetOpen(false)
                setTransferReason("")
              }}
            >
              Confirm transfer
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={helpSheetOpen} onOpenChange={setHelpSheetOpen}>
        <SheetContent side="right" className="w-[min(100%,28rem)]">
          <SheetHeader>
            <SheetTitle>Asset documentation</SheetTitle>
            <SheetDescription>Help content in a slide-over panel.</SheetDescription>
          </SheetHeader>
          <div className="space-y-2 text-sm">
            <p>Use Assignments → Transfer to move assets with a validated reason.</p>
            <p>Maintenance work orders use status transition buttons and a completion panel.</p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
