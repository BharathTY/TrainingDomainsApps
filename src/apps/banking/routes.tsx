import { DEMO_USERS } from "@/apps/banking/demo-users"
import { PracticeApp } from "@/shell/PracticeApp"

export default function BankingApp() {
  return <PracticeApp appId="banking" users={DEMO_USERS} />
}
