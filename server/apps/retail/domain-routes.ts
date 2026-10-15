import type { Express } from "express"
import type { AppDatabase } from "../../shared/db"
import { okList, parsePaging, requirePerm, requireUser } from "./api-helpers"
import { registerRetailCrud } from "./crud-routes"
import { ROLE_PERMISSIONS } from "./rbac"

export function registerRetailApi(app: Express, db: AppDatabase) {
  app.get("/api/retail/v1/openapi.json", (_req, res) => {
    res.json({
      openapi: "3.0.3",
      info: {
        title: "Retail Management API",
        version: "1.0.0",
        description: "Synthetic retail training data only.",
      },
      servers: [{ url: "/api/retail" }],
      paths: {
        "/dashboard": { get: { summary: "Dashboard KPIs" } },
        "/products": { get: { summary: "List products" } },
        "/pos/checkout": { post: { summary: "Complete POS sale" } },
        "/sales": { get: { summary: "List sales" } },
        "/purchases": { get: { summary: "List purchase orders" } },
      },
    })
  })

  app.get("/api/retail/permissions/me", async (req, res, next) => {
    try {
      const user = await requireUser(db, req, res)
      if (!user) return
      res.json({ role: user.role, permissions: ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] ?? {} })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/retail/dashboard", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "dashboard", "view"))) return
      const storeId = String(req.query.storeId ?? "").trim()
      const saleStore = storeId ? "AND store_id = ?" : ""
      const saleStoreAlias = storeId ? "AND s.store_id = ?" : ""
      const stockStore = storeId ? "AND ss.store_id = ?" : ""
      const poStore = storeId ? "AND store_id = ?" : ""
      const p = storeId ? [storeId] : []

      const [today, lowStock, pendingPo, recentSales, recentReturns, chart, outOfStock] = await Promise.all([
        db.query<{ txn: number; revenue: number; aov: number }>(
          `SELECT COUNT(*)::int AS txn, COALESCE(SUM(total),0)::float AS revenue,
                  COALESCE(AVG(total),0)::float AS aov
           FROM sales
           WHERE status = 'completed' AND suspended = FALSE
             AND created_at::date = CURRENT_DATE ${saleStore}`,
          p,
        ),
        db.query(
          `SELECT p.id, p.sku, p.name, ss.quantity, p.reorder_level AS "reorderLevel", st.name AS store
           FROM store_stock ss
           JOIN products p ON p.id = ss.product_id
           JOIN stores st ON st.id = ss.store_id
           WHERE p.deleted_at IS NULL AND ss.quantity <= p.reorder_level ${stockStore}
           ORDER BY ss.quantity ASC LIMIT 10`,
          p,
        ),
        db.query<{ n: number }>(
          `SELECT COUNT(*)::int AS n FROM purchase_orders
           WHERE deleted_at IS NULL AND status IN ('submitted','approved','partially_received') ${poStore}`,
          p,
        ),
        db.query(
          `SELECT id, sale_no AS "saleNo", total::float AS total, payment_method AS "paymentMethod", created_at AS "createdAt"
           FROM sales WHERE suspended = FALSE ${saleStore} ORDER BY created_at DESC LIMIT 8`,
          p,
        ),
        db.query(
          `SELECT r.id, r.return_no AS "returnNo", r.refund_amount::float AS "refundAmount", r.created_at AS "createdAt"
           FROM returns r
           JOIN sales s ON s.id = r.sale_id
           WHERE TRUE ${saleStoreAlias}
           ORDER BY r.created_at DESC LIMIT 5`,
          p,
        ),
        db.query<{ day: string; revenue: number }>(
          `SELECT to_char(created_at::date, 'YYYY-MM-DD') AS day, COALESCE(SUM(total),0)::float AS revenue
           FROM sales
           WHERE suspended = FALSE AND created_at >= CURRENT_DATE - INTERVAL '6 days' ${saleStore}
           GROUP BY created_at::date ORDER BY day`,
          p,
        ),
        db.query<{ n: number }>(
          `SELECT COUNT(*)::int AS n FROM store_stock ss WHERE quantity = 0 ${stockStore}`,
          p,
        ),
      ])
      res.json({
        todaySales: Number(today[0]?.revenue ?? 0),
        todayTransactions: Number(today[0]?.txn ?? 0),
        averageOrderValue: Number(today[0]?.aov ?? 0),
        lowStock,
        outOfStock: Number(outOfStock[0]?.n ?? 0),
        pendingPurchaseOrders: Number(pendingPo[0]?.n ?? 0),
        recentSales,
        recentReturns,
        salesChart: chart,
      })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/retail/lookups", async (req, res, next) => {
    try {
      if (!(await requireUser(db, req, res))) return
      const [stores, categories, suppliers, products, customers] = await Promise.all([
        db.query("SELECT id, code, name FROM stores ORDER BY code"),
        db.query("SELECT id, code, name FROM categories WHERE deleted_at IS NULL AND active = TRUE ORDER BY name"),
        db.query('SELECT id, supplier_no AS code, name FROM suppliers WHERE deleted_at IS NULL ORDER BY name'),
        db.query(
          'SELECT id, sku AS code, name FROM products WHERE deleted_at IS NULL AND status = \'active\' ORDER BY sku LIMIT 200',
        ),
        db.query(
          'SELECT id, customer_no AS code, name FROM customers WHERE deleted_at IS NULL ORDER BY name LIMIT 200',
        ),
      ])
      res.json({ stores, categories, suppliers, products, customers })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/retail/products", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "products", "view"))) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const storeId = String(req.query.storeId ?? "store-1")
      const params: unknown[] = [storeId]
      let where = "p.deleted_at IS NULL"
      if (q) {
        where += " AND (LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ? OR LOWER(p.barcode) LIKE ? OR LOWER(p.brand) LIKE ?)"
        const like = `%${q}%`
        params.push(like, like, like, like)
      }
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM products p WHERE ${where}`, params.slice(1))
      const rows = await db.query(
        `SELECT p.id, p.sku, p.barcode, p.name, p.brand, p.description, p.category_id AS "categoryId",
                c.name AS category, p.cost_price::float AS "costPrice", p.selling_price::float AS "sellingPrice",
                p.tax_rate::float AS "taxRate", p.discount_eligible AS "discountEligible", p.unit,
                p.reorder_level AS "reorderLevel", p.status, p.expiry_date AS "expiryDate", p.batch_no AS "batchNo",
                COALESCE(ss.quantity, 0)::int AS quantity
         FROM products p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN store_stock ss ON ss.product_id = p.id AND ss.store_id = ?
         WHERE ${where}
         ORDER BY p.sku LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/retail/products/:id", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "products", "view"))) return
      const id = String(req.params.id)
      const rows = await db.query(
        `SELECT p.*, c.name AS category FROM products p
         JOIN categories c ON c.id = p.category_id WHERE p.id = ? AND p.deleted_at IS NULL`,
        [id],
      )
      if (!rows[0]) {
        res.status(404).json({ message: "Product not found" })
        return
      }
      const stock = await db.query(
        `SELECT st.name AS store, ss.quantity FROM store_stock ss JOIN stores st ON st.id = ss.store_id WHERE ss.product_id = ?`,
        [id],
      )
      res.json({ product: rows[0], stock })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/retail/inventory", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "inventory", "view"))) return
      const storeId = String(req.query.storeId ?? "").trim()
      const params: unknown[] = []
      let where = "p.deleted_at IS NULL"
      if (storeId) {
        where += " AND ss.store_id = ?"
        params.push(storeId)
      }
      const rows = await db.query(
        `SELECT ss.id, st.name AS store, st.id AS "storeId", p.id AS "productId", p.sku, p.name AS product,
                ss.quantity, p.reorder_level AS "reorderLevel", p.cost_price::float AS "costPrice",
                (ss.quantity * p.cost_price)::float AS valuation
         FROM store_stock ss
         JOIN stores st ON st.id = ss.store_id
         JOIN products p ON p.id = ss.product_id
         WHERE ${where}
         ORDER BY p.sku, st.code`,
        params,
      )
      res.json({ data: rows, total: rows.length, page: 1, pageSize: rows.length })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/retail/suppliers", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "suppliers", "view"))) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const params: unknown[] = []
      let where = "deleted_at IS NULL"
      if (q) {
        where += " AND (LOWER(name) LIKE ? OR LOWER(supplier_no) LIKE ? OR LOWER(email) LIKE ?)"
        const like = `%${q}%`
        params.push(like, like, like)
      }
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM suppliers WHERE ${where}`, params)
      const rows = await db.query(
        `SELECT id, supplier_no AS "supplierNo", name, contact_person AS "contactPerson", email, phone, address, payment_terms AS "paymentTerms"
         FROM suppliers WHERE ${where} ORDER BY supplier_no LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/retail/purchases", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "purchases", "view"))) return
      const rows = await db.query(
        `SELECT po.id, po.po_no AS "poNo", s.name AS supplier, st.name AS store, po.status,
                po.expected_delivery AS "expectedDelivery", po.payment_terms AS "paymentTerms",
                po.supplier_id AS "supplierId", po.store_id AS "storeId"
         FROM purchase_orders po
         JOIN suppliers s ON s.id = po.supplier_id
         JOIN stores st ON st.id = po.store_id
         WHERE po.deleted_at IS NULL
         ORDER BY po.created_at DESC`,
      )
      res.json({ data: rows, total: rows.length, page: 1, pageSize: rows.length })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/retail/purchases/:id", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "purchases", "view"))) return
      const id = String(req.params.id)
      const po = await db.query(
        `SELECT po.*, s.name AS supplier, st.name AS store FROM purchase_orders po
         JOIN suppliers s ON s.id = po.supplier_id JOIN stores st ON st.id = po.store_id
         WHERE po.id = ? AND po.deleted_at IS NULL`,
        [id],
      )
      if (!po[0]) {
        res.status(404).json({ message: "PO not found" })
        return
      }
      const lines = await db.query(
        `SELECT l.id, l.product_id AS "productId", p.name AS product, p.sku, l.quantity, l.received_qty AS "receivedQty", l.unit_cost::float AS "unitCost"
         FROM purchase_order_lines l JOIN products p ON p.id = l.product_id WHERE l.po_id = ?`,
        [id],
      )
      res.json({ purchaseOrder: po[0], lines })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/retail/sales", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "sales", "view"))) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const params: unknown[] = []
      let where = "s.suspended = FALSE"
      if (q) {
        where += " AND (LOWER(s.sale_no) LIKE ? OR LOWER(s.cashier) LIKE ? OR LOWER(s.payment_method) LIKE ?)"
        const like = `%${q}%`
        params.push(like, like, like)
      }
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM sales s WHERE ${where}`, params)
      const rows = await db.query(
        `SELECT s.id, s.sale_no AS "saleNo", st.name AS store, s.cashier, s.status, s.total::float AS total,
                s.payment_method AS "paymentMethod", s.created_at AS "createdAt", c.name AS customer
         FROM sales s
         JOIN stores st ON st.id = s.store_id
         LEFT JOIN customers c ON c.id = s.customer_id
         WHERE ${where}
         ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/retail/sales/:id", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "sales", "view"))) return
      const id = String(req.params.id)
      const sale = await db.query(
        `SELECT s.*, st.name AS store, c.name AS customer FROM sales s
         JOIN stores st ON st.id = s.store_id LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = ?`,
        [id],
      )
      if (!sale[0]) {
        res.status(404).json({ message: "Sale not found" })
        return
      }
      const lines = await db.query(
        `SELECT l.id, l.product_id AS "productId", p.name AS product, p.sku, l.quantity, l.unit_price::float AS "unitPrice",
                l.line_total::float AS "lineTotal", l.returned_qty AS "returnedQty"
         FROM sale_lines l JOIN products p ON p.id = l.product_id WHERE l.sale_id = ?`,
        [id],
      )
      res.json({ sale: sale[0], lines })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/retail/customers", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "customers", "view"))) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const params: unknown[] = []
      let where = "deleted_at IS NULL"
      if (q) {
        where += " AND (LOWER(name) LIKE ? OR phone LIKE ? OR LOWER(email) LIKE ? OR LOWER(customer_no) LIKE ?)"
        const like = `%${q}%`
        params.push(like, like, like, like)
      }
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM customers WHERE ${where}`, params)
      const rows = await db.query(
        `SELECT id, customer_no AS "customerNo", name, phone, email, tier, loyalty_points AS "loyaltyPoints",
                birthday, membership_expiry AS "membershipExpiry"
         FROM customers WHERE ${where} ORDER BY customer_no LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/retail/promotions", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "promotions", "view"))) return
      const rows = await db.query(
        `SELECT id, promo_no AS "promoNo", name, promo_type AS "promoType", value::float AS value,
                coupon_code AS "couponCode", min_purchase::float AS "minPurchase",
                usage_limit AS "usageLimit", used_count AS "usedCount",
                starts_at AS "startsAt", ends_at AS "endsAt", status
         FROM promotions WHERE deleted_at IS NULL ORDER BY starts_at DESC`,
      )
      res.json({ data: rows, total: rows.length, page: 1, pageSize: rows.length })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/retail/reports/:name", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "reports", "view"))) return
      const name = String(req.params.name)
      if (name === "daily-sales") {
        const rows = await db.query(
          `SELECT to_char(created_at::date,'YYYY-MM-DD') AS day, COUNT(*)::int AS transactions, SUM(total)::float AS revenue
           FROM sales WHERE suspended = FALSE GROUP BY created_at::date ORDER BY day DESC LIMIT 30`,
        )
        res.json({ name, rows })
        return
      }
      if (name === "low-stock") {
        const rows = await db.query(
          `SELECT p.sku, p.name, st.name AS store, ss.quantity, p.reorder_level AS "reorderLevel"
           FROM store_stock ss JOIN products p ON p.id = ss.product_id JOIN stores st ON st.id = ss.store_id
           WHERE ss.quantity <= p.reorder_level ORDER BY ss.quantity`,
        )
        res.json({ name, rows })
        return
      }
      if (name === "expiry") {
        const rows = await db.query(
          `SELECT sku, name, expiry_date AS "expiryDate", batch_no AS "batchNo"
           FROM products WHERE deleted_at IS NULL AND expiry_date IS NOT NULL ORDER BY expiry_date LIMIT 50`,
        )
        res.json({ name, rows })
        return
      }
      if (name === "returns") {
        const rows = await db.query(
          `SELECT return_no AS "returnNo", refund_amount::float AS "refundAmount", reason, created_at AS "createdAt"
           FROM returns ORDER BY created_at DESC`,
        )
        res.json({ name, rows })
        return
      }
      res.status(404).json({ message: "Unknown report" })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/retail/notifications", async (req, res, next) => {
    try {
      if (!(await requireUser(db, req, res))) return
      const rows = await db.query(
        "SELECT id, action AS title, details AS body, created_at AS \"createdAt\" FROM activity_logs ORDER BY created_at DESC LIMIT 5",
      )
      res.json(rows)
    } catch (error) {
      next(error)
    }
  })

  registerRetailCrud(app, db)
}
