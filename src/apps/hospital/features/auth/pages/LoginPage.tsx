import { ROLES, type Role } from "@/apps/hospital/config/permissions"
import { DEMO_USERS } from "@/apps/hospital/demo-users"
import { useUiStore } from "@/apps/hospital/stores/ui-store"
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
