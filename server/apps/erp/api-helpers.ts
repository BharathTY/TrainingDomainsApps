import { randomUUID } from "node:crypto"
import type { Request, Response } from "express"
import type { AppDatabase } from "../../shared/db"
import { readCookie } from "../../shared/cookies"
import { can, type ModuleAction, sodAllowsPost } from "./rbac"

export type Actor = { username: string; role: string; name: string }

export async function actor(db: AppDatabase, req: Request): Promise<Actor | undefined> {
  const sid = readCookie(req.headers.cookie, "sid_erp")
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

export async function requirePerm(
  db: AppDatabase,
  req: Request,
  res: Response,
  moduleId: string,
  action: ModuleAction,
) {
  const user = await requireUser(db, req, res)
  if (!user) return undefined
  if (!can(user.role, moduleId, action)) {
    res.status(403).json({ message: "Not allowed for this role", code: "FORBIDDEN", moduleId, action })
    return undefined
  }
  return user
}

export async function audit(
  db: AppDatabase,
  opts: {
    organizationId?: string
    actor?: string
    action: string
    entityType: string
    entityId?: string
    details?: string
    correlationId?: string
  },
) {
  await db
    .prepare(
      `INSERT INTO audit_logs (id, organization_id, actor, action, entity_type, entity_id, details, correlation_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      opts.organizationId ?? null,
      opts.actor ?? null,
      opts.action,
      opts.entityType,
      opts.entityId ?? null,
      opts.details ?? null,
      opts.correlationId ?? randomUUID(),
    )
}

export async function notify(db: AppDatabase, username: string, title: string, body: string, linkPath?: string) {
  await db
    .prepare("INSERT INTO notifications (id, username, title, body, link_path) VALUES (?, ?, ?, ?, ?)")
    .run(randomUUID(), username, title, body, linkPath ?? null)
}

export function correlationId(req: Request) {
  const header = req.header("x-correlation-id")
  return header && header.trim() ? header.trim() : randomUUID()
}

export function parsePaging(req: Request) {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 25) || 25))
  const q = String(req.query.q ?? "").trim().toLowerCase()
  const sort = String(req.query.sort ?? "").trim()
  const dir = String(req.query.dir ?? "asc").toLowerCase() === "desc" ? "DESC" : "ASC"
  return { page, pageSize, offset: (page - 1) * pageSize, q, sort, dir }
}

export async function journalTotals(db: AppDatabase, journalId: string) {
  const rows = await db.query<{ debit: number; credit: number }>(
    `SELECT COALESCE(SUM(debit),0)::float AS debit, COALESCE(SUM(credit),0)::float AS credit
     FROM journal_lines WHERE journal_id = ?`,
    [journalId],
  )
  return { debit: Number(rows[0]?.debit ?? 0), credit: Number(rows[0]?.credit ?? 0) }
}

export async function assertBalanced(db: AppDatabase, journalId: string) {
  const totals = await journalTotals(db, journalId)
  if (Math.abs(totals.debit - totals.credit) > 0.001) {
    return { ok: false as const, message: `Journal is not balanced: debit ${totals.debit} credit ${totals.credit}`, totals }
  }
  if (totals.debit === 0) {
    return { ok: false as const, message: "Journal has no lines", totals }
  }
  return { ok: true as const, totals }
}

export { sodAllowsPost }

export async function adjustStock(
  db: AppDatabase,
  opts: {
    organizationId: string
    itemId: string
    warehouseId: string
    qty: number
    direction: "in" | "out"
    unitCost: number
    refType: string
    refId: string
    occurredOn: string
    actor: string
    allowNegative?: boolean
  },
) {
  const existing = await db.query<{ id: string; qty: number }>(
    "SELECT id, qty::float AS qty FROM stock_balances WHERE item_id = ? AND warehouse_id = ?",
    [opts.itemId, opts.warehouseId],
  )
  const delta = opts.direction === "in" ? opts.qty : -opts.qty
  const next = Number(existing[0]?.qty ?? 0) + delta
  if (next < 0 && !opts.allowNegative) {
    return { ok: false as const, message: "Negative inventory is not allowed by policy" }
  }
  if (existing[0]) {
    await db.prepare("UPDATE stock_balances SET qty = ? WHERE id = ?").run(next, existing[0].id)
  } else {
    await db
      .prepare("INSERT INTO stock_balances (id, item_id, warehouse_id, qty) VALUES (?, ?, ?, ?)")
      .run(randomUUID(), opts.itemId, opts.warehouseId, next)
  }
  await db
    .prepare(
      `INSERT INTO stock_ledger (id, organization_id, item_id, warehouse_id, direction, qty, unit_cost, ref_type, ref_id, occurred_on, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      opts.organizationId,
      opts.itemId,
      opts.warehouseId,
      opts.direction,
      opts.qty,
      opts.unitCost,
      opts.refType,
      opts.refId,
      opts.occurredOn,
      opts.actor,
    )
  return { ok: true as const, onHand: next }
}

export const DEFAULT_ORG = "org-qspiders"
