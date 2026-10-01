import { DEMO_USERS } from "@/apps/ecommerce/demo-users"
import { PracticeApp } from "@/shell/PracticeApp"

export default function EcommerceApp() {
  return <PracticeApp appId="ecommerce" users={DEMO_USERS} />
}
