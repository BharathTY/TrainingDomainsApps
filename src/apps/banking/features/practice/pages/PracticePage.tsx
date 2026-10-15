import { useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "@/apps/banking/components/PageHeader"
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
  { feature: "Login RBAC", screen: "login", level: 1, exercise: "Sign in as admin, priya, arjun, teller, manager." },
  { feature: "Dashboard KPIs", screen: "dashboard", level: 1, exercise: "Read total balance, recent txns, and announcements modal." },
  { feature: "Mask account numbers", screen: "accounts", level: 1, exercise: "Toggle show/mask account numbers." },
  { feature: "Account detail tabs", screen: "accounts/:id", level: 2, exercise: "Open nested tabs for overview and branch info." },
  { feature: "Own-account transfer", screen: "transfers", level: 2, exercise: "Transfer between savings and current with review confirm." },
  { feature: "Insufficient funds", screen: "transfers", level: 2, exercise: "Enter amount above available balance and assert error." },
  { feature: "Re-auth high value", screen: "transfers", level: 3, exercise: "Transfer ≥ ₹50,000 and complete re-auth modal." },
  { feature: "Scheduled transfer", screen: "transfers", level: 2, exercise: "Pick datetime-local and frequency monthly." },
  { feature: "Simulate failure", screen: "transfers", level: 3, exercise: "Choose Training outcome = fail and handle toast." },
  { feature: "Receipt window", screen: "transfers", level: 3, exercise: "Open receipt in popup window and print." },
  { feature: "Statement filters", screen: "statements", level: 2, exercise: "Custom date range, credit filter, pagination." },
  { feature: "Transaction dialog", screen: "statements", level: 2, exercise: "Open txn details modal from reference link." },
  { feature: "Beneficiary CRUD", screen: "beneficiaries", level: 2, exercise: "Add, favorite, edit, delete with confirm sheet." },
  { feature: "Scheduled cancel", screen: "scheduled", level: 2, exercise: "Create schedule then cancel with confirmation." },
  { feature: "Profile unsaved", screen: "profile", level: 3, exercise: "Edit address and trigger beforeunload warning." },
  { feature: "Session timeout", screen: "dashboard", level: 3, exercise: "Wait for session timeout dialog (10 min idle)." },
  { feature: "Basic Auth vault", screen: "secure/vault-statements", level: 3, exercise: "admin / admin@123 on statement vault." },
  { feature: "Help center iframe", screen: "practice", level: 4, exercise: "Submit help form inside banking help frame." },
  { feature: "Nested frames", screen: "practice", level: 4, exercise: "Navigate nested-host → summary → filter." },
  { feature: "Native dialogs", screen: "practice", level: 3, exercise: "Accept/dismiss alert, confirm, and prompt." },
  { feature: "Reset data", screen: "settings", level: 1, exercise: "Reset training data as admin." },
]

