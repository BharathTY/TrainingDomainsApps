import { DEMO_USERS } from "../../../src/apps/banking/demo-users"
import type { AppDatabase } from "../../shared/db"
import { seedUsers } from "../../shared/users"
import { bankingIsSeeded, ensureBankingSchema, seedBankingDomain } from "./domain-seed"

export async function seed(db: AppDatabase) {
  await seedUsers(db, DEMO_USERS)
  await seedBankingDomain(db)
}

export async function prepareBankingApp(db: AppDatabase) {
  await ensureBankingSchema(db)
  const upsert = db.prepare(
    "INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?) ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, name = EXCLUDED.name, role = EXCLUDED.role",
  )
  for (const user of DEMO_USERS) await upsert.run(user.username, user.password, user.name, user.role)
  if (!(await bankingIsSeeded(db))) await seedBankingDomain(db)
}

export { DEMO_USERS }
