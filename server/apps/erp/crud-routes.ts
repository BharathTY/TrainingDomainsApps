import { randomUUID } from "node:crypto"
import type { Express } from "express"
import { z } from "zod"
import type { AppDatabase } from "../../shared/db"
import { DEFAULT_ORG, audit, correlationId, requirePerm } from "./api-helpers"

export function registerErpCrud(app: Express, db: AppDatabase) {
  // ---- Lookups for forms ----
  app.get("/api/erp/lookups", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "dashboard", "view"))) return
      const [departments, positions, categories, uoms, warehouses, vendors, customers, items, leaveTypes, costCenters, accounts] =
        await Promise.all([
          db.query(`SELECT id, code, name FROM departments WHERE deleted_at IS NULL ORDER BY code`),
          db.query(`SELECT id, code, title AS name FROM positions ORDER BY code`),
          db.query(`SELECT id, name FROM item_categories ORDER BY name`),
          db.query(`SELECT id, code, name FROM uoms ORDER BY code`),
          db.query(`SELECT id, code, name FROM warehouses WHERE deleted_at IS NULL ORDER BY code`),
          db.query(`SELECT id, code, name FROM vendors WHERE deleted_at IS NULL ORDER BY code`),
          db.query(`SELECT id, code, name FROM customers WHERE deleted_at IS NULL ORDER BY code`),
          db.query(`SELECT id, sku AS code, name FROM items WHERE deleted_at IS NULL ORDER BY sku`),
          db.query(`SELECT id, code, name FROM leave_types ORDER BY code`),
          db.query(`SELECT id, code, name FROM cost_centers ORDER BY code`),
          db.query(`SELECT id, code, name FROM chart_of_accounts WHERE is_postable ORDER BY code`),
        ])
      res.json({ departments, positions, categories, uoms, warehouses, vendors, customers, items, leaveTypes, costCenters, accounts })
    } catch (error) {
      next(error)
    }
  })

  // ---- Employees ----
  const employeeBody = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    departmentId: z.string().min(1),
    positionId: z.string().min(1),
    location: z.string().optional(),
    status: z.enum(["active", "inactive", "exited"]).default("active"),
    joiningDate: z.string().min(1),
  })

  app.post("/api/erp/employees", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "employees", "create")
      if (!user) return
      const body = employeeBody.parse(req.body)
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM employees")
      const id = randomUUID()
      const employeeNo = `E${String(Number(count[0]?.n ?? 0) + 1).padStart(5, "0")}`
      await db
        .prepare(
          `INSERT INTO employees (id, organization_id, employee_no, first_name, last_name, email, phone, department_id, position_id, location, status, joining_date, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          DEFAULT_ORG,
          employeeNo,
          body.firstName,
          body.lastName,
          body.email,
          body.phone ?? null,
          body.departmentId,
          body.positionId,
          body.location ?? null,
          body.status,
          body.joiningDate,
          user.username,
        )
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "create",
        entityType: "employee",
        entityId: id,
        correlationId: correlationId(req),
      })
      res.status(201).json({ id, employeeNo })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/erp/employees/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "employees", "edit")
      if (!user) return
      const body = employeeBody.parse(req.body)
      const id = String(req.params.id)
      await db
        .prepare(
          `UPDATE employees SET first_name=?, last_name=?, email=?, phone=?, department_id=?, position_id=?, location=?, status=?, joining_date=?, updated_by=?, updated_at=NOW()
           WHERE id=? AND deleted_at IS NULL`,
        )
        .run(
          body.firstName,
          body.lastName,
          body.email,
          body.phone ?? null,
          body.departmentId,
          body.positionId,
          body.location ?? null,
          body.status,
          body.joiningDate,
          user.username,
          id,
        )
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "update",
        entityType: "employee",
        entityId: id,
        correlationId: correlationId(req),
      })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/employees/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "employees", "delete")
      if (!user) return
      const id = String(req.params.id)
      await db.prepare("UPDATE employees SET deleted_at = NOW(), status = 'inactive', updated_by = ? WHERE id = ?").run(user.username, id)
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "delete",
        entityType: "employee",
        entityId: id,
        correlationId: correlationId(req),
      })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  // ---- Departments ----
  const departmentBody = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    parentId: z.string().optional().nullable(),
  })

  app.post("/api/erp/departments", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "departments", "create")
      if (!user) return
      const body = departmentBody.parse(req.body)
      const id = randomUUID()
      await db
        .prepare("INSERT INTO departments (id, organization_id, code, name, parent_id) VALUES (?, ?, ?, ?, ?)")
        .run(id, DEFAULT_ORG, body.code, body.name, body.parentId || null)
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "create",
        entityType: "department",
        entityId: id,
        correlationId: correlationId(req),
      })
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/erp/departments/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "departments", "edit")
      if (!user) return
      const body = departmentBody.parse(req.body)
      const id = String(req.params.id)
      await db
        .prepare("UPDATE departments SET code=?, name=?, parent_id=? WHERE id=? AND deleted_at IS NULL")
        .run(body.code, body.name, body.parentId || null, id)
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "update",
        entityType: "department",
        entityId: id,
        correlationId: correlationId(req),
      })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/departments/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "departments", "delete")
      if (!user) return
      const id = String(req.params.id)
      const linked = await db.query<{ n: number }>(
        "SELECT COUNT(*)::int AS n FROM employees WHERE department_id = ? AND deleted_at IS NULL",
        [id],
      )
      if (Number(linked[0]?.n ?? 0) > 0) {
        res.status(400).json({ message: "Department has active employees; reassign them first" })
        return
      }
      await db.prepare("UPDATE departments SET deleted_at = NOW() WHERE id = ?").run(id)
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "delete",
        entityType: "department",
        entityId: id,
        correlationId: correlationId(req),
      })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  // ---- Vendors / Customers ----
  const partyBody = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    city: z.string().optional(),
    status: z.enum(["active", "inactive"]).default("active"),
  })

  function registerParty(resource: "vendors" | "customers", moduleId: "vendors" | "customers", table: "vendors" | "customers") {
    app.post(`/api/erp/${resource}`, async (req, res, next) => {
      try {
        const user = await requirePerm(db, req, res, moduleId, "create")
        if (!user) return
        const body = partyBody.parse(req.body)
        const id = randomUUID()
        await db
          .prepare(
            `INSERT INTO ${table} (id, organization_id, code, name, email, phone, city, payment_term_id, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pt-net30', ?)`,
          )
          .run(id, DEFAULT_ORG, body.code, body.name, body.email || null, body.phone ?? null, body.city ?? null, body.status)
        await audit(db, {
          organizationId: DEFAULT_ORG,
          actor: user.username,
          action: "create",
          entityType: table.slice(0, -1),
          entityId: id,
          correlationId: correlationId(req),
        })
        res.status(201).json({ id })
      } catch (error) {
        next(error)
      }
    })

    app.put(`/api/erp/${resource}/:id`, async (req, res, next) => {
      try {
        const user = await requirePerm(db, req, res, moduleId, "edit")
        if (!user) return
        const body = partyBody.parse(req.body)
        const id = String(req.params.id)
        await db
          .prepare(`UPDATE ${table} SET code=?, name=?, email=?, phone=?, city=?, status=? WHERE id=? AND deleted_at IS NULL`)
          .run(body.code, body.name, body.email || null, body.phone ?? null, body.city ?? null, body.status, id)
        await audit(db, {
          organizationId: DEFAULT_ORG,
          actor: user.username,
          action: "update",
          entityType: table.slice(0, -1),
          entityId: id,
          correlationId: correlationId(req),
        })
        res.json({ ok: true })
      } catch (error) {
        next(error)
      }
    })

    app.post(`/api/erp/${resource}/:id/delete`, async (req, res, next) => {
      try {
        const user = await requirePerm(db, req, res, moduleId, "delete")
        if (!user) return
        const id = String(req.params.id)
        await db.prepare(`UPDATE ${table} SET deleted_at = NOW(), status = 'inactive' WHERE id = ?`).run(id)
        await audit(db, {
          organizationId: DEFAULT_ORG,
          actor: user.username,
          action: "delete",
          entityType: table.slice(0, -1),
          entityId: id,
          correlationId: correlationId(req),
        })
        res.json({ ok: true })
      } catch (error) {
        next(error)
      }
    })
  }

  registerParty("vendors", "vendors", "vendors")
  registerParty("customers", "customers", "customers")

  // ---- Items ----
  const itemBody = z.object({
    sku: z.string().min(1),
    name: z.string().min(1),
    categoryId: z.string().min(1),
    uomId: z.string().min(1),
    unitCost: z.coerce.number().positive(),
    unitPrice: z.coerce.number().positive(),
    reorderLevel: z.coerce.number().int().min(0),
  })

  app.post("/api/erp/items", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "items", "create")
      if (!user) return
      const body = itemBody.parse(req.body)
      const id = randomUUID()
      await db
        .prepare(
          `INSERT INTO items (id, organization_id, sku, name, category_id, uom_id, unit_cost, unit_price, reorder_level)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(id, DEFAULT_ORG, body.sku, body.name, body.categoryId, body.uomId, body.unitCost, body.unitPrice, body.reorderLevel)
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "create",
        entityType: "item",
        entityId: id,
        correlationId: correlationId(req),
      })
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/erp/items/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "items", "edit")
      if (!user) return
      const body = itemBody.parse(req.body)
      const id = String(req.params.id)
      await db
        .prepare(
          `UPDATE items SET sku=?, name=?, category_id=?, uom_id=?, unit_cost=?, unit_price=?, reorder_level=?
           WHERE id=? AND deleted_at IS NULL`,
        )
        .run(body.sku, body.name, body.categoryId, body.uomId, body.unitCost, body.unitPrice, body.reorderLevel, id)
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "update",
        entityType: "item",
        entityId: id,
        correlationId: correlationId(req),
      })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/items/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "items", "delete")
      if (!user) return
      const id = String(req.params.id)
      await db.prepare("UPDATE items SET deleted_at = NOW() WHERE id = ?").run(id)
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "delete",
        entityType: "item",
        entityId: id,
        correlationId: correlationId(req),
      })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  // ---- Warehouses ----
  const warehouseBody = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    city: z.string().optional(),
  })

  app.post("/api/erp/warehouses", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "warehouses", "create")
      if (!user) return
      const body = warehouseBody.parse(req.body)
      const id = randomUUID()
      await db
        .prepare("INSERT INTO warehouses (id, organization_id, code, name, city) VALUES (?, ?, ?, ?, ?)")
        .run(id, DEFAULT_ORG, body.code, body.name, body.city ?? null)
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/erp/warehouses/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "warehouses", "edit")
      if (!user) return
      const body = warehouseBody.parse(req.body)
      await db
        .prepare("UPDATE warehouses SET code=?, name=?, city=? WHERE id=? AND deleted_at IS NULL")
        .run(body.code, body.name, body.city ?? null, String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/warehouses/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "warehouses", "delete")
      if (!user) return
      const id = String(req.params.id)
      const stock = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM stock_balances WHERE warehouse_id = ? AND qty > 0", [id])
      if (Number(stock[0]?.n ?? 0) > 0) {
        res.status(400).json({ message: "Warehouse still holds stock" })
        return
      }
      await db.prepare("UPDATE warehouses SET deleted_at = NOW() WHERE id = ?").run(id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  // ---- Chart of accounts ----
  const accountBody = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    accountType: z.enum(["asset", "liability", "equity", "income", "expense"]),
  })

  app.post("/api/erp/accounts", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "accounts", "create")
      if (!user) return
      const body = accountBody.parse(req.body)
      const id = randomUUID()
      await db
        .prepare(
          "INSERT INTO chart_of_accounts (id, organization_id, code, name, account_type, is_postable) VALUES (?, ?, ?, ?, ?, TRUE)",
        )
        .run(id, DEFAULT_ORG, body.code, body.name, body.accountType)
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/erp/accounts/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "accounts", "edit")
      if (!user) return
      const body = accountBody.parse(req.body)
      await db
        .prepare("UPDATE chart_of_accounts SET code=?, name=?, account_type=? WHERE id=?")
        .run(body.code, body.name, body.accountType, String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/accounts/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "accounts", "delete")
      if (!user) return
      const id = String(req.params.id)
      const used = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM journal_lines WHERE account_id = ?", [id])
      if (Number(used[0]?.n ?? 0) > 0) {
        res.status(400).json({ message: "Account has journal lines; deactivate via edit instead of delete" })
        return
      }
      await db.prepare("DELETE FROM chart_of_accounts WHERE id = ?").run(id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  // ---- Expenses ----
  const expenseBody = z.object({
    amount: z.coerce.number().positive(),
    category: z.string().min(1),
    expenseDate: z.string().min(1),
    notes: z.string().optional(),
    costCenterId: z.string().optional(),
    receiptName: z.string().optional(),
  })

  app.post("/api/erp/expenses", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "expenses", "create")
      if (!user) return
      const body = expenseBody.parse(req.body)
      const emp = await db.query<{ id: string; department_id: string | null }>(
        "SELECT id, department_id FROM employees WHERE username = ? AND deleted_at IS NULL",
        [user.username],
      )
      if (!emp[0] && user.role === "employee") {
        res.status(400).json({ message: "No employee linked to this user" })
        return
      }
      const employeeId = emp[0]?.id ?? "emp-10"
      const id = randomUUID()
      const claimNo = `EXP-${Date.now().toString().slice(-6)}`
      await db
        .prepare(
          `INSERT INTO expense_claims (id, organization_id, claim_no, employee_id, department_id, cost_center_id, amount, status, submitted_at, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_approval', NOW(), ?, ?)`,
        )
        .run(
          id,
          DEFAULT_ORG,
          claimNo,
          employeeId,
          emp[0]?.department_id ?? "dept-eng",
          body.costCenterId || "cc-eng",
          body.amount,
          body.notes ?? null,
          user.username,
        )
      await db
        .prepare(
          "INSERT INTO expense_lines (id, claim_id, category, amount, expense_date, receipt_name) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(randomUUID(), id, body.category, body.amount, body.expenseDate, body.receiptName ?? null)
      res.status(201).json({ id, claimNo })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/erp/expenses/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "expenses", "edit")
      if (!user) return
      const body = expenseBody.parse(req.body)
      const id = String(req.params.id)
      const claim = await db.query<{ status: string }>("SELECT status FROM expense_claims WHERE id = ?", [id])
      if (!claim[0] || !["draft", "pending_approval", "rejected"].includes(claim[0].status)) {
        res.status(400).json({ message: "Only draft/pending/rejected claims can be edited" })
        return
      }
      await db.prepare("UPDATE expense_claims SET amount=?, notes=?, cost_center_id=? WHERE id=?").run(
        body.amount,
        body.notes ?? null,
        body.costCenterId || null,
        id,
      )
      await db.prepare("DELETE FROM expense_lines WHERE claim_id = ?").run(id)
      await db
        .prepare(
          "INSERT INTO expense_lines (id, claim_id, category, amount, expense_date, receipt_name) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(randomUUID(), id, body.category, body.amount, body.expenseDate, body.receiptName ?? null)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/expenses/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "expenses", "delete")
      if (!user) return
      const id = String(req.params.id)
      const claim = await db.query<{ status: string }>("SELECT status FROM expense_claims WHERE id = ?", [id])
      if (!claim[0] || !["draft", "rejected"].includes(claim[0].status)) {
        res.status(400).json({ message: "Only draft or rejected claims can be deleted" })
        return
      }
      await db.prepare("DELETE FROM expense_lines WHERE claim_id = ?").run(id)
      await db.prepare("DELETE FROM expense_claims WHERE id = ?").run(id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  // ---- Leaves update/delete ----
  app.put("/api/erp/leaves/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "leaves", "edit")
      if (!user) return
      const body = z
        .object({
          leaveTypeId: z.string(),
          startDate: z.string(),
          endDate: z.string(),
          reason: z.string().optional(),
        })
        .parse(req.body)
      const id = String(req.params.id)
      const row = await db.query<{ status: string }>("SELECT status FROM leave_requests WHERE id = ?", [id])
      if (!row[0] || !["draft", "pending_approval", "rejected"].includes(row[0].status)) {
        res.status(400).json({ message: "Approved leave cannot be edited" })
        return
      }
      await db
        .prepare(
          "UPDATE leave_requests SET leave_type_id=?, start_date=?, end_date=?, reason=?, updated_by=?, updated_at=NOW() WHERE id=?",
        )
        .run(body.leaveTypeId, body.startDate, body.endDate, body.reason ?? null, user.username, id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/leaves/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "leaves", "delete")
      if (!user) return
      const id = String(req.params.id)
      const row = await db.query<{ status: string }>("SELECT status FROM leave_requests WHERE id = ?", [id])
      if (!row[0] || !["draft", "rejected"].includes(row[0].status)) {
        res.status(400).json({ message: "Only draft or rejected leave can be deleted" })
        return
      }
      await db.prepare("DELETE FROM leave_requests WHERE id = ?").run(id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  // ---- Purchase orders ----
  const poBody = z.object({
    vendorId: z.string().min(1),
    warehouseId: z.string().min(1),
    itemId: z.string().min(1),
    qty: z.coerce.number().positive(),
    unitCost: z.coerce.number().positive(),
    expectedOn: z.string().optional(),
  })

  app.post("/api/erp/purchase-orders", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "procurement", "create")
      if (!user) return
      const body = poBody.parse(req.body)
      const id = randomUUID()
      const poNo = `PO-${Date.now().toString().slice(-6)}`
      const total = body.qty * body.unitCost
      await db
        .prepare(
          `INSERT INTO purchase_orders (id, organization_id, po_no, vendor_id, warehouse_id, status, order_date, expected_on, total_amount, created_by)
           VALUES (?, ?, ?, ?, ?, 'draft', CURRENT_DATE, ?, ?, ?)`,
        )
        .run(id, DEFAULT_ORG, poNo, body.vendorId, body.warehouseId, body.expectedOn ?? null, total, user.username)
      await db
        .prepare("INSERT INTO po_lines (id, purchase_order_id, item_id, qty, unit_cost) VALUES (?, ?, ?, ?, ?)")
        .run(randomUUID(), id, body.itemId, body.qty, body.unitCost)
      res.status(201).json({ id, poNo })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/erp/purchase-orders/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "procurement", "edit")
      if (!user) return
      const body = poBody.parse(req.body)
      const id = String(req.params.id)
      const po = await db.query<{ status: string }>("SELECT status FROM purchase_orders WHERE id = ?", [id])
      if (!po[0] || !["draft", "pending_approval"].includes(po[0].status)) {
        res.status(400).json({ message: "Only draft/pending POs can be edited" })
        return
      }
      const total = body.qty * body.unitCost
      await db
        .prepare(
          "UPDATE purchase_orders SET vendor_id=?, warehouse_id=?, expected_on=?, total_amount=?, updated_by=?, updated_at=NOW() WHERE id=?",
        )
        .run(body.vendorId, body.warehouseId, body.expectedOn ?? null, total, user.username, id)
      await db.prepare("DELETE FROM po_lines WHERE purchase_order_id = ?").run(id)
      await db
        .prepare("INSERT INTO po_lines (id, purchase_order_id, item_id, qty, unit_cost) VALUES (?, ?, ?, ?, ?)")
        .run(randomUUID(), id, body.itemId, body.qty, body.unitCost)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/purchase-orders/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "procurement", "delete")
      if (!user) return
      const id = String(req.params.id)
      const po = await db.query<{ status: string }>("SELECT status FROM purchase_orders WHERE id = ?", [id])
      if (!po[0] || po[0].status !== "draft") {
        res.status(400).json({ message: "Only draft purchase orders can be deleted" })
        return
      }
      await db.prepare("DELETE FROM po_lines WHERE purchase_order_id = ?").run(id)
      await db.prepare("DELETE FROM purchase_orders WHERE id = ?").run(id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  // ---- Sales orders ----
  const soBody = z.object({
    customerId: z.string().min(1),
    warehouseId: z.string().min(1),
    itemId: z.string().min(1),
    qty: z.coerce.number().positive(),
    unitPrice: z.coerce.number().positive(),
  })

  app.post("/api/erp/sales-orders", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "sales", "create")
      if (!user) return
      const body = soBody.parse(req.body)
      const id = randomUUID()
      const soNo = `SO-${Date.now().toString().slice(-6)}`
      const total = body.qty * body.unitPrice
      await db
        .prepare(
          `INSERT INTO sales_orders (id, organization_id, so_no, customer_id, warehouse_id, status, order_date, total_amount, created_by)
           VALUES (?, ?, ?, ?, ?, 'draft', CURRENT_DATE, ?, ?)`,
        )
        .run(id, DEFAULT_ORG, soNo, body.customerId, body.warehouseId, total, user.username)
      await db
        .prepare("INSERT INTO so_lines (id, sales_order_id, item_id, qty, unit_price) VALUES (?, ?, ?, ?, ?)")
        .run(randomUUID(), id, body.itemId, body.qty, body.unitPrice)
      res.status(201).json({ id, soNo })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/erp/sales-orders/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "sales", "edit")
      if (!user) return
      const body = soBody.parse(req.body)
      const id = String(req.params.id)
      const so = await db.query<{ status: string }>("SELECT status FROM sales_orders WHERE id = ?", [id])
      if (!so[0] || !["draft", "pending_approval"].includes(so[0].status)) {
        res.status(400).json({ message: "Only draft/pending sales orders can be edited" })
        return
      }
      const total = body.qty * body.unitPrice
      await db
        .prepare(
          "UPDATE sales_orders SET customer_id=?, warehouse_id=?, total_amount=?, updated_by=?, updated_at=NOW() WHERE id=?",
        )
        .run(body.customerId, body.warehouseId, total, user.username, id)
      await db.prepare("DELETE FROM so_lines WHERE sales_order_id = ?").run(id)
      await db
        .prepare("INSERT INTO so_lines (id, sales_order_id, item_id, qty, unit_price) VALUES (?, ?, ?, ?, ?)")
        .run(randomUUID(), id, body.itemId, body.qty, body.unitPrice)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/sales-orders/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "sales", "delete")
      if (!user) return
      const id = String(req.params.id)
      const so = await db.query<{ status: string }>("SELECT status FROM sales_orders WHERE id = ?", [id])
      if (!so[0] || so[0].status !== "draft") {
        res.status(400).json({ message: "Only draft sales orders can be deleted" })
        return
      }
      await db.prepare("DELETE FROM so_lines WHERE sales_order_id = ?").run(id)
      await db.prepare("DELETE FROM sales_orders WHERE id = ?").run(id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  // ---- Fixed assets ----
  const assetBody = z.object({
    assetNo: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    acquisitionDate: z.string().min(1),
    acquisitionCost: z.coerce.number().positive(),
    location: z.string().optional(),
    status: z.enum(["active", "in_store", "disposed"]).default("active"),
  })

  app.post("/api/erp/assets", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "assets", "create")
      if (!user) return
      const body = assetBody.parse(req.body)
      const id = randomUUID()
      await db
        .prepare(
          `INSERT INTO fixed_assets (id, organization_id, asset_no, name, category, acquisition_date, acquisition_cost, residual_value, useful_life_months, status, location)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1000, 36, ?, ?)`,
        )
        .run(
          id,
          DEFAULT_ORG,
          body.assetNo,
          body.name,
          body.category,
          body.acquisitionDate,
          body.acquisitionCost,
          body.status,
          body.location ?? null,
        )
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/erp/assets/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "assets", "edit")
      if (!user) return
      const body = assetBody.parse(req.body)
      await db
        .prepare(
          "UPDATE fixed_assets SET asset_no=?, name=?, category=?, acquisition_date=?, acquisition_cost=?, status=?, location=? WHERE id=?",
        )
        .run(
          body.assetNo,
          body.name,
          body.category,
          body.acquisitionDate,
          body.acquisitionCost,
          body.status,
          body.location ?? null,
          String(req.params.id),
        )
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/assets/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "assets", "delete")
      if (!user) return
      await db.prepare("UPDATE fixed_assets SET status = 'disposed' WHERE id = ?").run(String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  // ---- Recruitment ----
  const jobBody = z.object({
    title: z.string().min(1),
    departmentId: z.string().min(1),
    openings: z.coerce.number().int().positive(),
    status: z.enum(["draft", "approved", "closed"]).default("draft"),
  })

  app.post("/api/erp/recruitment", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "recruitment", "create")
      if (!user) return
      const body = jobBody.parse(req.body)
      const id = randomUUID()
      await db
        .prepare(
          "INSERT INTO job_requisitions (id, organization_id, title, department_id, status, openings, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(id, DEFAULT_ORG, body.title, body.departmentId, body.status, body.openings, user.username)
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/erp/recruitment/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "recruitment", "edit")
      if (!user) return
      const body = jobBody.parse(req.body)
      await db
        .prepare("UPDATE job_requisitions SET title=?, department_id=?, status=?, openings=? WHERE id=?")
        .run(body.title, body.departmentId, body.status, body.openings, String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/recruitment/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "recruitment", "delete")
      if (!user) return
      const id = String(req.params.id)
      await db.prepare("DELETE FROM interviews WHERE candidate_id IN (SELECT id FROM candidates WHERE requisition_id = ?)").run(id)
      await db.prepare("DELETE FROM offers WHERE candidate_id IN (SELECT id FROM candidates WHERE requisition_id = ?)").run(id)
      await db.prepare("DELETE FROM candidates WHERE requisition_id = ?").run(id)
      await db.prepare("DELETE FROM job_requisitions WHERE id = ?").run(id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  // ---- Bank accounts ----
  const bankBody = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    accountNo: z.string().min(1),
    bankName: z.string().min(1),
  })

  app.post("/api/erp/bank-accounts", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "banking", "create")
      if (!user) return
      const body = bankBody.parse(req.body)
      const id = randomUUID()
      await db
        .prepare(
          "INSERT INTO bank_accounts (id, organization_id, code, name, account_no, bank_name, gl_account_id, balance) VALUES (?, ?, ?, ?, ?, ?, 'acc-1010', 0)",
        )
        .run(id, DEFAULT_ORG, body.code, body.name, body.accountNo, body.bankName)
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/erp/bank-accounts/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "banking", "edit")
      if (!user) return
      const body = bankBody.parse(req.body)
      await db
        .prepare("UPDATE bank_accounts SET code=?, name=?, account_no=?, bank_name=? WHERE id=?")
        .run(body.code, body.name, body.accountNo, body.bankName, String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/bank-accounts/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "banking", "delete")
      if (!user) return
      const id = String(req.params.id)
      const bal = await db.query<{ balance: number }>("SELECT balance::float AS balance FROM bank_accounts WHERE id = ?", [id])
      if (Number(bal[0]?.balance ?? 0) !== 0) {
        res.status(400).json({ message: "Bank account balance must be zero before delete" })
        return
      }
      await db.prepare("DELETE FROM bank_accounts WHERE id = ?").run(id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  // ---- Budgets ----
  const budgetBody = z.object({
    departmentId: z.string().min(1),
    accountId: z.string().min(1),
    costCenterId: z.string().optional(),
    fiscalYear: z.coerce.number().int(),
    amount: z.coerce.number().positive(),
  })

  app.post("/api/erp/budgets", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "budgets", "create")
      if (!user) return
      const body = budgetBody.parse(req.body)
      const id = randomUUID()
      await db
        .prepare(
          "INSERT INTO budgets (id, organization_id, department_id, cost_center_id, account_id, fiscal_year, amount) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(id, DEFAULT_ORG, body.departmentId, body.costCenterId || null, body.accountId, body.fiscalYear, body.amount)
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/erp/budgets/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "budgets", "edit")
      if (!user) return
      const body = budgetBody.parse(req.body)
      await db
        .prepare("UPDATE budgets SET department_id=?, cost_center_id=?, account_id=?, fiscal_year=?, amount=? WHERE id=?")
        .run(body.departmentId, body.costCenterId || null, body.accountId, body.fiscalYear, body.amount, String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/budgets/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "budgets", "delete")
      if (!user) return
      await db.prepare("DELETE FROM budgets WHERE id = ?").run(String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })
}
