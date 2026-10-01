import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ACTIONS, applyPermissionMatrix, MODULES, ROLE_LABEL, ROLES, type Action, type ModuleId, type Role } from "@/apps/schoolmanagement/config/permissions"
import { fetchPermissions, savePermissions, settingsKeys } from "@/apps/schoolmanagement/features/settings/api"
import type { PermissionMatrix as Matrix } from "@/apps/schoolmanagement/features/settings/types"
import { ApiError } from "@/shared/lib/api-client"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function PermissionMatrix({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: settingsKeys.permissions, queryFn: fetchPermissions })
  const [draft, setDraft] = useState<Matrix | null>(null)
  const [synced, setSynced] = useState<typeof query.data>(undefined)
  if (query.data && query.data !== synced) {
    setSynced(query.data)
    setDraft(structuredClone(query.data) as Matrix)
  }
  const save = useMutation({
    mutationFn: savePermissions,
    onSuccess: async (matrix) => {
      applyPermissionMatrix(matrix)
      useUiStore.getState().bumpPermissions()
      queryClient.setQueryData(settingsKeys.permissions, matrix)
      setDraft(matrix as Matrix)
      toast("Permissions saved")
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not save permissions"),
  })

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading the permission matrix…</p>
  if (query.isError || !draft) {
    return <EmptyState title="Could not load permissions" description="The matrix did not load." actionLabel="Retry" onAction={() => void query.refetch()} />
  }

  function toggle(role: Role, moduleId: ModuleId, action: Action, checked: boolean) {
    setDraft((current) => {
      if (!current) return current
      const next = structuredClone(current) as Matrix
      const list = new Set(next[role][moduleId] ?? [])
      if (checked) list.add(action)
      else list.delete(action)
      if (action !== "view" && checked && !list.has("view")) list.add("view")
      if (action === "view" && !checked) list.clear()
      next[role][moduleId] = ACTIONS.filter((item) => list.has(item))
      return next
    })
  }

  const locked = (role: Role, moduleId: ModuleId, action: Action) => role === "admin" && moduleId === "settings" && (action === "view" || action === "edit")

  return (
    <div className="grid gap-4">
      {ROLES.map((role) => (
        <section key={role} className="grid gap-2">
          <h2 className="text-sm font-semibold">{ROLE_LABEL[role]}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1 pr-2 font-medium">Module</th>
                  {ACTIONS.map((action) => (
                    <th key={action} className="px-2 py-1 font-medium capitalize">
                      {action}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((module) => (
                  <tr key={module.id} className="border-t border-border">
                    <th className="py-1.5 pr-2 text-left font-normal">{module.label}</th>
                    {ACTIONS.map((action) => {
                      const checked = draft[role][module.id]?.includes(action) ?? false
                      const disabled = !canEdit || locked(role, module.id, action)
                      return (
                        <td key={action} className="px-2 py-1.5">
                          <Checkbox
                            aria-label={`${ROLE_LABEL[role]} ${module.label} ${action}`}
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={(value) => toggle(role, module.id, action, value === true)}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {canEdit ? (
        <div>
          <Button type="button" disabled={save.isPending} onClick={() => save.mutate(draft)}>
            Save permissions
          </Button>
        </div>
      ) : null}
    </div>
  )
}
