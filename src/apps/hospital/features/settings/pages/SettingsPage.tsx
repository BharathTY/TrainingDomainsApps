import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ROLE_LABEL, type Role } from "@/apps/hospital/config/permissions"
import { useUiStore } from "@/apps/hospital/stores/ui-store"
import { Button } from "@/components/ui/button"
import { ApiError, api } from "@/shared/lib/api-client"

export function SettingsPage() {
  const role = useUiStore((state) => state.role)
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)
  const allowed = role === "admin"

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Signed in as {ROLE_LABEL[role as Role] ?? role}.</p>
      </header>
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Reset training data</h2>
        <p className="mt-1 text-sm text-muted-foreground">Restores synthetic doctors, patients, wards, appointments, and admissions.</p>
        <Button
          type="button"
          className="mt-3"
          data-testid="reset-hospital-data"
          disabled={!allowed || pending}
          onClick={() => {
            setPending(true)
            void api("/api/reset", { method: "POST" })
              .then(async () => {
                toast("MediCare demo data restored")
                await queryClient.invalidateQueries({ queryKey: ["hospital"] })
              })
              .catch((error: unknown) => toast(error instanceof ApiError ? error.message : "Reset failed"))
              .finally(() => setPending(false))
          }}
        >
          Reset training data
        </Button>
        {allowed ? null : <p className="mt-2 text-sm text-muted-foreground">Only administrators can reset data.</p>}
      </section>
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">API docs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          OpenAPI: <code className="text-xs">/api/hospital/v1/openapi.json</code>
        </p>
      </section>
    </div>
  )
}
