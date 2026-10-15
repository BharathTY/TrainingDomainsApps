import { DEMO_USERS } from "../../../src/apps/erp/demo-users"
import type { AppDatabase } from "../../shared/db"
import { seedUsers } from "../../shared/users"
import { ensureErpSchema, erpIsSeeded, seedErpDomain } from "./domain-seed"

export async function seed(db: AppDatabase) {
  await seedUsers(db, DEMO_USERS)
  await seedErpDomain(db)
}

export async function prepareErpApp(db: AppDatabase) {
  await ensureErpSchema(db)
  const upsert = db.prepare(
    "INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?) ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, name = EXCLUDED.name, role = EXCLUDED.role",
  )
  for (const user of DEMO_USERS) await upsert.run(user.username, user.password, user.name, user.role)
  if (!(await erpIsSeeded(db))) await seedErpDomain(db)
}

export { DEMO_USERS }
