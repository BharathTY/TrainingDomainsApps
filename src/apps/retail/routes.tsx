import { DEMO_USERS } from "@/apps/retail/demo-users"
import { PracticeApp } from "@/shell/PracticeApp"

export default function RetailApp() {
  return <PracticeApp appId="retail" users={DEMO_USERS} />
}
