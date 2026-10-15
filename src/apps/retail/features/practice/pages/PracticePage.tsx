import { useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "@/apps/retail/components/PageHeader"
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
  { feature: "Login RBAC", screen: "login", level: 1, exercise: "Sign in as admin, storemgr, cashier, inventory, purchaser." },
  { feature: "Dashboard KPIs", screen: "dashboard", level: 1, exercise: "Switch store and read today sales, low stock, and chart." },
  { feature: "POS checkout", screen: "pos", level: 2, exercise: "Add items, apply coupon, cash tender, complete sale." },
  { feature: "Suspend sale", screen: "pos", level: 2, exercise: "Suspend cart without stock deduction." },
  { feature: "Product CRUD", screen: "products", level: 2, exercise: "Create SKU; duplicate barcode should fail." },
  { feature: "Inventory adjust", screen: "inventory", level: 2, exercise: "Adjust stock via drawer confirm panel." },
  { feature: "Stock transfer", screen: "inventory", level: 3, exercise: "Transfer between stores with reason." },
  { feature: "Supplier CRUD", screen: "suppliers", level: 2, exercise: "Add supplier; duplicate email rejected." },
  { feature: "Purchase order", screen: "purchases", level: 3, exercise: "Create PO, submit, approve, receive goods." },
  { feature: "Sales return", screen: "sales", level: 3, exercise: "Return partial quantity with restock disposition." },
  { feature: "Promotion coupon", screen: "promotions", level: 2, exercise: "Create timed coupon and use at POS." },
  { feature: "Reports export", screen: "reports", level: 2, exercise: "Filter dates and export CSV." },
  { feature: "Iframe supplier portal", screen: "practice", level: 4, exercise: "Submit supplier frame form." },
  { feature: "Nested frames", screen: "practice", level: 4, exercise: "Navigate nested-host → inventory preview." },
  { feature: "Basic Auth drawer", screen: "secure/cash-drawer", level: 3, exercise: "admin / admin@123 on cash drawer vault." },
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
        description="HTML Learning Lab and browser automation scenarios for Retail RMS — synthetic data only."
      />
      <PracticeSheet title="Scenario catalogue" rows={scenarios} />

      <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="html-lab-heading">
        <h2 id="html-lab-heading" className="text-sm font-semibold">
          HTML Learning Lab
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Inspect simple → advanced controls in a retail form context.</p>
        <form className="mt-3 grid gap-3 md:grid-cols-2" data-testid="training-form" onSubmit={(e) => e.preventDefault()}>
          <fieldset className="grid gap-2 rounded border border-border p-3 md:col-span-2">
            <legend>Quick SKU intake</legend>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-name">Product name</Label>
              <Input id="lab-name" name="lab-name" required minLength={2} autoComplete="off" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-sku">SKU</Label>
              <Input id="lab-sku" name="lab-sku" required pattern="[A-Z0-9-]+" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-price">Selling price</Label>
              <Input id="lab-price" name="lab-price" type="number" min={0} step={0.01} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-expiry">Expiry date</Label>
              <Input id="lab-expiry" name="lab-expiry" type="date" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-restock">Restock time</Label>
              <Input id="lab-restock" name="lab-restock" type="time" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-promo-start">Promo window</Label>
              <Input id="lab-promo-start" name="lab-promo-start" type="datetime-local" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lab-barcode">Barcode</Label>
              <Input id="lab-barcode" name="lab-barcode" type="text" list="barcode-list" />
              <datalist id="barcode-list">
                <option value="8901000000001" />
                <option value="8901000000002" />
              </datalist>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="discount-eligible" value="yes" /> Discount eligible (training)
            </label>
            <div>
              <span className="text-sm">Unit</span>
              <div className="mt-1 flex gap-3">
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" name="unit" value="pcs" defaultChecked /> pcs
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" name="unit" value="kg" /> kg
                </label>
              </div>
            </div>
          </fieldset>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">In-app tabs</h2>
        <Tabs
          tabs={[
            { id: "overview", label: "Overview", content: <p>Store overview panel for locator practice.</p> },
            { id: "pos", label: "POS", content: <p>POS workflow notes panel.</p> },
            { id: "inventory", label: "Inventory", content: <p>Stock movement panel.</p> },
            { id: "procurement", label: "Procurement", content: <p>PO lifecycle panel.</p> },
          ]}
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Browser tabs & side panels</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className="text-sm underline" href={appPath("pos")} target="_blank" rel="noopener noreferrer" data-testid="open-pos-tab">
            Open POS in new tab
          </a>
          <a className="text-sm underline" href={appPath("products")} target="_blank" rel="noopener noreferrer">
            Open products in new tab
          </a>
          <Button type="button" size="sm" onClick={() => setHelpSheetOpen(true)}>
            Help documentation panel
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setVoidFormOpen(true)}>
            Void transaction panel
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={() => setVoidConfirmOpen(true)}>
            Void confirm panel
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Supplier portal (iframe)</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => setFrameKey((k) => k + 1)}>
            Reload frame
          </Button>
        </div>
        <div className="mt-3">
          <AppFrame key={frameKey} title="Supplier portal" src="frames/supplier-portal.html" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Same-origin frame at <code>{frameUrl("frames/supplier-portal.html")}</code>
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Nested frames host</h2>
        <AppFrame title="Nested retail host" src="frames/nested-host.html" />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Support widget</h2>
        <AppFrame title="Support widget" src="frames/support-widget.html" />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Side panels & auth</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
            HTML dialog
          </Button>
          <Button type="button" size="sm" onClick={() => setModalOpen(true)}>
            Modal dialog
          </Button>
          <Link className="text-sm underline" to={appPath("secure/cash-drawer")} target="_blank" rel="noopener noreferrer" data-testid="basic-auth-cash-drawer">
            Basic Auth cash drawer
          </Link>
        </div>
        <details className="mt-4">
          <summary className="text-sm font-medium">Native browser dialogs (automation training only)</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => window.alert("Sale completed (training)")}>
              JS alert
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (window.confirm("Void training transaction?")) window.alert("Void recorded (synthetic)")
              }}
            >
              JS confirm
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const reason = window.prompt("Enter void reason")
                if (reason) window.alert(`Reason: ${reason}`)
              }}
            >
              JS prompt
            </Button>
          </div>
        </details>
      </section>

      <NativeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Price override (dialog)">
        <p className="text-sm">Native dialog example for automation practice.</p>
      </NativeDialog>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Unsaved cart">
        <p className="text-sm">Modal with aria-modal for focus practice.</p>
      </Modal>

      <ConfirmSheet
        open={voidConfirmOpen}
        onOpenChange={setVoidConfirmOpen}
        title="Void training transaction?"
        description="Side-panel confirmation used in retail training flows."
        confirmLabel="Void"
        tone="destructive"
        onConfirm={() => undefined}
      />

      <Sheet open={helpSheetOpen} onOpenChange={setHelpSheetOpen}>
        <SheetContent side="right" className="w-[min(100%,28rem)]">
          <SheetHeader>
            <SheetTitle>Retail documentation</SheetTitle>
            <SheetDescription>Help content in a slide-over panel.</SheetDescription>
          </SheetHeader>
          <div className="space-y-2 text-sm">
            <p>Use POS → Checkout for completed sales; Suspend keeps stock untouched.</p>
            <p>Purchase orders receive stock via the Receive goods panel.</p>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={voidFormOpen} onOpenChange={setVoidFormOpen}>
        <SheetContent side="right" className="w-[min(100%,28rem)]" data-testid="practice-void-sheet">
          <SheetHeader>
            <SheetTitle>Void reason</SheetTitle>
            <SheetDescription>Side panel form instead of a browser prompt.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="practice-void-reason">Reason</Label>
              <Textarea
                id="practice-void-reason"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Why void this transaction?"
                rows={4}
              />
            </div>
            <Button
              type="button"
              disabled={!voidReason.trim()}
              onClick={() => {
                setVoidFormOpen(false)
                setVoidReason("")
              }}
            >
              Confirm void
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
