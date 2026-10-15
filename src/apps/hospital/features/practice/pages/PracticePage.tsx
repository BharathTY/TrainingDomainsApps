import { useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "@/apps/hospital/components/PageHeader"
import { Button } from "@/components/ui/button"
import { NativeDialog } from "@/shared/NativeDialog"
import { Modal } from "@/shared/Modal"
import { PracticePage as PracticeSheet, type PracticeRow } from "@/shared/PracticePage"
import { Tabs } from "@/shared/Tabs"
import { AppFrame, frameUrl } from "@/shared/frames"
import { openAppPopup, openPopup } from "@/shared/popup"
import { appPath } from "@/shared/lib/app-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const scenarios: PracticeRow[] = [
  { feature: "Login RBAC", screen: "login", level: 1, exercise: "Sign in as admin, receptionist, wardmgr, billing, doctor, student." },
  { feature: "Dashboard KPIs", screen: "dashboard", level: 1, exercise: "Read bed availability and today's appointments from live data." },
  { feature: "Register patient", screen: "patients", level: 2, exercise: "Create a patient; duplicate phone should fail." },
  { feature: "Schedule appointment", screen: "appointments", level: 2, exercise: "Book a slot; overlapping doctor time should conflict." },
  { feature: "Calendar day select", screen: "calendar", level: 2, exercise: "Switch month/week/day and select a date cell." },
  { feature: "Admit / discharge", screen: "admissions", level: 3, exercise: "Admit to an available bed, then discharge and verify bed available." },
  { feature: "Transfer bed", screen: "admissions", level: 3, exercise: "Transfer with confirm dialog; verify bed board." },
  { feature: "Cancel via prompt", screen: "appointments", level: 3, exercise: "Use Cancel via prompt (confirm + prompt)." },
  { feature: "In-app profile tabs", screen: "practice", level: 2, exercise: "Switch Overview / Appointments / Billing tabs below." },
  { feature: "New browser tab", screen: "practice", level: 3, exercise: "Open doctor directory in a new tab and switch back." },
  { feature: "Popup window", screen: "practice", level: 3, exercise: "Open appointment receipt popup and close it." },
  { feature: "Nested iframes", screen: "practice", level: 4, exercise: "Enter patient summary → doctor directory → nested appointments." },
  { feature: "HTML dialog", screen: "practice", level: 2, exercise: "Open native dialog and modal examples." },
  { feature: "Basic Auth vault", screen: "secure/medical-records", level: 3, exercise: "admin / admin@123 on medical records." },
  { feature: "Reset data", screen: "settings", level: 1, exercise: "Reset training data as admin." },
]

