import { EmptyState } from "@/shared/EmptyState"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { can } from "@/apps/schoolmanagement/config/permissions"
import { CollectionPanel } from "@/apps/schoolmanagement/features/fees/components/CollectionPanel"
import { DefaultersPanel } from "@/apps/schoolmanagement/features/fees/components/DefaultersPanel"
import { StructurePanel } from "@/apps/schoolmanagement/features/fees/components/StructurePanel"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function FeesPage() {
  const role = useUiStore((state) => state.role)
  const permissionVersion = useUiStore((state) => state.permissionVersion)
  void permissionVersion
  const allowed = can(role, "fees", "view")
  const canCreate = can(role, "fees", "create")
  const canEdit = can(role, "fees", "edit")
  const canDelete = can(role, "fees", "delete")
  const canExport = can(role, "fees", "export")
  const personal = role === "parent"

  if (!allowed) {
    return <EmptyState title="No access" description="Your account cannot open this module." />
  }

  if (personal) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <PageHeader title="Fees" description="Dues and receipts for your child." />
        <CollectionPanel personal canCollect={false} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Fees" description="Set the structure, collect payments, and follow up on dues." />
      <Tabs defaultValue="collect">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="collect">Collect</TabsTrigger>
          <TabsTrigger value="defaulters">Defaulters</TabsTrigger>
          {canEdit ? <TabsTrigger value="structure">Structure</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="collect">
          <CollectionPanel personal={false} canCollect={canCreate} />
        </TabsContent>
        <TabsContent value="defaulters">
          <DefaultersPanel canRemind={canCreate} canExport={canExport} />
        </TabsContent>
        {canEdit ? (
          <TabsContent value="structure">
            <StructurePanel canEdit={canEdit} canDelete={canDelete} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}
