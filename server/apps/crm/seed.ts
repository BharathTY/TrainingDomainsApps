import { DEMO_USERS } from "../../../src/apps/crm/demo-users"
import type { AppDatabase } from "../../shared/db"
import { seedUsers } from "../../shared/users"
import { crmIsSeeded, ensureCrmSchema, seedCrmDomain } from "./domain-seed"

export async function seed(db: AppDatabase) {
  await seedUsers(db, DEMO_USERS)
  await seedCrmDomain(db)
}

export async function prepareCrmApp(db: AppDatabase) {
  await ensureCrmSchema(db)
  const upsert = db.prepare(
    "INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?) ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, name = EXCLUDED.name, role = EXCLUDED.role",
  )
  for (const user of DEMO_USERS) await upsert.run(user.username, user.password, user.name, user.role)
  if (!(await crmIsSeeded(db))) await seedCrmDomain(db)
}

export { DEMO_USERS }