export function PracticePage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [frameKey, setFrameKey] = useState(0)
  const [showErrorFrame, setShowErrorFrame] = useState(false)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title="Automation Training Lab"
        description="MediCare HMS scenarios for Selenium/Playwright — synthetic data only."
      />
      <PracticeSheet title="Scenario catalogue" rows={scenarios} />

      <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="html-lab-heading">
        <h2 id="html-lab-heading" className="text-sm font-semibold">Basic HTML & forms lab</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-2" data-testid="training-form" onSubmit={(e) => e.preventDefault()}>
          <fieldset className="grid gap-2 rounded border border-border p-3 md:col-span-2">
            <legend>Patient quick form</legend>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-name">Full name</Label>
              <Input id="lab-name" name="lab-name" required minLength={2} autoComplete="name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-email">Email</Label>
              <Input id="lab-email" name="lab-email" type="email" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-phone">Phone</Label>
              <Input id="lab-phone" name="lab-phone" type="tel" pattern="[0-9]{10}" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-dob">Date of birth</Label>
              <Input id="lab-dob" name="lab-dob" type="date" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-time">Preferred time</Label>
              <Input id="lab-time" name="lab-time" type="time" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-when">Appointment datetime</Label>
              <Input id="lab-when" name="lab-when" type="datetime-local" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-month">Visit month</Label>
              <Input id="lab-month" name="lab-month" type="month" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-week">Visit week</Label>
              <Input id="lab-week" name="lab-week" type="week" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-url">Portal URL</Label>
              <Input id="lab-url" name="lab-url" type="url" placeholder="https://example.com" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-file">Upload ID (fake)</Label>
              <Input id="lab-file" name="lab-file" type="file" accept=".pdf,image/*" multiple />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-pain">Pain scale</Label>
              <Input id="lab-pain" name="lab-pain" type="range" min={0} max={10} defaultValue={3} />
              <output htmlFor="lab-pain">Training meter only</output>
            </div>
            <div>
              <Label>Visit type</Label>
              <div className="mt-1 flex gap-3">
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" name="visit-type" value="new" defaultChecked /> New
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" name="visit-type" value="followup" /> Follow-up
                </label>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="consent" value="yes" /> Consent recorded (training)
            </label>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-dept">Department</Label>
              <input id="lab-dept" name="lab-dept" list="dept-list" className="h-9 rounded-md border border-input px-2 text-sm" />
              <datalist id="dept-list">
                <option value="General Medicine" />
                <option value="Cardiology" />
                <option value="Pediatrics" />
              </datalist>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-ward">Ward preference</Label>
              <select id="lab-ward" name="lab-ward" className="h-9 rounded-md border border-input px-2 text-sm">
                <optgroup label="Inpatient">
                  <option value="general">General</option>
                  <option value="icu">ICU</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="private">Private</option>
                </optgroup>
              </select>
            </div>
            <progress value={40} max={100} aria-label="Form completion">40%</progress>
            <meter min={0} max={100} value={70} aria-label="Bed occupancy demo">70%</meter>
          </fieldset>
        </form>
        <details className="mt-3">
          <summary>Advanced locator notes</summary>
          <p className="mt-2 text-sm text-muted-foreground">Prefer role/name, label, and data-testid over brittle CSS classes.</p>
        </details>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">In-app tabs (profile pattern)</h2>
        <Tabs
          tabs={[
            { id: "overview", label: "Overview", content: <p>Overview panel — switch tabs to practice role/name locators.</p> },
            { id: "personal", label: "Personal Details", content: <p>Personal details panel for automation practice.</p> },
            { id: "appointments", label: "Appointments", content: <p>Appointments panel — mirror of doctor/patient profiles.</p> },
            { id: "admission", label: "Admission History", content: <p>Admission history panel.</p> },
            { id: "billing", label: "Billing", content: <p>Billing panel with synthetic invoice summaries.</p> },
            { id: "activity", label: "Activity Log", content: <p>Activity log panel.</p> },
          ]}
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Browser tabs & popups</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className="underline text-sm" href={appPath("doctors")} target="_blank" rel="noopener noreferrer" data-testid="open-doctors-tab">
            Open doctors in new tab
          </a>
          <Button type="button" size="sm" onClick={() => openAppPopup("reports")}>Open reports window</Button>
          <Button type="button" size="sm" onClick={() => openPopup(appPath("appointments"), { name: "appt-receipt", width: 640, height: 480 })}>
            Appointment receipt popup
          </Button>
          <a className="underline text-sm" href="https://example.com" target="_blank" rel="noopener noreferrer">
            External mock policy
          </a>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              window.setTimeout(() => openAppPopup("dashboard"), 1500)
            }}
          >
            Delayed popup (1.5s)
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Frame handling lab</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => setFrameKey((k) => k + 1)}>Reload frames</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowErrorFrame((v) => !v)}>
            Toggle unavailable frame
          </Button>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <AppFrame key={`sum-${frameKey}`} title="Patient summary frame" src="frames/patient-summary.html" />
          <AppFrame key={`doc-${frameKey}`} title="Doctor directory frame" src="frames/doctors.html" />
          <AppFrame key={`bill-${frameKey}`} title="Billing form frame" src="frames/billing-form.html" />
          {showErrorFrame ? (
            <AppFrame title="Unavailable frame" src="frames/unavailable.html" />
          ) : (
            <AppFrame key={`nest-${frameKey}`} title="Nested appointments host" src="frames/nested-host.html" />
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Frame URLs resolve under <code>{frameUrl("frames/index.html")}</code> (same origin).
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Dialogs & auth</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => window.alert("Training action succeeded")}>JS alert</Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (window.confirm("Delete training record?")) window.alert("Deleted (synthetic)")
            }}
          >
            JS confirm
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const reason = window.prompt("Enter transfer reason")
              if (reason) window.alert(`Reason: ${reason}`)
            }}
          >
            JS prompt
          </Button>
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>HTML dialog</Button>
          <Button type="button" size="sm" onClick={() => setModalOpen(true)}>Modal dialog</Button>
          <Link className="text-sm underline" to={appPath("secure/medical-records")} target="_blank" rel="noopener noreferrer">
            Basic Auth medical records
          </Link>
          <Link className="text-sm underline" to={appPath("secure/billing-vault")} target="_blank" rel="noopener noreferrer">
            Basic Auth billing vault
          </Link>
        </div>
        <address className="mt-3 text-xs text-muted-foreground">MediCare Training Campus · Demo City</address>
      </section>

      <NativeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Schedule appointment (dialog)">
        <p className="text-sm">Native <code>&lt;dialog&gt;</code> example for automation practice.</p>
      </NativeDialog>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Unsaved changes">
        <p className="text-sm">Modal with aria-modal for focus trap practice.</p>
        <Button type="button" className="mt-3" onClick={() => setModalOpen(false)}>Dismiss</Button>
      </Modal>
    </div>
  )
}
