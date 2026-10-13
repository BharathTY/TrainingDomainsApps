import { fakerEN_IN as faker } from "@faker-js/faker"
import type { AppDatabase } from "../../shared/db"
import { INVENTORY_CLEAR, INVENTORY_TABLES } from "./schema"

const UOMS = ["Nos", "Kg", "L", "Box"]
const REASONS = [
  ["rc-damage", "DAMAGE", "Damage"],
  ["rc-expiry", "EXPIRY", "Expiry"],
  ["rc-count", "COUNT", "Count correction"],
  ["rc-writeoff", "WRITEOFF", "Write-off"],
] as const

type Statement = { sql: string; params?: unknown[] }

function addMonths(iso: string, months: number) {
  const date = new Date(`${iso}T00:00:00.000Z`)
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.toISOString().slice(0, 10)
}

export async function ensureInventorySchema(db: AppDatabase) {
  for (const sql of INVENTORY_TABLES) await db.exec(sql)
}

export async function seedInventoryDomain(db: AppDatabase) {
  for (const table of INVENTORY_CLEAR) await db.exec(`DELETE FROM ${table}`)

  faker.seed(20261001)
  const statements: Statement[] = []
  const categories = [
    ["cat-staples", "Staples", null],
    ["cat-rice", "Rice", "cat-staples"],
    ["cat-pulses", "Pulses", "cat-staples"],
    ["cat-bev", "Beverages", null],
    ["cat-tea", "Tea", "cat-bev"],
    ["cat-care", "Personal care", null],
    ["cat-soap", "Soap", "cat-care"],
    ["cat-home", "Household", null],
  ] as const
  for (const [id, name, parentId] of categories) {
    statements.push({ sql: "INSERT INTO categories (id, name, parent_id, deleted_at) VALUES (?, ?, ?, NULL)", params: [id, name, parentId] })
  }

  const supplierIds: string[] = []
  for (let index = 1; index <= 8; index += 1) {
    const id = `sup-${index}`
    supplierIds.push(id)
    statements.push({
      sql: "INSERT INTO suppliers (id, name, city, phone, email, deleted_at) VALUES (?, ?, ?, ?, ?, NULL)",
      params: [id, faker.company.name(), faker.location.city(), `9${faker.string.numeric(9)}`, faker.internet.email().toLowerCase()],
    })
  }

  const warehouses = [
    ["wh-1", "Bengaluru Central", "Bengaluru"],
    ["wh-2", "Mumbai Bhiwandi", "Mumbai"],
    ["wh-3", "Delhi Narela", "Delhi"],
  ] as const
  for (const [id, name, city] of warehouses) {
    statements.push({ sql: "INSERT INTO warehouses (id, name, city, deleted_at) VALUES (?, ?, ?, NULL)", params: [id, name, city] })
    for (const zone of ["A", "B"]) {
      const zoneId = `${id}-z${zone}`
      statements.push({ sql: "INSERT INTO zones (id, warehouse_id, name) VALUES (?, ?, ?)", params: [zoneId, id, `Zone ${zone}`] })
      for (const rack of ["1", "2"]) {
        const rackId = `${zoneId}-r${rack}`
        statements.push({ sql: "INSERT INTO racks (id, zone_id, name) VALUES (?, ?, ?)", params: [rackId, zoneId, `Rack ${rack}`] })
        for (const bin of ["01", "02"]) {
          statements.push({ sql: "INSERT INTO bins (id, rack_id, name) VALUES (?, ?, ?)", params: [`${rackId}-b${bin}`, rackId, `Bin ${bin}`] })
        }
      }
    }
  }

  for (const [id, code, label] of REASONS) {
    statements.push({ sql: "INSERT INTO reason_codes (id, code, label) VALUES (?, ?, ?)", params: [id, code, label] })
  }

  const leaves = categories.filter((row) => row[2]).map((row) => row[0])
  const warehouseIds = warehouses.map((row) => row[0])
  for (let index = 1; index <= 200; index += 1) {
    const id = `item-${index}`
    const sku = `IMS-${String(index).padStart(4, "0")}`
    const barcode = `890${String(1000000 + index)}`
    const categoryId = leaves[index % leaves.length]
    const supplierId = supplierIds[index % supplierIds.length]
    const reorder = 10 + (index % 8) * 10
    const unitCost = 25 + (index % 40) * 15
    statements.push({
      sql: "INSERT INTO items (id, sku, name, barcode, category_id, supplier_id, uom, reorder_level, unit_cost, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)",
      params: [id, sku, faker.commerce.productName(), barcode, categoryId, supplierId, UOMS[index % UOMS.length], reorder, unitCost],
    })
    const warehouseId = warehouseIds[index % warehouseIds.length]
    const qty = index % 11 === 0 ? Math.max(1, Math.floor(reorder / 2)) : reorder + 15 + (index % 30)
    statements.push({
      sql: "INSERT INTO stock_balances (id, item_id, warehouse_id, qty) VALUES (?, ?, ?, ?)",
      params: [`bal-${index}`, id, warehouseId, qty],
    })
    const manufactured = addMonths("2026-01-15", index % 6)
    const expires = addMonths(manufactured, index % 9 === 0 ? 2 : 12)
    statements.push({
      sql: "INSERT INTO batches (id, item_id, warehouse_id, batch_no, manufactured_on, expires_on, qty) VALUES (?, ?, ?, ?, ?, ?, ?)",
      params: [`batch-${index}`, id, warehouseId, `B${String(index).padStart(4, "0")}`, manufactured, expires, qty],
    })
    statements.push({
      sql: "INSERT INTO stock_ledger (id, item_id, warehouse_id, direction, qty, occurred_on) VALUES (?, ?, ?, 'in', ?, ?)",
      params: [`led-in-${index}`, id, warehouseId, qty + 5, addMonths("2026-06-01", index % 4)],
    })
    if (index % 3 === 0) {
      statements.push({
        sql: "INSERT INTO stock_ledger (id, item_id, warehouse_id, direction, qty, occurred_on) VALUES (?, ?, ?, 'out', ?, ?)",
        params: [`led-out-${index}`, id, warehouseId, 5, addMonths("2026-07-01", index % 3)],
      })
    }
  }

  await db.batch(statements)
  await seedSampleDocuments(db)
}

