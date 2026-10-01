import { EmptyState } from "@/shared/EmptyState"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { can } from "@/apps/schoolmanagement/config/permissions"
import { AnnouncementList } from "@/apps/schoolmanagement/features/communication/components/AnnouncementList"
import { HomeworkBoard } from "@/apps/schoolmanagement/features/communication/components/HomeworkBoard"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function CommunicationPage() {
  const role = useUiStore((state) => state.role)
  const permissionVersion = useUiStore((state) => state.permissionVersion)
  void permissionVersion
  const allowed = can(role, "communication", "view")
  const canCreate = can(role, "communication", "create")
  const canDelete = can(role, "communication", "delete")
  const canPostHomework = can(role, "academics", "create")

  if (!allowed) {
    return <EmptyState title="No access" description="Your account cannot open this module." />
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Communication" description="Announcements for an audience, and homework for a class." />
      <Tabs defaultValue="announcements">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="homework">Homework</TabsTrigger>
        </TabsList>
        <TabsContent value="announcements">
          <AnnouncementList role={role} canCreate={canCreate} canDelete={canDelete} />
        </TabsContent>
        <TabsContent value="homework">
          <HomeworkBoard role={role} canPost={canPostHomework} canDelete={canDelete} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
