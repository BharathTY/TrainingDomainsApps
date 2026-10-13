import { randomUUID } from "node:crypto"
import type { Express, Request, Response } from "express"
import { z } from "zod"
import type { AppDatabase } from "../../shared/db"
import { readCookie } from "../../shared/cookies"

const itemBody = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  barcode: z.string().min(1),
  categoryId: z.string().min(1),
  supplierId: z.string().min(1),
  uom: z.string().min(1),
  reorderLevel: z.coerce.number().int().min(0),
  unitCost: z.coerce.number().positive(),
})

export function registerInventoryApi(app: Express, db: AppDatabase) {
  async function actor(req: Request) {
    const sid = readCookie(req.headers.cookie, "sid_inventory")
    if (!sid) return undefined
    const rows = await db.query<{ username: string; role: string }>(
      `SELECT users.username, users.role FROM sessions JOIN users ON users.username = sessions.username WHERE sessions.id = ?`,
      [sid],
    )
    return rows[0]
  }

  async function signedIn(req: Request, res: Response) {
    const user = await actor(req)
    if (!user) {
      res.status(401).json({ message: "Sign in required" })
      return undefined
    }
    return user
  }

  async function applyQty(itemId: string, warehouseId: string, delta: number, direction: "in" | "out", occurredOn: string) {
    const existing = await db.query<{ id: string; qty: number }>(
      "SELECT id, qty FROM stock_balances WHERE item_id = ? AND warehouse_id = ?",
      [itemId, warehouseId],
    )
    const next = (existing[0]?.qty ?? 0) + delta
    if (next < 0) return { ok: false as const, message: "Not enough stock in that warehouse" }
    if (existing[0]) await db.prepare("UPDATE stock_balances SET qty = ? WHERE id = ?").run(next, existing[0].id)
    else await db.prepare("INSERT INTO stock_balances (id, item_id, warehouse_id, qty) VALUES (?, ?, ?, ?)").run(randomUUID(), itemId, warehouseId, next)
    await db.prepare("INSERT INTO stock_ledger (id, item_id, warehouse_id, direction, qty, occurred_on) VALUES (?, ?, ?, ?, ?, ?)").run(
      randomUUID(),
      itemId,
      warehouseId,
      direction,
      Math.abs(delta),
      occurredOn,
    )
    const item = await db.query<{ reorder_level: number }>("SELECT reorder_level FROM items WHERE id = ?", [itemId])
    const held = await db.query<{ qty: number }>("SELECT COALESCE(SUM(qty), 0)::int AS qty FROM stock_balances WHERE item_id = ?", [itemId])
    return { ok: true as const, belowReorder: Number(held[0]?.qty ?? 0) <= Number(item[0]?.reorder_level ?? 0), onHand: next }
  }

  app.get("/api/inventory/items", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const rows = await db.query(
        `SELECT i.id, i.sku, i.name, i.barcode, c.name AS "categoryName", s.name AS "supplierName",
                i.uom, i.reorder_level AS "reorderLevel", i.unit_cost::float AS "unitCost",
                COALESCE(SUM(b.qty), 0)::int AS "onHand"
         FROM items i
         JOIN categories c ON c.id = i.category_id
         JOIN suppliers s ON s.id = i.supplier_id
         LEFT JOIN stock_balances b ON b.item_id = i.id
         WHERE i.deleted_at IS NULL
         GROUP BY i.id, c.name, s.name
         ORDER BY i.sku`,
      )
      res.json(rows)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/items/:id", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const id = String(req.params.id)
      const item = await db.query(
        `SELECT i.id, i.sku, i.name, i.barcode, i.category_id AS "categoryId", c.name AS "categoryName",
                i.supplier_id AS "supplierId", s.name AS "supplierName", s.city AS "supplierCity", s.phone AS "supplierPhone",
                i.uom, i.reorder_level AS "reorderLevel", i.unit_cost::float AS "unitCost"
         FROM items i
         JOIN categories c ON c.id = i.category_id
         JOIN suppliers s ON s.id = i.supplier_id
         WHERE i.id = ? AND i.deleted_at IS NULL`,
        [id],
      )
      if (!item[0]) {
        res.status(404).json({ message: "Item not found" })
        return
      }
      const [stock, batches, movements] = await Promise.all([
        db.query(
          `SELECT w.name AS warehouse, b.qty FROM stock_balances b JOIN warehouses w ON w.id = b.warehouse_id WHERE b.item_id = ? ORDER BY w.name`,
          [id],
        ),
        db.query(
          `SELECT id, batch_no AS "batchNo", manufactured_on AS "manufacturedOn", expires_on AS "expiresOn", qty, warehouse_id AS "warehouseId"
           FROM batches WHERE item_id = ? ORDER BY expires_on`,
          [id],
        ),
        db.query(
          `SELECT l.id, l.direction, l.qty, l.occurred_on AS "occurredOn", w.name AS warehouse
           FROM stock_ledger l JOIN warehouses w ON w.id = l.warehouse_id
           WHERE l.item_id = ? ORDER BY l.occurred_on DESC LIMIT 50`,
          [id],
        ),
      ])
      res.json({ item: item[0], stock, batches, movements })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/inventory/items", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const body = itemBody.parse(req.body)
      const id = randomUUID()
      await db.prepare(
        "INSERT INTO items (id, sku, name, barcode, category_id, supplier_id, uom, reorder_level, unit_cost, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)",
      ).run(id, body.sku, body.name, body.barcode, body.categoryId, body.supplierId, body.uom, body.reorderLevel, body.unitCost)
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/inventory/items/:id/delete", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      await db.prepare("UPDATE items SET deleted_at = ? WHERE id = ?").run(new Date().toISOString(), String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/categories", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const rows = await db.query<{ id: string; name: string; parent_id: string | null }>(
        "SELECT id, name, parent_id FROM categories WHERE deleted_at IS NULL ORDER BY name",
      )
      res.json(rows)
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/inventory/categories", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const body = z.object({ name: z.string().min(1), parentId: z.string().optional() }).parse(req.body)
      const id = randomUUID()
      await db.prepare("INSERT INTO categories (id, name, parent_id, deleted_at) VALUES (?, ?, ?, NULL)").run(id, body.name, body.parentId ?? null)
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/suppliers", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      res.json(await db.query("SELECT id, name, city, phone, email FROM suppliers WHERE deleted_at IS NULL ORDER BY name"))
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/inventory/suppliers", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const body = z.object({ name: z.string().min(1), city: z.string().min(1), phone: z.string().min(10), email: z.string().email() }).parse(req.body)
      const id = randomUUID()
      await db.prepare("INSERT INTO suppliers (id, name, city, phone, email, deleted_at) VALUES (?, ?, ?, ?, ?, NULL)").run(id, body.name, body.city, body.phone, body.email)
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/warehouses", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      res.json(
        await db.query(
          `SELECT w.id, w.name, w.city, COALESCE(SUM(b.qty * i.unit_cost), 0)::float AS value
           FROM warehouses w
           LEFT JOIN stock_balances b ON b.warehouse_id = w.id
           LEFT JOIN items i ON i.id = b.item_id AND i.deleted_at IS NULL
           WHERE w.deleted_at IS NULL
           GROUP BY w.id ORDER BY w.name`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/warehouses/:id/tree", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const id = String(req.params.id)
      const [zones, racks, bins] = await Promise.all([
        db.query<{ id: string; name: string }>("SELECT id, name FROM zones WHERE warehouse_id = ? ORDER BY name", [id]),
        db.query<{ id: string; zone_id: string; name: string }>("SELECT r.id, r.zone_id, r.name FROM racks r JOIN zones z ON z.id = r.zone_id WHERE z.warehouse_id = ? ORDER BY r.name", [id]),
        db.query<{ id: string; rack_id: string; name: string }>(
          "SELECT b.id, b.rack_id, b.name FROM bins b JOIN racks r ON r.id = b.rack_id JOIN zones z ON z.id = r.zone_id WHERE z.warehouse_id = ? ORDER BY b.name",
          [id],
        ),
      ])
      res.json({ zones, racks, bins })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/grns", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      res.json(
        await db.query(
          `SELECT g.id, g.received_on AS "receivedOn", w.name AS warehouse, COALESCE(SUM(l.qty), 0)::int AS qty
           FROM grns g JOIN warehouses w ON w.id = g.warehouse_id
           LEFT JOIN grn_lines l ON l.grn_id = g.id
           WHERE g.deleted_at IS NULL
           GROUP BY g.id, w.name ORDER BY g.received_on DESC`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/inventory/grns", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const body = z.object({
        warehouseId: z.string().min(1),
        purchaseOrderId: z.string().optional(),
        receivedOn: z.string().min(1),
        lines: z.array(z.object({
          itemId: z.string().min(1),
          qty: z.coerce.number().int().positive(),
          batchNo: z.string().min(1),
          manufacturedOn: z.string().min(1),
          expiresOn: z.string().min(1),
        })).min(1),
      }).parse(req.body)
      for (const line of body.lines) {
        if (line.expiresOn <= line.manufacturedOn) {
          res.status(400).json({ message: "Expiry must be after the manufacture date" })
          return
        }
      }
      const grnId = randomUUID()
      await db.prepare("INSERT INTO grns (id, purchase_order_id, warehouse_id, received_on, deleted_at) VALUES (?, ?, ?, ?, NULL)").run(
        grnId,
        body.purchaseOrderId ?? null,
        body.warehouseId,
        body.receivedOn,
      )
      for (const line of body.lines) {
        const batchId = randomUUID()
        await db.prepare("INSERT INTO batches (id, item_id, warehouse_id, batch_no, manufactured_on, expires_on, qty) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
          batchId, line.itemId, body.warehouseId, line.batchNo, line.manufacturedOn, line.expiresOn, line.qty,
        )
        await db.prepare("INSERT INTO grn_lines (id, grn_id, item_id, batch_id, qty) VALUES (?, ?, ?, ?, ?)").run(randomUUID(), grnId, line.itemId, batchId, line.qty)
        const applied = await applyQty(line.itemId, body.warehouseId, line.qty, "in", body.receivedOn)
        if (!applied.ok) {
          res.status(400).json({ message: applied.message })
          return
        }
      }
      res.status(201).json({ id: grnId })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/issues", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      res.json(
        await db.query(
          `SELECT s.id, i.sku, i.name, w.name AS warehouse, s.qty, s.issued_on AS "issuedOn"
           FROM issues s JOIN items i ON i.id = s.item_id JOIN warehouses w ON w.id = s.warehouse_id
           WHERE s.deleted_at IS NULL ORDER BY s.issued_on DESC`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/inventory/issues", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const body = z.object({ warehouseId: z.string(), itemId: z.string(), qty: z.coerce.number().int().positive(), issuedOn: z.string() }).parse(req.body)
      const applied = await applyQty(body.itemId, body.warehouseId, -body.qty, "out", body.issuedOn)
      if (!applied.ok) {
        res.status(400).json({ message: applied.message })
        return
      }
      const id = randomUUID()
      await db.prepare("INSERT INTO issues (id, warehouse_id, item_id, qty, issued_on, deleted_at) VALUES (?, ?, ?, ?, ?, NULL)").run(id, body.warehouseId, body.itemId, body.qty, body.issuedOn)
      res.status(201).json({ id, belowReorder: applied.belowReorder })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/transfers", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      res.json(
        await db.query(
          `SELECT t.id, f.name AS "fromWarehouse", d.name AS "toWarehouse", t.status, t.moved_on AS "movedOn"
           FROM transfers t
           JOIN warehouses f ON f.id = t.from_warehouse_id
           JOIN warehouses d ON d.id = t.to_warehouse_id
           WHERE t.deleted_at IS NULL ORDER BY t.moved_on DESC NULLS LAST`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/inventory/transfers", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const body = z.object({
        fromWarehouseId: z.string(),
        toWarehouseId: z.string(),
        movedOn: z.string(),
        lines: z.array(z.object({ itemId: z.string(), qty: z.coerce.number().int().positive() })).min(1),
      }).parse(req.body)
      if (body.fromWarehouseId === body.toWarehouseId) {
        res.status(400).json({ message: "Choose two different warehouses" })
        return
      }
      const id = randomUUID()
      await db.prepare("INSERT INTO transfers (id, from_warehouse_id, to_warehouse_id, status, moved_on, deleted_at) VALUES (?, ?, ?, 'moved', ?, NULL)").run(
        id, body.fromWarehouseId, body.toWarehouseId, body.movedOn,
      )
      for (const line of body.lines) {
        const out = await applyQty(line.itemId, body.fromWarehouseId, -line.qty, "out", body.movedOn)
        if (!out.ok) {
          res.status(400).json({ message: out.message })
          return
        }
        await applyQty(line.itemId, body.toWarehouseId, line.qty, "in", body.movedOn)
        await db.prepare("INSERT INTO transfer_lines (id, transfer_id, item_id, qty) VALUES (?, ?, ?, ?)").run(randomUUID(), id, line.itemId, line.qty)
      }
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/adjustments", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      res.json(
        await db.query(
          `SELECT a.id, i.sku, i.name, w.name AS warehouse, a.qty, a.reason_code AS "reasonCode", a.adjusted_on AS "adjustedOn"
           FROM adjustments a JOIN items i ON i.id = a.item_id JOIN warehouses w ON w.id = a.warehouse_id
           WHERE a.deleted_at IS NULL ORDER BY a.adjusted_on DESC`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/inventory/adjustments", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const body = z.object({
        warehouseId: z.string(),
        itemId: z.string(),
        qty: z.coerce.number().int(),
        reasonCode: z.string().min(1),
        adjustedOn: z.string(),
      }).parse(req.body)
      if (body.qty === 0) {
        res.status(400).json({ message: "Quantity cannot be zero" })
        return
      }
      const applied = await applyQty(body.itemId, body.warehouseId, body.qty, body.qty > 0 ? "in" : "out", body.adjustedOn)
      if (!applied.ok) {
        res.status(400).json({ message: applied.message })
        return
      }
      const id = randomUUID()
      await db.prepare("INSERT INTO adjustments (id, warehouse_id, item_id, qty, reason_code, adjusted_on, deleted_at) VALUES (?, ?, ?, ?, ?, ?, NULL)").run(
        id, body.warehouseId, body.itemId, body.qty, body.reasonCode, body.adjustedOn,
      )
      res.status(201).json({ id, belowReorder: applied.belowReorder })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/inventory/adjustments/:id/delete", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      await db.prepare("UPDATE adjustments SET deleted_at = ? WHERE id = ?").run(new Date().toISOString(), String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/reason-codes", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      res.json(await db.query("SELECT code, label FROM reason_codes ORDER BY label"))
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/reorder", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      res.json(
        await db.query(
          `SELECT i.id, i.sku, i.name, i.reorder_level AS "reorderLevel", COALESCE(SUM(b.qty), 0)::int AS "onHand", s.name AS supplier
           FROM items i
           LEFT JOIN stock_balances b ON b.item_id = i.id
           JOIN suppliers s ON s.id = i.supplier_id
           WHERE i.deleted_at IS NULL
           GROUP BY i.id, s.name
           HAVING COALESCE(SUM(b.qty), 0) <= i.reorder_level
           ORDER BY i.sku`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/purchase-orders", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      res.json(
        await db.query(
          `SELECT p.id, s.name AS supplier, w.name AS warehouse, p.status, p.expected_on AS "expectedOn"
           FROM purchase_orders p JOIN suppliers s ON s.id = p.supplier_id JOIN warehouses w ON w.id = p.warehouse_id
           WHERE p.deleted_at IS NULL ORDER BY p.expected_on`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/inventory/purchase-orders", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const body = z.object({
        supplierId: z.string(),
        warehouseId: z.string(),
        expectedOn: z.string(),
        lines: z.array(z.object({ itemId: z.string(), qty: z.coerce.number().int().positive() })).min(1),
      }).parse(req.body)
      const id = randomUUID()
      await db.prepare("INSERT INTO purchase_orders (id, supplier_id, warehouse_id, status, expected_on, deleted_at) VALUES (?, ?, ?, 'open', ?, NULL)").run(
        id, body.supplierId, body.warehouseId, body.expectedOn,
      )
      for (const line of body.lines) {
        await db.prepare("INSERT INTO po_lines (id, purchase_order_id, item_id, qty) VALUES (?, ?, ?, ?)").run(randomUUID(), id, line.itemId, line.qty)
      }
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/cycle-counts", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      res.json(
        await db.query(
          `SELECT c.id, w.name AS warehouse, c.scheduled_on AS "scheduledOn", c.status
           FROM cycle_counts c JOIN warehouses w ON w.id = c.warehouse_id
           WHERE c.deleted_at IS NULL ORDER BY c.scheduled_on`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/inventory/cycle-counts", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const body = z.object({ warehouseId: z.string(), scheduledOn: z.string() }).parse(req.body)
      const id = randomUUID()
      await db.prepare("INSERT INTO cycle_counts (id, warehouse_id, scheduled_on, status, deleted_at) VALUES (?, ?, ?, 'scheduled', NULL)").run(id, body.warehouseId, body.scheduledOn)
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/calendar", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const [counts, expiries, deliveries] = await Promise.all([
        db.query<{ date: string; title: string }>("SELECT scheduled_on AS date, 'Cycle count' AS title FROM cycle_counts WHERE deleted_at IS NULL"),
        db.query<{ date: string; title: string }>(
          `SELECT b.expires_on AS date, i.sku || ' expires' AS title FROM batches b JOIN items i ON i.id = b.item_id WHERE b.qty > 0 AND b.expires_on <= CURRENT_DATE + 120`,
        ),
        db.query<{ date: string; title: string }>("SELECT expected_on AS date, 'PO delivery' AS title FROM purchase_orders WHERE deleted_at IS NULL AND expected_on IS NOT NULL"),
      ])
      res.json([
        ...counts.map((row) => ({ ...row, kind: "count" })),
        ...expiries.map((row) => ({ ...row, kind: "expiry" })),
        ...deliveries.map((row) => ({ ...row, kind: "delivery" })),
      ])
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/reports/ledger", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const asOn = typeof req.query.asOn === "string" ? req.query.asOn : "2026-10-01"
      res.json(
        await db.query(
          `SELECT l.occurred_on AS "occurredOn", i.sku, i.name, w.name AS warehouse, l.direction, l.qty
           FROM stock_ledger l JOIN items i ON i.id = l.item_id JOIN warehouses w ON w.id = l.warehouse_id
           WHERE l.occurred_on <= ?
           ORDER BY l.occurred_on DESC LIMIT 200`,
          [asOn],
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/reports/valuation", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      const rows = await db.query<{ sku: string; name: string; qty: number; unitCost: number; value: number }>(
        `SELECT i.sku, i.name, COALESCE(SUM(b.qty), 0)::int AS qty, i.unit_cost::float AS "unitCost",
                COALESCE(SUM(b.qty * i.unit_cost), 0)::float AS value
         FROM items i LEFT JOIN stock_balances b ON b.item_id = i.id
         WHERE i.deleted_at IS NULL
         GROUP BY i.id HAVING COALESCE(SUM(b.qty), 0) > 0
         ORDER BY value DESC LIMIT 50`,
      )
      const fifo = await db.query<{ sku: string; name: string; batchNo: string; qty: number; value: number }>(
        `SELECT i.sku, i.name, b.batch_no AS "batchNo", b.qty::int AS qty, (b.qty * i.unit_cost)::float AS value
         FROM batches b JOIN items i ON i.id = b.item_id
         WHERE i.deleted_at IS NULL AND b.qty > 0
         ORDER BY b.manufactured_on, i.sku LIMIT 50`,
      )
      res.json({ weightedAverage: rows, fifo })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/reports/ageing", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      res.json(
        await db.query(
          `SELECT CASE
             WHEN CURRENT_DATE - manufactured_on <= 30 THEN '0-30'
             WHEN CURRENT_DATE - manufactured_on <= 60 THEN '31-60'
             WHEN CURRENT_DATE - manufactured_on <= 90 THEN '61-90'
             ELSE '90+'
           END AS bucket,
           COALESCE(SUM(b.qty), 0)::int AS qty
           FROM batches b
           GROUP BY 1 ORDER BY 1`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/reports/expiry", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      res.json(
        await db.query(
          `SELECT i.sku, i.name, b.batch_no AS "batchNo", b.expires_on AS "expiresOn", b.qty, w.name AS warehouse
           FROM batches b JOIN items i ON i.id = b.item_id JOIN warehouses w ON w.id = b.warehouse_id
           WHERE b.qty > 0 AND b.expires_on <= CURRENT_DATE + 90
           ORDER BY b.expires_on`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/inventory/reports/movements", async (req, res, next) => {
    try {
      if (!(await signedIn(req, res))) return
      res.json(
        await db.query(
          `SELECT l.occurred_on AS "occurredOn", i.sku, w.name AS warehouse, l.direction, l.qty
           FROM stock_ledger l JOIN items i ON i.id = l.item_id JOIN warehouses w ON w.id = l.warehouse_id
           ORDER BY l.occurred_on DESC LIMIT 100`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })
}
