import { DEMO_USERS } from "../../../src/apps/retail/demo-users"
import type { AppDatabase } from "../../shared/db"
import { seedUsers } from "../../shared/users"

export async function seed(db: AppDatabase) {
  await seedUsers(db, DEMO_USERS)
}

export { DEMO_USERS }
