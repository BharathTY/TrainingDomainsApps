import type { AppDatabase } from "./db"

export type DemoAccount = {
  username: string
  password: string
  name: string
  role: string
}

export async function seedUsers(db: AppDatabase, users: DemoAccount[]) {
  await db.exec("DELETE FROM sessions")
  await db.exec("DELETE FROM users")
  const insert = db.prepare("INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)")
  for (const user of users) await insert.run(user.username, user.password, user.name, user.role)
}

export async function userCount(db: AppDatabase) {
  const row = await db.prepare("SELECT COUNT(*)::int AS n FROM users").get()
  return Number(row?.n ?? 0)
}
