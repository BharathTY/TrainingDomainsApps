import type { Express } from "express"
import { appMeta } from "../../../src/apps/meta"
import { basicAuth } from "../../shared/basic-auth"
import type { AppDatabase } from "../../shared/db"
import { registerApp } from "../../shared/register-app"
import { registerInventoryApi } from "./domain-routes"
import { seedInventoryDomain } from "./domain-seed"
import { DEMO_USERS, prepareInventory } from "./seed"

export async function register(app: Express, db: AppDatabase) {
  const meta = appMeta("inventory")
  app.get("/inventory/secure/stock-valuation", basicAuth(meta), async (_req, res, next) => {
    try {
      const rows = await db.query<{ name: string; value: number }>(
        `SELECT w.name, COALESCE(SUM(b.qty * i.unit_cost), 0)::float AS value
         FROM warehouses w
         LEFT JOIN stock_balances b ON b.warehouse_id = w.id
         LEFT JOIN items i ON i.id = b.item_id AND i.deleted_at IS NULL
         WHERE w.deleted_at IS NULL
         GROUP BY w.id, w.name ORDER BY w.name`,
      )
      const body = rows.map((row) => `<tr><td>${row.name}</td><td>${Number(row.value).toFixed(0)}</td></tr>`).join("")
      res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>Stock valuation</title></head>
  <body>
    <h1>Stock valuation</h1>
    <p>Weighted average value by warehouse. This page asks for HTTP Basic Auth.</p>
    <table>
      <caption>Warehouse value</caption>
      <thead><tr><th scope="col">Warehouse</th><th scope="col">Value</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body>
</html>`)
    } catch (error) {
      next(error)
    }
  })
  await registerApp(app, meta, db, DEMO_USERS, {
    onReady: () => prepareInventory(db),
    onReset: () => seedInventoryDomain(db),
  })

  app.get("/api/inventory/dashboard", async (_req, res, next) => {
    try {
      const [items, lowStock, nearExpiry, warehouses, trend] = await Promise.all([
        db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM items WHERE deleted_at IS NULL"),
        db.query<{ n: number }>(`
          SELECT COUNT(*)::int AS n FROM (
            SELECT i.id
            FROM items i
            LEFT JOIN stock_balances b ON b.item_id = i.id
            WHERE i.deleted_at IS NULL
            GROUP BY i.id, i.reorder_level
            HAVING COALESCE(SUM(b.qty), 0) <= i.reorder_level
          ) low
        `),
        db.query<{ n: number }>(`
          SELECT COUNT(*)::int AS n FROM batches
          WHERE qty > 0 AND expires_on <= CURRENT_DATE + 90
        `),
        db.query<{ name: string; value: number }>(`
          SELECT w.name, COALESCE(SUM(b.qty * i.unit_cost), 0)::float AS value
          FROM warehouses w
          LEFT JOIN stock_balances b ON b.warehouse_id = w.id
          LEFT JOIN items i ON i.id = b.item_id AND i.deleted_at IS NULL
          WHERE w.deleted_at IS NULL
          GROUP BY w.id, w.name
          ORDER BY w.name
        `),
        db.query<{ month: string; inward: number; outward: number }>(`
          SELECT to_char(occurred_on, 'YYYY-MM') AS month,
                 COALESCE(SUM(qty) FILTER (WHERE direction = 'in'), 0)::int AS inward,
                 COALESCE(SUM(qty) FILTER (WHERE direction = 'out'), 0)::int AS outward
          FROM stock_ledger
          GROUP BY 1
          ORDER BY 1
        `),
      ])
      const stockValue = warehouses.reduce((sum, row) => sum + Number(row.value), 0)
      res.json({
        items: Number(items[0]?.n ?? 0),
        stockValue,
        lowStock: Number(lowStock[0]?.n ?? 0),
        nearExpiry: Number(nearExpiry[0]?.n ?? 0),
        warehouses: warehouses.map((row) => ({ name: row.name, value: Number(row.value) })),
        trend,
      })
    } catch (error) {
      next(error)
    }
  })

  registerInventoryApi(app, db)
}
