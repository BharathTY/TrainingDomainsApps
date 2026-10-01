import { DEMO_USERS } from "@/apps/erp/demo-users"
import { PracticeApp } from "@/shell/PracticeApp"

export default function ErpApp() {
  return <PracticeApp appId="erp" users={DEMO_USERS} />
}