export function PracticePage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [frameKey, setFrameKey] = useState(0)
  const [helpSheetOpen, setHelpSheetOpen] = useState(false)
  const [voidFormOpen, setVoidFormOpen] = useState(false)
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false)
  const [voidReason, setVoidReason] = useState("")

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title="Automation Practice Lab"
        description="HTML Learning Lab and browser automation scenarios for Demo National Bank — synthetic data only."
      />
      <PracticeSheet title="Scenario catalogue" rows={scenarios} />

      <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="html-lab-heading">
        <h2 id="html-lab-heading" className="text-sm font-semibold">
          HTML Learning Lab
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Inspect simple → advanced controls in a banking form context.</p>
        <form className="mt-3 grid gap-3 md:grid-cols-2" data-testid="training-form" onSubmit={(e) => e.preventDefault()}>
          <fieldset className="grid gap-2 rounded border border-border p-3 md:col-span-2">
            <legend>Quick beneficiary intake</legend>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-name">Payee name</Label>
              <Input id="lab-name" name="lab-name" required minLength={2} autoComplete="off" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-account">Account number</Label>
              <Input id="lab-account" name="lab-account" required pattern="[0-9]{9,18}" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-amount">Amount</Label>
              <Input id="lab-amount" name="lab-amount" type="number" min={1} step={1} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-date">Value date</Label>
              <Input id="lab-date" name="lab-date" type="date" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-time">Cut-off time</Label>
              <Input id="lab-time" name="lab-time" type="time" />
            </div>
            <div className="grid gap-1.5 md:col-span-2">
              <Label htmlFor="lab-notes">Notes</Label>
              <Textarea id="lab-notes" name="lab-notes" rows={2} />
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="lab-favorite" /> Favorite
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="lab-channel" value="neft" defaultChecked /> NEFT
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="lab-channel" value="imps" /> IMPS
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Validate</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  window.alert("Validated (simulated)")
                  const ok = window.confirm("Continue to modal practice?")
                  if (ok) {
                    const reason = window.prompt("Enter a note", "ok")
                    if (reason) setDialogOpen(true)
                  }
                }}
              >
                Native JS dialogs
              </Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(true)}>
                Modal
              </Button>
              <Button type="button" variant="outline" onClick={() => setHelpSheetOpen(true)}>
                Help sheet
              </Button>
              <Button type="button" variant="outline" onClick={() => setVoidFormOpen(true)}>
                Void reason
              </Button>
            </div>
          </fieldset>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Frames</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setFrameKey((k) => k + 1)}>
            Reload frames
          </Button>
          <Link className="text-sm underline" to="/banking/secure/vault-statements" target="_blank" rel="noopener noreferrer">
            Basic Auth statement vault
          </Link>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Frame base: <code>{frameUrl("frames/help-center.html")}</code>
        </p>
        <div className="mt-3">
          <Tabs
            tabs={[
              {
                id: "help",
                label: "Help center",
                content: <AppFrame key={`help-${frameKey}`} title="Help center" src="frames/help-center.html" />,
              },
              {
                id: "summary",
                label: "Txn summary",
                content: <AppFrame key={`sum-${frameKey}`} title="Transaction summary" src="frames/txn-summary.html" />,
              },
              {
                id: "nested",
                label: "Nested frames",
                content: <AppFrame key={`nest-${frameKey}`} title="Nested host" src="frames/nested-host.html" />,
              },
              {
                id: "education",
                label: "Financial education",
                content: <AppFrame key={`edu-${frameKey}`} title="Education" src="frames/education.html" />,
              },
            ]}
          />
        </div>
      </section>

      <NativeDialog open={dialogOpen} title="HTML dialog" onClose={() => setDialogOpen(false)}>
        <p>Native &lt;dialog&gt; element for banking training.</p>
      </NativeDialog>
      <Modal open={modalOpen} title="Banking notice" onClose={() => setModalOpen(false)}>
        <p className="text-sm">Acknowledge this synthetic banking notice for dialog practice.</p>
        <Button type="button" className="mt-3" onClick={() => setModalOpen(false)}>
          Acknowledge
        </Button>
      </Modal>
      <Sheet open={helpSheetOpen} onOpenChange={setHelpSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Side help</SheetTitle>
            <SheetDescription>Drawer with banking tips for locator practice.</SheetDescription>
          </SheetHeader>
          <p className="text-sm">Use account nicknames when selecting source accounts in transfers.</p>
          <p className="mt-2 text-sm">
            <Link className="underline" to={appPath("transfers")}>
              Go to transfers
            </Link>
          </p>
        </SheetContent>
      </Sheet>
      <ConfirmSheet
        open={voidFormOpen}
        onOpenChange={setVoidFormOpen}
        title="Enter void reason"
        description="Practice nested confirm after collecting a reason."
        confirmLabel="Continue"
        onConfirm={async () => {
          const reason = window.prompt("Reason for voiding the draft transfer?", voidReason) ?? ""
          setVoidReason(reason)
          if (reason) setVoidConfirmOpen(true)
        }}
      />
      <ConfirmSheet
        open={voidConfirmOpen}
        onOpenChange={setVoidConfirmOpen}
        title="Confirm void"
        description={`Void with reason: ${voidReason || "—"}`}
        confirmLabel="Void"
        tone="destructive"
        onConfirm={async () => {
          window.alert("Draft transfer voided (simulated).")
        }}
      />
    </div>
  )
}
