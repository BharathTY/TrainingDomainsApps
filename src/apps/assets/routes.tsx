import { DEMO_USERS } from "@/apps/assets/demo-users"
import { PracticeApp } from "@/shell/PracticeApp"

export default function AssetsApp() {
  return <PracticeApp appId="assets" users={DEMO_USERS} />
}