export async function seedSampleDocuments(db: AppDatabase) {
  const suppliers = await db.query<{ id: string }>("SELECT id FROM suppliers ORDER BY name LIMIT 3")
  const warehouses = await db.query<{ id: string }>("SELECT id FROM warehouses ORDER BY name")
  const items = await db.query<{ id: string }>("SELECT id FROM items ORDER BY sku LIMIT 6")
  if (!suppliers.length || !warehouses.length || !items.length) return
  const statements: Statement[] = []
  for (let index = 0; index < 3; index += 1) {
    const id = `po-sample-${index + 1}`
    statements.push({
      sql: "INSERT INTO purchase_orders (id, supplier_id, warehouse_id, status, expected_on, deleted_at) VALUES (?, ?, ?, 'open', ?, NULL)",
      params: [id, suppliers[index % suppliers.length].id, warehouses[index % warehouses.length].id, `2026-10-${String(8 + index).padStart(2, "0")}`],
    })
    statements.push({
      sql: "INSERT INTO po_lines (id, purchase_order_id, item_id, qty) VALUES (?, ?, ?, ?)",
      params: [`pol-${index + 1}`, id, items[index].id, 20 + index * 5],
    })
    const countId = `cc-sample-${index + 1}`
    statements.push({
      sql: "INSERT INTO cycle_counts (id, warehouse_id, scheduled_on, status, deleted_at) VALUES (?, ?, ?, 'scheduled', NULL)",
      params: [countId, warehouses[index % warehouses.length].id, `2026-10-${String(12 + index).padStart(2, "0")}`],
    })
  }
  await db.batch(statements)
}

export async function inventoryIsSeeded(db: AppDatabase) {
  const rows = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM items")
  return Number(rows[0]?.n ?? 0) > 0
}
