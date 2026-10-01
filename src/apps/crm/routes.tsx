import { DEMO_USERS } from "@/apps/crm/demo-users"
import { PracticeApp } from "@/shell/PracticeApp"

export default function CrmApp() {
  return <PracticeApp appId="crm" users={DEMO_USERS} />
}
