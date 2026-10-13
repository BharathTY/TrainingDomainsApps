import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ROLE_LABEL, type Role } from "@/apps/inventory/config/permissions"
import { useUiStore } from "@/apps/inventory/stores/ui-store"
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
        <h2 className="text-sm font-semibold">Demo data</h2>
        <p className="mt-1 text-sm text-muted-foreground">Restore the StockWise seed in Postgres. This signs every StockWise session out.</p>
        <Button
          type="button"
          className="mt-3"
          disabled={!allowed || pending}
          onClick={() => {
            setPending(true)
            void api("/api/reset", { method: "POST" })
              .then(async () => {
                toast("Demo data restored")
                await queryClient.invalidateQueries({ queryKey: ["inventory", "dashboard"] })
              })
              .catch((error: unknown) => {
                toast(error instanceof ApiError ? error.message : "Could not reset demo data")
              })
              .finally(() => setPending(false))
          }}
        >
          Reset demo data
        </Button>
        {allowed ? null : <p className="mt-2 text-sm text-muted-foreground">Only an admin can reset demo data.</p>}
      </section>
    </div>
  )
}
