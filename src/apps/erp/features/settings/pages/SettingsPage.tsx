import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ROLE_LABEL, type Role } from "@/apps/erp/config/permissions"
import { useUiStore } from "@/apps/erp/stores/ui-store"
import { Button } from "@/components/ui/button"
import { ApiError, api } from "@/shared/lib/api-client"

export function SettingsPage() {
  const role = useUiStore((state) => state.role)
  const organizationId = useUiStore((state) => state.organizationId)
  const setOrganizationId = useUiStore((state) => state.setOrganizationId)
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)
  const allowed = role === "sysadmin" || role === "orgadmin"

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {ROLE_LABEL[role as Role] ?? role}. Backend enforces permissions independently of this UI.
        </p>
      </header>
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Organization</h2>
        <p className="mt-1 text-sm text-muted-foreground">Selector for multi-entity practice (seeded legal entity under QSpiders).</p>
        <label className="mt-3 grid max-w-sm gap-1.5 text-sm" htmlFor="org-select">
          Active organization
          <select
            id="org-select"
            className="h-9 rounded-md border border-input bg-background px-2"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
          >
            <option value="org-qspiders">QSpiders Practice Group</option>
          </select>
        </label>
      </section>
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Demo data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Restores the ERP Postgres seed (finance, HR, ops, workflows). Sessions for this app are cleared by the reset endpoint.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Tax rates and statutory payroll components are demo-configurable only — not validated as jurisdiction-compliant.
        </p>
        <Button
          type="button"
          className="mt-3"
          disabled={!allowed || pending}
          onClick={() => {
            setPending(true)
            void api("/api/reset", { method: "POST" })
              .then(async () => {
                toast("ERP demo data restored")
                await queryClient.invalidateQueries({ queryKey: ["erp"] })
              })
              .catch((error: unknown) => {
                toast(error instanceof ApiError ? error.message : "Could not reset demo data")
              })
              .finally(() => setPending(false))
          }}
        >
          Reset demo data
        </Button>
        {allowed ? null : <p className="mt-2 text-sm text-muted-foreground">Only system/org administrators can reset demo data.</p>}
      </section>
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">API docs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          OpenAPI stub: <code className="text-xs">/api/erp/v1/openapi.json</code>
        </p>
      </section>
    </div>
  )
}
