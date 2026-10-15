import { randomUUID } from "node:crypto"
import { faker } from "@faker-js/faker"
import type { AppDatabase } from "../../shared/db"
import { RETAIL_CLEAR, RETAIL_TABLES } from "./schema"

faker.seed(77)

export async function ensureRetailSchema(db: AppDatabase) {
  for (const sql of RETAIL_TABLES) await db.exec(sql)
}

export async function retailIsSeeded(db: AppDatabase) {
  const rows = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM products")
  return Number(rows[0]?.n ?? 0) > 0
}

function pad(n: number, w = 5) {
  return String(n).padStart(w, "0")
}

export async function seedRetailDomain(db: AppDatabase) {
  for (const table of RETAIL_CLEAR) await db.exec(`DELETE FROM ${table}`)

  const storeIds = ["store-1", "store-2", "store-3"]
  const stores = [
    { id: "store-1", code: "S01", name: "Indiranagar Super", city: "Bengaluru" },
    { id: "store-2", code: "S02", name: "Koramangala Mart", city: "Bengaluru" },
    { id: "store-3", code: "S03", name: "HSR Express", city: "Bengaluru" },
  ]
  for (const s of stores) {
    await db.prepare("INSERT INTO stores (id, code, name, city) VALUES (?, ?, ?, ?)").run(s.id, s.code, s.name, s.city)
  }

  const cats: { code: string; name: string; parent?: string }[] = [
    { code: "GROC", name: "Grocery" },
    { code: "BEV", name: "Beverages", parent: "GROC" },
    { code: "SNK", name: "Snacks", parent: "GROC" },
    { code: "PERS", name: "Personal care" },
    { code: "HOME", name: "Home care" },
    { code: "ELEC", name: "Electronics" },
  ]
  const catByCode = new Map<string, string>()
  for (const c of cats) {
    const id = `cat-${c.code.toLowerCase()}`
    catByCode.set(c.code, id)
    const parent = "parent" in c && c.parent ? catByCode.get(c.parent as string) ?? null : null
    await db
      .prepare("INSERT INTO categories (id, code, name, parent_id, active) VALUES (?, ?, ?, ?, TRUE)")
      .run(id, c.code, c.name, parent)
  }
  const categoryIds = [...catByCode.values()]

  const supplierIds: string[] = []
  for (let i = 0; i < 10; i++) {
    const id = `sup-${i + 1}`
    supplierIds.push(id)
    await db
      .prepare(
        `INSERT INTO suppliers (id, supplier_no, name, contact_person, email, phone, address, payment_terms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        `SUP${pad(i + 1)}`,
        faker.company.name(),
        faker.person.fullName(),
        faker.internet.email({ provider: "supplier.demo" }).toLowerCase(),
        `9${faker.string.numeric(9)}`,
        faker.location.streetAddress(),
        faker.helpers.arrayElement(["Net 15", "Net 30", "COD"]),
      )
  }

  const productIds: string[] = []
  for (let i = 0; i < 80; i++) {
    const id = `prd-${i + 1}`
    productIds.push(id)
    const cost = faker.number.int({ min: 20, max: 800 })
    const sell = Math.round(cost * faker.number.float({ min: 1.15, max: 1.6 }))
    const qtyBase = i < 5 ? faker.number.int({ min: 0, max: 4 }) : faker.number.int({ min: 5, max: 120 })
    await db
      .prepare(
        `INSERT INTO products (
          id, sku, barcode, name, description, brand, category_id, cost_price, selling_price, tax_rate,
          discount_eligible, unit, reorder_level, status, image_url, mfg_date, expiry_date, batch_no
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 18, TRUE, 'pcs', ?, 'active', ?, ?, ?, ?)`,
      )
      .run(
        id,
        `SKU${pad(i + 1)}`,
        `890${pad(i + 1, 10)}`,
        faker.commerce.productName(),
        faker.commerce.productDescription(),
        faker.company.name(),
        categoryIds[i % categoryIds.length],
        cost,
        sell,
        faker.helpers.arrayElement([5, 10, 15]),
        `https://api.dicebear.com/7.x/shapes/svg?seed=${i}`,
        faker.date.past({ years: 1 }).toISOString().slice(0, 10),
        faker.date.future({ years: 1 }).toISOString().slice(0, 10),
        `B${pad(i + 1, 4)}`,
      )
    for (const storeId of storeIds) {
      const qty = storeId === "store-1" ? qtyBase : faker.number.int({ min: 0, max: 80 })
      await db
        .prepare("INSERT INTO store_stock (id, store_id, product_id, quantity) VALUES (?, ?, ?, ?)")
        .run(randomUUID(), storeId, id, qty)
    }
  }

  for (let i = 0; i < 25; i++) {
    const id = `cus-${i + 1}`
    await db
      .prepare(
        `INSERT INTO customers (id, customer_no, name, phone, email, tier, loyalty_points, birthday, membership_expiry)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        `C${pad(i + 1)}`,
        faker.person.fullName(),
        `98${pad(i + 1, 8)}`,
        faker.internet.email({ provider: "customer.demo" }).toLowerCase(),
        faker.helpers.arrayElement(["silver", "gold", "platinum"]),
        faker.number.int({ min: 0, max: 5000 }),
        faker.date.birthdate({ min: 18, max: 65, mode: "age" }).toISOString().slice(0, 10),
        faker.date.future({ years: 2 }).toISOString().slice(0, 10),
      )
  }

  const now = new Date()
  await db
    .prepare(
      `INSERT INTO promotions (id, promo_no, name, promo_type, value, coupon_code, min_purchase, usage_limit, used_count, starts_at, ends_at, status)
       VALUES (?, 'PR00001', 'Weekend 10%', 'percent', 10, 'WEEKEND10', 500, 100, 3, ?, ?, 'active')`,
    )
    .run(randomUUID(), new Date(now.getTime() - 86400000).toISOString(), new Date(now.getTime() + 7 * 86400000).toISOString())
  await db
    .prepare(
      `INSERT INTO promotions (id, promo_no, name, promo_type, value, coupon_code, min_purchase, starts_at, ends_at, status)
       VALUES (?, 'PR00002', 'Flat 50 off', 'fixed', 50, 'FLAT50', 999, ?, ?, 'active')`,
    )
    .run(randomUUID(), new Date(now.getTime() - 86400000).toISOString(), new Date(now.getTime() + 14 * 86400000).toISOString())
  await db
    .prepare(
      `INSERT INTO promotions (id, promo_no, name, promo_type, value, coupon_code, min_purchase, starts_at, ends_at, status)
       VALUES (?, 'PR00003', 'Festival upcoming', 'percent', 15, 'FEST15', 0, ?, ?, 'scheduled')`,
    )
    .run(randomUUID(), new Date(now.getTime() + 3 * 86400000).toISOString(), new Date(now.getTime() + 10 * 86400000).toISOString())

  for (let i = 0; i < 8; i++) {
    const poId = `po-${i + 1}`
    const status = faker.helpers.arrayElement(["draft", "submitted", "approved", "partially_received", "completed"])
    await db
      .prepare(
        `INSERT INTO purchase_orders (id, po_no, supplier_id, store_id, status, expected_delivery, payment_terms, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'Net 30', 'purchaser')`,
      )
      .run(
        poId,
        `PO${pad(i + 1)}`,
        supplierIds[i % supplierIds.length],
        storeIds[i % storeIds.length],
        status,
        faker.date.soon({ days: 20 }).toISOString().slice(0, 10),
      )
    for (let L = 0; L < 3; L++) {
      const qty = faker.number.int({ min: 10, max: 50 })
      const received = status === "completed" ? qty : status === "partially_received" ? Math.floor(qty / 2) : 0
      await db
        .prepare(
          "INSERT INTO purchase_order_lines (id, po_id, product_id, quantity, received_qty, unit_cost) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(randomUUID(), poId, productIds[(i + L) % productIds.length], qty, received, faker.number.int({ min: 30, max: 200 }))
    }
  }

  for (let i = 0; i < 20; i++) {
    const saleId = `sale-${i + 1}`
    const subtotal = faker.number.int({ min: 200, max: 5000 })
    const discount = i % 4 === 0 ? 50 : 0
    const tax = Math.round((subtotal - discount) * 0.18)
    const total = subtotal - discount + tax
    const created = faker.date.recent({ days: 7 })
    await db
      .prepare(
        `INSERT INTO sales (id, sale_no, store_id, customer_id, cashier, status, subtotal, discount, tax, total, payment_method, created_at)
         VALUES (?, ?, ?, ?, 'cashier', 'completed', ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        saleId,
        `TXN${pad(i + 1)}`,
        storeIds[i % storeIds.length],
        i % 3 === 0 ? null : `cus-${(i % 25) + 1}`,
        subtotal,
        discount,
        tax,
        total,
        faker.helpers.arrayElement(["cash", "card", "upi"]),
        created.toISOString(),
      )
    const pid = productIds[i % productIds.length]
    const qty = faker.number.int({ min: 1, max: 3 })
    const price = faker.number.int({ min: 50, max: 400 })
    await db
      .prepare(
        "INSERT INTO sale_lines (id, sale_id, product_id, quantity, unit_price, line_total, returned_qty) VALUES (?, ?, ?, ?, ?, ?, 0)",
      )
      .run(randomUUID(), saleId, pid, qty, price, price * qty)
  }

  await db
    .prepare("INSERT INTO activity_logs (id, entity_type, entity_id, action, details, actor) VALUES (?, 'system', 'seed', 'seed', 'Retail domain seeded', 'system')")
    .run(randomUUID())
}
