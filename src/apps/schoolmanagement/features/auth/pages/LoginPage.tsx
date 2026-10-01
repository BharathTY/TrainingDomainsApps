import { ROLES, type Role } from "@/apps/schoolmanagement/config/permissions"
import { DEMO_USERS } from "@/apps/schoolmanagement/features/auth/demo-users"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"
import { SessionLogin } from "@/shared/SessionLogin"

export function LoginPage() {
  const setRole = useUiStore((state) => state.setRole)
  return (
    <SessionLogin
      users={DEMO_USERS}
      onSignedIn={(user) => {
        if (ROLES.includes(user.role as Role)) setRole(user.role as Role)
      }}
    />
  )
}
