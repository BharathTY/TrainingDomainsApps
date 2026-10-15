import { randomUUID } from "node:crypto"
import type { Request, Response } from "express"
import type { AppDatabase } from "../../shared/db"
import { readCookie } from "../../shared/cookies"
import { can, type ModuleAction } from "./rbac"

export type Actor = { username: string; role: string; name: string }

export async function actor(db: AppDatabase, req: Request): Promise<Actor | undefined> {
  const sid = readCookie(req.headers.cookie, "sid_banking")
  if (!sid) return undefined
  const rows = await db.query<{ username: string; role: string; name: string }>(
    `SELECT users.username, users.role, users.name
     FROM sessions JOIN users ON users.username = sessions.username
     WHERE sessions.id = ?`,
    [sid],
  )
  return rows[0]
}

export async function requireUser(db: AppDatabase, req: Request, res: Response) {
  const user = await actor(db, req)
  if (!user) {
    res.status(401).json({ message: "Sign in required", code: "UNAUTHENTICATED" })
    return undefined
  }
  return user
}

export async function requirePerm(db: AppDatabase, req: Request, res: Response, moduleId: string, action: ModuleAction) {
  const user = await requireUser(db, req, res)
  if (!user) return undefined
  if (!can(user.role, moduleId, action)) {
    res.status(403).json({ message: "Not allowed for this role", code: "FORBIDDEN", moduleId, action })
    return undefined
  }
  return user
}

export async function customerForUser(db: AppDatabase, username: string) {
  const rows = await db.query<{ id: string; full_name: string; customer_no: string }>(
    "SELECT id, full_name, customer_no FROM customers WHERE username = ?",
    [username],
  )
  return rows[0]
}

export async function resolveCustomerScope(db: AppDatabase, user: Actor, requestedCustomerId?: string) {
  if (user.role === "customer") {
    const own = await customerForUser(db, user.username)
    return own?.id
  }
  if (requestedCustomerId) return requestedCustomerId
  const own = await customerForUser(db, user.username)
  return own?.id
}

export async function logActivity(
  db: AppDatabase,
  opts: { entityType: string; entityId: string; action: string; details?: string; actor?: string },
) {
  await db
    .prepare("INSERT INTO activity_logs (id, entity_type, entity_id, action, details, actor) VALUES (?, ?, ?, ?, ?, ?)")
    .run(randomUUID(), opts.entityType, opts.entityId, opts.action, opts.details ?? null, opts.actor ?? null)
}

export function parsePaging(req: Request) {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 25) || 25))
  const q = String(req.query.q ?? "").trim().toLowerCase()
  return { page, pageSize, offset: (page - 1) * pageSize, q }
}

export function okList(res: Response, rows: unknown[], total: number, page: number, pageSize: number) {
  res.json({ data: rows, total, page, pageSize })
}

export function maskAccount(accountNo: string) {
  if (accountNo.length < 4) return "****"
  return `${"*".repeat(Math.max(0, accountNo.length - 4))}${accountNo.slice(-4)}`
}

export function txnRef() {
  return `TXN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

export function transferRef() {
  return `TRF${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}
