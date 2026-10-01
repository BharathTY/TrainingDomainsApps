import { DEMO_USERS } from "@/apps/hospital/demo-users"
import { PracticeApp } from "@/shell/PracticeApp"

export default function HospitalApp() {
  return <PracticeApp appId="hospital" users={DEMO_USERS} />
}
