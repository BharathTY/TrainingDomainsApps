import { EmptyState } from "@/shared/EmptyState"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { can } from "@/apps/schoolmanagement/config/permissions"
import { AcademicYearPanel } from "@/apps/schoolmanagement/features/settings/components/AcademicYearPanel"
import { PermissionMatrix } from "@/apps/schoolmanagement/features/settings/components/PermissionMatrix"
import { SchoolProfileForm } from "@/apps/schoolmanagement/features/settings/components/SchoolProfileForm"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function SettingsPage() {
  const role = useUiStore((state) => state.role)
  const permissionVersion = useUiStore((state) => state.permissionVersion)
  void permissionVersion
  const allowed = can(role, "settings", "view")
  const canEdit = can(role, "settings", "edit")

  if (!allowed) {
    return <EmptyState title="No access" description="Your account cannot open this module." />
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Settings" description="School profile, the academic year, and who can do what." />
      <Tabs defaultValue="profile">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="year">Academic year</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <SchoolProfileForm canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="year">
          <AcademicYearPanel canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="permissions">
          <PermissionMatrix canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
