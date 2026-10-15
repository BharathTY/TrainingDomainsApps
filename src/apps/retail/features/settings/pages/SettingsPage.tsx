import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ROLE_LABEL, type Role } from "@/apps/retail/config/permissions"
import { useUiStore } from "@/apps/retail/stores/ui-store"
import { Button } from "@/components/ui/button"
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { ApiError, api } from "@/shared/lib/api-client"

export function SettingsPage() {
  const role = useUiStore((state) => state.role)
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const allowed = role === "admin"

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Signed in as {ROLE_LABEL[role as Role] ?? role}.</p>
      </header>
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Reset training data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Restores synthetic products, inventory, suppliers, purchase orders, sales, and customers.
        </p>
        <Button
          type="button"
          className="mt-3"
          data-testid="reset-retail-data"
          disabled={!allowed || pending}
          onClick={() => setResetOpen(true)}
        >
          Reset training data
        </Button>
        {allowed ? null : <p className="mt-2 text-sm text-muted-foreground">Only administrators can reset data.</p>}
      </section>
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">API docs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          OpenAPI: <code className="text-xs">/api/retail/v1/openapi.json</code>
        </p>
      </section>

      <ConfirmSheet
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset training data?"
        description="This replaces the current Retail RMS dataset with the seeded synthetic baseline. Your in-progress edits will be lost."
        confirmLabel={pending ? "Resetting…" : "Reset data"}
        tone="destructive"
        onConfirm={async () => {
          setPending(true)
          try {
            await api("/api/reset", { method: "POST" })
            toast.success("Retail demo data restored")
            await queryClient.invalidateQueries({ queryKey: ["retail"] })
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Reset failed")
            throw error
          } finally {
            setPending(false)
          }
        }}
      />
    </div>
  )
}
