import { toast } from "sonner"
import { EmptyState } from "@/shared/EmptyState"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { Button } from "@/components/ui/button"
import { can, moduleById, type ModuleId } from "@/apps/schoolmanagement/config/permissions"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function ModulePlaceholder({ moduleId }: { moduleId: ModuleId }) {
  const role = useUiStore((state) => state.role)
  const module = moduleById(moduleId)

  if (!can(role, moduleId, "view")) {
    return <EmptyState title="No access" description="Your account cannot open this module." />
  }

  const create = () => toast(`${module.label} will be built in the next phase.`)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title={module.label}
        description={module.description}
        actions={can(role, moduleId, "create") ? <Button onClick={create}>Create</Button> : undefined}
      />
      <EmptyState
        title={`No ${module.label.toLowerCase()} yet`}
        description="The screen is wired. Records, filters, and forms land in the next phase."
        actionLabel={can(role, moduleId, "create") ? "Create" : undefined}
        onAction={can(role, moduleId, "create") ? create : undefined}
      />
    </div>
  )
}
