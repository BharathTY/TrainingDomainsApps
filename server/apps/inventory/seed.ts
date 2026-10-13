import { DEMO_USERS } from "../../../src/apps/inventory/demo-users"
import type { AppDatabase } from "../../shared/db"
import { seedUsers } from "../../shared/users"
import { ensureInventorySchema, inventoryIsSeeded, seedInventoryDomain, seedSampleDocuments } from "./domain-seed"

export async function seed(db: AppDatabase) {
  await seedUsers(db, DEMO_USERS)
  await seedInventoryDomain(db)
}

export async function prepareInventory(db: AppDatabase) {
  await ensureInventorySchema(db)
  const upsert = db.prepare(
    "INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?) ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, name = EXCLUDED.name, role = EXCLUDED.role",
  )
  for (const user of DEMO_USERS) await upsert.run(user.username, user.password, user.name, user.role)
  if (!(await inventoryIsSeeded(db))) await seedInventoryDomain(db)
  const orders = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM purchase_orders")
  if (Number(orders[0]?.n ?? 0) === 0) await seedSampleDocuments(db)
}

export { DEMO_USERS }
