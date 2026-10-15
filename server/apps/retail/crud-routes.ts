import { randomUUID } from "node:crypto"
import type { Express } from "express"
import { z } from "zod"
import type { AppDatabase } from "../../shared/db"
import { logActivity, requirePerm } from "./api-helpers"

async function adjustStock(
  db: AppDatabase,
  opts: {
    storeId: string
    productId: string
    delta: number
    movementType: string
    reason: string
    actor: string
    referenceType?: string
    referenceId?: string
  },
) {
  const stock = await db.query<{ id: string; quantity: number }>(
    "SELECT id, quantity FROM store_stock WHERE store_id = ? AND product_id = ?",
    [opts.storeId, opts.productId],
  )
  const nextQty = Number(stock[0]?.quantity ?? 0) + opts.delta
  if (nextQty < 0) throw Object.assign(new Error("Insufficient stock"), { status: 400 })
  if (stock[0]) {
    await db.prepare("UPDATE store_stock SET quantity = ? WHERE id = ?").run(nextQty, stock[0].id)
  } else {
    await db
      .prepare("INSERT INTO store_stock (id, store_id, product_id, quantity) VALUES (?, ?, ?, ?)")
      .run(randomUUID(), opts.storeId, opts.productId, nextQty)
  }
  const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM stock_movements")
  await db
    .prepare(
      `INSERT INTO stock_movements (id, movement_no, store_id, product_id, movement_type, quantity, reason, reference_type, reference_id, actor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      `MV${String(Number(count[0]?.n ?? 0) + 1).padStart(5, "0")}`,
      opts.storeId,
      opts.productId,
      opts.movementType,
      opts.delta,
      opts.reason,
      opts.referenceType ?? null,
      opts.referenceId ?? null,
      opts.actor,
    )
}

export function registerRetailCrud(app: Express, db: AppDatabase) {
  const productBody = z.object({
    name: z.string().min(1),
    sku: z.string().min(1),
    barcode: z.string().min(1),
    description: z.string().optional(),
    brand: z.string().optional(),
    categoryId: z.string().min(1),
    costPrice: z.coerce.number().nonnegative(),
    sellingPrice: z.coerce.number().positive(),
    taxRate: z.coerce.number().nonnegative().default(18),
    discountEligible: z.boolean().default(true),
    unit: z.string().default("pcs"),
    reorderLevel: z.coerce.number().int().nonnegative().default(10),
    status: z.enum(["active", "inactive"]).default("active"),
    expiryDate: z.string().optional().nullable(),
    batchNo: z.string().optional(),
  })

  app.post("/api/retail/products", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "products", "create")
      if (!user) return
      const body = productBody.parse(req.body)
      const dup = await db.query("SELECT id FROM products WHERE (sku = ? OR barcode = ?) AND deleted_at IS NULL", [
        body.sku,
        body.barcode,
      ])
      if (dup[0]) {
        res.status(400).json({ message: "Duplicate SKU or barcode" })
        return
      }
      const id = randomUUID()
      await db
        .prepare(
          `INSERT INTO products (id, sku, barcode, name, description, brand, category_id, cost_price, selling_price, tax_rate, discount_eligible, unit, reorder_level, status, expiry_date, batch_no)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          body.sku.toUpperCase(),
          body.barcode,
          body.name,
          body.description ?? "",
          body.brand ?? "",
          body.categoryId,
          body.costPrice,
          body.sellingPrice,
          body.taxRate,
          body.discountEligible,
          body.unit,
          body.reorderLevel,
          body.status,
          body.expiryDate || null,
          body.batchNo ?? null,
        )
      const stores = await db.query<{ id: string }>("SELECT id FROM stores")
      for (const store of stores) {
        await db
          .prepare("INSERT INTO store_stock (id, store_id, product_id, quantity) VALUES (?, ?, ?, 0)")
          .run(randomUUID(), store.id, id)
      }
      await logActivity(db, { entityType: "product", entityId: id, action: "create", actor: user.username })
      res.status(201).json({ id, sku: body.sku.toUpperCase() })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/retail/products/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "products", "edit")
      if (!user) return
      const body = productBody.parse(req.body)
      const id = String(req.params.id)
      await db
        .prepare(
          `UPDATE products SET name=?, sku=?, barcode=?, description=?, brand=?, category_id=?, cost_price=?, selling_price=?,
           tax_rate=?, discount_eligible=?, unit=?, reorder_level=?, status=?, expiry_date=?, batch_no=?, updated_at=NOW()
           WHERE id=? AND deleted_at IS NULL`,
        )
        .run(
          body.name,
          body.sku.toUpperCase(),
          body.barcode,
          body.description ?? "",
          body.brand ?? "",
          body.categoryId,
          body.costPrice,
          body.sellingPrice,
          body.taxRate,
          body.discountEligible,
          body.unit,
          body.reorderLevel,
          body.status,
          body.expiryDate || null,
          body.batchNo ?? null,
          id,
        )
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/retail/products/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "products", "delete")
      if (!user) return
      await db
        .prepare("UPDATE products SET status='inactive', deleted_at=NOW() WHERE id=?")
        .run(String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/retail/inventory/adjust", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "inventory", "edit")
      if (!user) return
      const body = z
        .object({
          storeId: z.string().min(1),
          productId: z.string().min(1),
          quantity: z.coerce.number().int(),
          reason: z.string().min(1),
          movementType: z.enum(["stock_in", "stock_out", "adjustment", "damage", "expiry"]).default("adjustment"),
        })
        .parse(req.body)
      const delta =
        body.movementType === "stock_in" ? Math.abs(body.quantity) : body.movementType === "adjustment" ? body.quantity : -Math.abs(body.quantity)
      await adjustStock(db, {
        storeId: body.storeId,
        productId: body.productId,
        delta,
        movementType: body.movementType,
        reason: body.reason,
        actor: user.username,
      })
      await logActivity(db, {
        entityType: "inventory",
        entityId: body.productId,
        action: body.movementType,
        details: body.reason,
        actor: user.username,
      })
      res.json({ ok: true })
    } catch (error) {
      const err = error as Error & { status?: number }
      if (err.status === 400) {
        res.status(400).json({ message: err.message })
        return
      }
      next(error)
    }
  })

  app.post("/api/retail/inventory/transfer", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "inventory", "edit")
      if (!user) return
      const body = z
        .object({
          fromStoreId: z.string().min(1),
          toStoreId: z.string().min(1),
          productId: z.string().min(1),
          quantity: z.coerce.number().int().positive(),
          reason: z.string().min(1),
        })
        .parse(req.body)
      if (body.fromStoreId === body.toStoreId) {
        res.status(400).json({ message: "Source and destination stores must differ" })
        return
      }
      await adjustStock(db, {
        storeId: body.fromStoreId,
        productId: body.productId,
        delta: -body.quantity,
        movementType: "transfer_out",
        reason: body.reason,
        actor: user.username,
      })
      await adjustStock(db, {
        storeId: body.toStoreId,
        productId: body.productId,
        delta: body.quantity,
        movementType: "transfer_in",
        reason: body.reason,
        actor: user.username,
      })
      res.json({ ok: true })
    } catch (error) {
      const err = error as Error & { status?: number }
      if (err.status === 400) {
        res.status(400).json({ message: err.message })
        return
      }
      next(error)
    }
  })

  const checkoutBody = z.object({
    storeId: z.string().min(1),
    customerId: z.string().optional().nullable(),
    couponCode: z.string().optional().nullable(),
    paymentMethod: z.enum(["cash", "card", "upi", "split"]),
    cashTendered: z.coerce.number().optional(),
    suspended: z.boolean().optional(),
    lines: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.coerce.number().int().positive(),
        }),
      )
      .min(1),
  })

  app.post("/api/retail/pos/checkout", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "pos", "create")
      if (!user) return
      const body = checkoutBody.parse(req.body)
      if (!body.lines.length) {
        res.status(400).json({ message: "Cart is empty" })
        return
      }

      let subtotal = 0
      const priced: { productId: string; quantity: number; unitPrice: number; lineTotal: number; taxRate: number }[] = []
      for (const line of body.lines) {
        const product = await db.query<{ selling_price: number; tax_rate: number; name: string }>(
          "SELECT selling_price::float AS selling_price, tax_rate::float AS tax_rate, name FROM products WHERE id = ? AND deleted_at IS NULL AND status = 'active'",
          [line.productId],
        )
        if (!product[0]) {
          res.status(400).json({ message: "Product not found or inactive" })
          return
        }
        const stock = await db.query<{ quantity: number }>(
          "SELECT quantity FROM store_stock WHERE store_id = ? AND product_id = ?",
          [body.storeId, line.productId],
        )
        if (Number(stock[0]?.quantity ?? 0) < line.quantity && !body.suspended) {
          res.status(400).json({ message: `Insufficient stock for ${product[0].name}` })
          return
        }
        const lineTotal = product[0].selling_price * line.quantity
        subtotal += lineTotal
        priced.push({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: product[0].selling_price,
          lineTotal,
          taxRate: product[0].tax_rate,
        })
      }

      let discount = 0
      let couponUsed: string | null = null
      if (body.couponCode) {
        const promo = await db.query<{
          id: string
          promo_type: string
          value: number
          min_purchase: number
          usage_limit: number | null
          used_count: number
          status: string
          starts_at: string
          ends_at: string
        }>(
          `SELECT id, promo_type, value::float AS value, min_purchase::float AS min_purchase, usage_limit, used_count, status, starts_at, ends_at
           FROM promotions WHERE LOWER(coupon_code) = LOWER(?) AND deleted_at IS NULL`,
          [body.couponCode],
        )
        const p = promo[0]
        if (!p || p.status !== "active" || new Date(p.starts_at) > new Date() || new Date(p.ends_at) < new Date()) {
          res.status(400).json({ message: "Invalid or expired coupon code" })
          return
        }
        if (subtotal < p.min_purchase) {
          res.status(400).json({ message: `Minimum purchase for coupon is ${p.min_purchase}` })
          return
        }
        if (p.usage_limit != null && p.used_count >= p.usage_limit) {
          res.status(400).json({ message: "Coupon usage limit reached" })
          return
        }
        discount = p.promo_type === "percent" ? Math.round((subtotal * p.value) / 100) : p.value
        couponUsed = body.couponCode
        if (!body.suspended) {
          await db.prepare("UPDATE promotions SET used_count = used_count + 1 WHERE id = ?").run(p.id)
        }
      }

      const taxable = Math.max(0, subtotal - discount)
      const tax = Math.round(taxable * 0.18)
      const total = taxable + tax

      if (body.paymentMethod === "cash" && !body.suspended) {
        const tendered = Number(body.cashTendered ?? 0)
        if (tendered < total) {
          res.status(400).json({ message: "Insufficient cash tendered" })
          return
        }
      }

      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM sales")
      const id = randomUUID()
      const saleNo = `TXN${String(Number(count[0]?.n ?? 0) + 1).padStart(5, "0")}`
      await db
        .prepare(
          `INSERT INTO sales (id, sale_no, store_id, customer_id, cashier, status, subtotal, discount, tax, total, payment_method, coupon_code, suspended)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          saleNo,
          body.storeId,
          body.customerId || null,
          user.username,
          body.suspended ? "suspended" : "completed",
          subtotal,
          discount,
          tax,
          total,
          body.paymentMethod,
          couponUsed,
          Boolean(body.suspended),
        )
      for (const line of priced) {
        await db
          .prepare(
            "INSERT INTO sale_lines (id, sale_id, product_id, quantity, unit_price, line_total, returned_qty) VALUES (?, ?, ?, ?, ?, ?, 0)",
          )
          .run(randomUUID(), id, line.productId, line.quantity, line.unitPrice, line.lineTotal)
        if (!body.suspended) {
          await adjustStock(db, {
            storeId: body.storeId,
            productId: line.productId,
            delta: -line.quantity,
            movementType: "sale",
            reason: `Sale ${saleNo}`,
            actor: user.username,
            referenceType: "sale",
            referenceId: id,
          })
        }
      }
      if (body.customerId && !body.suspended) {
        const points = Math.floor(total / 100)
        await db.prepare("UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?").run(points, body.customerId)
      }
      await logActivity(db, {
        entityType: "sale",
        entityId: id,
        action: body.suspended ? "suspend" : "checkout",
        details: saleNo,
        actor: user.username,
      })
      res.status(201).json({
        id,
        saleNo,
        subtotal,
        discount,
        tax,
        total,
        change: body.paymentMethod === "cash" ? Math.max(0, Number(body.cashTendered ?? 0) - total) : 0,
      })
    } catch (error) {
      const err = error as Error & { status?: number }
      if (err.status === 400) {
        res.status(400).json({ message: err.message })
        return
      }
      next(error)
    }
  })

  app.post("/api/retail/sales/:id/return", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "sales", "create")
      if (!user) return
      const saleId = String(req.params.id)
      const body = z
        .object({
          reason: z.string().min(1),
          disposition: z.enum(["restock", "damage"]).default("restock"),
          lines: z.array(z.object({ saleLineId: z.string().min(1), quantity: z.coerce.number().int().positive() })).min(1),
        })
        .parse(req.body)
      const sale = await db.query<{ id: string; store_id: string; status: string }>(
        "SELECT id, store_id, status FROM sales WHERE id = ? AND suspended = FALSE",
        [saleId],
      )
      if (!sale[0]) {
        res.status(404).json({ message: "Sale not found" })
        return
      }
      let refund = 0
      for (const line of body.lines) {
        const sl = await db.query<{ id: string; product_id: string; quantity: number; returned_qty: number; unit_price: number }>(
          "SELECT id, product_id, quantity, returned_qty, unit_price::float AS unit_price FROM sale_lines WHERE id = ? AND sale_id = ?",
          [line.saleLineId, saleId],
        )
        if (!sl[0]) {
          res.status(400).json({ message: "Invalid sale line" })
          return
        }
        const remaining = sl[0].quantity - sl[0].returned_qty
        if (line.quantity > remaining) {
          res.status(400).json({ message: "Return quantity exceeds sold quantity" })
          return
        }
        refund += line.quantity * sl[0].unit_price
        await db
          .prepare("UPDATE sale_lines SET returned_qty = returned_qty + ? WHERE id = ?")
          .run(line.quantity, line.saleLineId)
        if (body.disposition === "restock") {
          await adjustStock(db, {
            storeId: sale[0].store_id,
            productId: sl[0].product_id,
            delta: line.quantity,
            movementType: "return",
            reason: body.reason,
            actor: user.username,
            referenceType: "sale",
            referenceId: saleId,
          })
        }
      }
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM returns")
      const returnId = randomUUID()
      const returnNo = `RET${String(Number(count[0]?.n ?? 0) + 1).padStart(5, "0")}`
      await db
        .prepare(
          "INSERT INTO returns (id, return_no, sale_id, reason, refund_amount, disposition, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(returnId, returnNo, saleId, body.reason, refund, body.disposition, user.username)
      for (const line of body.lines) {
        const sl = await db.query<{ product_id: string }>("SELECT product_id FROM sale_lines WHERE id = ?", [line.saleLineId])
        await db
          .prepare("INSERT INTO return_lines (id, return_id, sale_line_id, product_id, quantity) VALUES (?, ?, ?, ?, ?)")
          .run(randomUUID(), returnId, line.saleLineId, sl[0]?.product_id, line.quantity)
      }
      res.status(201).json({ id: returnId, returnNo, refundAmount: refund })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/retail/suppliers", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "suppliers", "create")
      if (!user) return
      const body = z
        .object({
          name: z.string().min(1),
          contactPerson: z.string().optional(),
          email: z.string().email(),
          phone: z.string().min(8),
          address: z.string().optional(),
          paymentTerms: z.string().default("Net 30"),
        })
        .parse(req.body)
      const dup = await db.query("SELECT id FROM suppliers WHERE LOWER(email)=LOWER(?) AND deleted_at IS NULL", [body.email])
      if (dup[0]) {
        res.status(400).json({ message: "Duplicate supplier email" })
        return
      }
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM suppliers")
      const id = randomUUID()
      const supplierNo = `SUP${String(Number(count[0]?.n ?? 0) + 1).padStart(5, "0")}`
      await db
        .prepare(
          `INSERT INTO suppliers (id, supplier_no, name, contact_person, email, phone, address, payment_terms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(id, supplierNo, body.name, body.contactPerson ?? "", body.email, body.phone, body.address ?? "", body.paymentTerms)
      res.status(201).json({ id, supplierNo })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/retail/suppliers/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "suppliers", "edit")
      if (!user) return
      const body = z
        .object({
          name: z.string().min(1),
          contactPerson: z.string().optional(),
          email: z.string().email(),
          phone: z.string().min(8),
          address: z.string().optional(),
          paymentTerms: z.string().default("Net 30"),
        })
        .parse(req.body)
      await db
        .prepare(
          "UPDATE suppliers SET name=?, contact_person=?, email=?, phone=?, address=?, payment_terms=? WHERE id=? AND deleted_at IS NULL",
        )
        .run(body.name, body.contactPerson ?? "", body.email, body.phone, body.address ?? "", body.paymentTerms, String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/retail/suppliers/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "suppliers", "delete")
      if (!user) return
      await db.prepare("UPDATE suppliers SET deleted_at=NOW() WHERE id=?").run(String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/retail/purchases", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "purchases", "create")
      if (!user) return
      const body = z
        .object({
          supplierId: z.string().min(1),
          storeId: z.string().min(1),
          expectedDelivery: z.string().min(1),
          paymentTerms: z.string().default("Net 30"),
          notes: z.string().optional(),
          lines: z.array(z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().positive(), unitCost: z.coerce.number().nonnegative() })).min(1),
        })
        .parse(req.body)
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM purchase_orders")
      const id = randomUUID()
      const poNo = `PO${String(Number(count[0]?.n ?? 0) + 1).padStart(5, "0")}`
      await db
        .prepare(
          `INSERT INTO purchase_orders (id, po_no, supplier_id, store_id, status, expected_delivery, payment_terms, notes, created_by)
           VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
        )
        .run(id, poNo, body.supplierId, body.storeId, body.expectedDelivery, body.paymentTerms, body.notes ?? "", user.username)
      for (const line of body.lines) {
        await db
          .prepare("INSERT INTO purchase_order_lines (id, po_id, product_id, quantity, received_qty, unit_cost) VALUES (?, ?, ?, ?, 0, ?)")
          .run(randomUUID(), id, line.productId, line.quantity, line.unitCost)
      }
      res.status(201).json({ id, poNo })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/retail/purchases/:id/status", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "purchases", "edit")
      if (!user) return
      const body = z.object({ status: z.enum(["draft", "submitted", "approved", "cancelled", "completed"]) }).parse(req.body)
      await db.prepare("UPDATE purchase_orders SET status=?, updated_at=NOW() WHERE id=?").run(body.status, String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/retail/purchases/:id/receive", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "purchases", "edit")
      if (!user) return
      const poId = String(req.params.id)
      const body = z
        .object({ lines: z.array(z.object({ lineId: z.string().min(1), quantity: z.coerce.number().int().positive() })).min(1) })
        .parse(req.body)
      const po = await db.query<{ store_id: string; status: string }>(
        "SELECT store_id, status FROM purchase_orders WHERE id = ? AND deleted_at IS NULL",
        [poId],
      )
      if (!po[0]) {
        res.status(404).json({ message: "PO not found" })
        return
      }
      for (const line of body.lines) {
        const row = await db.query<{ product_id: string; quantity: number; received_qty: number }>(
          "SELECT product_id, quantity, received_qty FROM purchase_order_lines WHERE id = ? AND po_id = ?",
          [line.lineId, poId],
        )
        if (!row[0]) {
          res.status(400).json({ message: "Invalid PO line" })
          return
        }
        const remaining = row[0].quantity - row[0].received_qty
        if (line.quantity > remaining) {
          res.status(400).json({ message: "Receive quantity exceeds ordered quantity" })
          return
        }
        await db
          .prepare("UPDATE purchase_order_lines SET received_qty = received_qty + ? WHERE id = ?")
          .run(line.quantity, line.lineId)
        await adjustStock(db, {
          storeId: po[0].store_id,
          productId: row[0].product_id,
          delta: line.quantity,
          movementType: "purchase_receive",
          reason: `PO receive ${poId}`,
          actor: user.username,
          referenceType: "purchase_order",
          referenceId: poId,
        })
      }
      const open = await db.query<{ n: number }>(
        "SELECT COUNT(*)::int AS n FROM purchase_order_lines WHERE po_id = ? AND received_qty < quantity",
        [poId],
      )
      const status = Number(open[0]?.n ?? 0) === 0 ? "completed" : "partially_received"
      await db.prepare("UPDATE purchase_orders SET status=?, updated_at=NOW() WHERE id=?").run(status, poId)
      res.json({ ok: true, status })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/retail/customers", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "customers", "create")
      if (!user) return
      const body = z
        .object({
          name: z.string().min(1),
          phone: z.string().min(8),
          email: z.string().email().optional().or(z.literal("")),
          tier: z.enum(["silver", "gold", "platinum"]).default("silver"),
          birthday: z.string().optional().nullable(),
          membershipExpiry: z.string().optional().nullable(),
        })
        .parse(req.body)
      const dup = await db.query("SELECT id FROM customers WHERE phone = ? AND deleted_at IS NULL", [body.phone])
      if (dup[0]) {
        res.status(400).json({ message: "Duplicate customer phone" })
        return
      }
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM customers")
      const id = randomUUID()
      const customerNo = `C${String(Number(count[0]?.n ?? 0) + 1).padStart(5, "0")}`
      await db
        .prepare(
          `INSERT INTO customers (id, customer_no, name, phone, email, tier, birthday, membership_expiry)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(id, customerNo, body.name, body.phone, body.email || null, body.tier, body.birthday || null, body.membershipExpiry || null)
      res.status(201).json({ id, customerNo })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/retail/customers/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "customers", "edit")
      if (!user) return
      const body = z
        .object({
          name: z.string().min(1),
          phone: z.string().min(8),
          email: z.string().email().optional().or(z.literal("")),
          tier: z.enum(["silver", "gold", "platinum"]).default("silver"),
          birthday: z.string().optional().nullable(),
          membershipExpiry: z.string().optional().nullable(),
        })
        .parse(req.body)
      await db
        .prepare(
          "UPDATE customers SET name=?, phone=?, email=?, tier=?, birthday=?, membership_expiry=? WHERE id=? AND deleted_at IS NULL",
        )
        .run(
          body.name,
          body.phone,
          body.email || null,
          body.tier,
          body.birthday || null,
          body.membershipExpiry || null,
          String(req.params.id),
        )
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/retail/customers/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "customers", "delete")
      if (!user) return
      await db.prepare("UPDATE customers SET deleted_at=NOW() WHERE id=?").run(String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/retail/promotions", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "promotions", "create")
      if (!user) return
      const body = z
        .object({
          name: z.string().min(1),
          promoType: z.enum(["percent", "fixed"]),
          value: z.coerce.number().positive(),
          couponCode: z.string().optional(),
          minPurchase: z.coerce.number().nonnegative().default(0),
          usageLimit: z.coerce.number().int().optional().nullable(),
          startsAt: z.string().min(1),
          endsAt: z.string().min(1),
          status: z.enum(["active", "scheduled", "expired", "disabled"]).default("active"),
        })
        .parse(req.body)
      if (body.endsAt < body.startsAt) {
        res.status(400).json({ message: "End must be after start" })
        return
      }
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM promotions")
      const id = randomUUID()
      const promoNo = `PR${String(Number(count[0]?.n ?? 0) + 1).padStart(5, "0")}`
      await db
        .prepare(
          `INSERT INTO promotions (id, promo_no, name, promo_type, value, coupon_code, min_purchase, usage_limit, starts_at, ends_at, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          promoNo,
          body.name,
          body.promoType,
          body.value,
          body.couponCode || null,
          body.minPurchase,
          body.usageLimit ?? null,
          body.startsAt,
          body.endsAt,
          body.status,
        )
      res.status(201).json({ id, promoNo })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/retail/promotions/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "promotions", "edit")
      if (!user) return
      const body = z
        .object({
          name: z.string().min(1),
          promoType: z.enum(["percent", "fixed"]),
          value: z.coerce.number().positive(),
          couponCode: z.string().optional(),
          minPurchase: z.coerce.number().nonnegative().default(0),
          usageLimit: z.coerce.number().int().optional().nullable(),
          startsAt: z.string().min(1),
          endsAt: z.string().min(1),
          status: z.enum(["active", "scheduled", "expired", "disabled"]).default("active"),
        })
        .parse(req.body)
      await db
        .prepare(
          `UPDATE promotions SET name=?, promo_type=?, value=?, coupon_code=?, min_purchase=?, usage_limit=?, starts_at=?, ends_at=?, status=?
           WHERE id=? AND deleted_at IS NULL`,
        )
        .run(
          body.name,
          body.promoType,
          body.value,
          body.couponCode || null,
          body.minPurchase,
          body.usageLimit ?? null,
          body.startsAt,
          body.endsAt,
          body.status,
          String(req.params.id),
        )
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/retail/promotions/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "promotions", "delete")
      if (!user) return
      await db.prepare("UPDATE promotions SET deleted_at=NOW(), status='disabled' WHERE id=?").run(String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })
}
