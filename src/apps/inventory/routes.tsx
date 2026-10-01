import { DEMO_USERS } from "@/apps/inventory/demo-users"
import { PracticeApp } from "@/shell/PracticeApp"

export default function InventoryApp() {
  return <PracticeApp appId="inventory" users={DEMO_USERS} />
}
