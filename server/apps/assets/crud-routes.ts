import { randomUUID } from "node:crypto"
import type { Express } from "express"
import { z } from "zod"
import type { AppDatabase } from "../../shared/db"
import { logActivity, requirePerm } from "./api-helpers"
import { WO_TRANSITIONS } from "./transitions"

const VALID_STATUS = ["active", "assigned", "under_maintenance", "retired"] as const

export function registerAssetsCrud(app: Express, db: AppDatabase) {
  const assetBody = z.object({
    name: z.string().min(1),
    categoryId: z.string().min(1),
    manufacturer: z.string().optional(),
    modelNumber: z.string().optional(),
    serialNumber: z.string().min(1),
    description: z.string().optional(),
    purchaseDate: z.string().min(1),
    purchaseCost: z.coerce.number().nonnegative(),
    vendorId: z.string().optional().nullable(),
    warrantyStart: z.string().optional().nullable(),
    warrantyEnd: z.string().optional().nullable(),
    usefulLifeMonths: z.coerce.number().int().positive().default(36),
    depreciationMethod: z.string().default("straight_line"),
    departmentId: z.string().optional().nullable(),
    assignedEmployeeId: z.string().optional().nullable(),
    locationId: z.string().optional().nullable(),
    condition: z.enum(["excellent", "good", "fair", "poor"]).default("good"),
    status: z.enum(VALID_STATUS).default("active"),
    maintenanceFrequencyDays: z.coerce.number().int().positive().default(90),
    lastMaintenanceDate: z.string().optional().nullable(),
    nextMaintenanceDate: z.string().optional().nullable(),
  })

  app.post("/api/assets/register", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "assets", "create")
      if (!user) return
      const body = assetBody.parse(req.body)
      if (body.warrantyStart && body.warrantyEnd && body.warrantyEnd < body.warrantyStart) {
        res.status(400).json({ message: "Warranty end must be on or after warranty start" })
        return
      }
      const dup = await db.query("SELECT id FROM assets WHERE serial_number = ? AND deleted_at IS NULL", [body.serialNumber])
      if (dup[0]) {
        res.status(400).json({ message: "Duplicate serial number" })
        return
      }
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM assets")
      const n = Number(count[0]?.n ?? 0) + 1
      const id = randomUUID()
      const assetNo = `A${String(n).padStart(5, "0")}`
      const tag = `TAG-${String(n).padStart(5, "0")}`
      await db
        .prepare(
          `INSERT INTO assets (
            id, asset_no, name, asset_tag, category_id, manufacturer, model_number, serial_number, description,
            purchase_date, purchase_cost, vendor_id, warranty_start, warranty_end, useful_life_months,
            depreciation_method, book_value, department_id, assigned_employee_id, location_id,
            condition, status, maintenance_frequency_days, last_maintenance_date, next_maintenance_date,
            created_by, updated_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          assetNo,
          body.name,
          tag,
          body.categoryId,
          body.manufacturer ?? "",
          body.modelNumber ?? "",
          body.serialNumber,
          body.description ?? "",
          body.purchaseDate,
          body.purchaseCost,
          body.vendorId || null,
          body.warrantyStart || null,
          body.warrantyEnd || null,
          body.usefulLifeMonths,
          body.depreciationMethod,
          body.purchaseCost,
          body.departmentId || null,
          body.assignedEmployeeId || null,
          body.locationId || null,
          body.condition,
          body.status,
          body.maintenanceFrequencyDays,
          body.lastMaintenanceDate || null,
          body.nextMaintenanceDate || null,
          user.username,
          user.username,
        )
      await logActivity(db, { entityType: "asset", entityId: id, action: "create", details: assetNo, actor: user.username })
      res.status(201).json({ id, assetNo, assetTag: tag })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/assets/register/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "assets", "edit")
      if (!user) return
      const body = assetBody.parse(req.body)
      const id = String(req.params.id)
      const existing = await db.query<{ status: string; serial_number: string }>(
        "SELECT status, serial_number FROM assets WHERE id = ? AND deleted_at IS NULL",
        [id],
      )
      if (!existing[0]) {
        res.status(404).json({ message: "Asset not found" })
        return
      }
      if (existing[0].status === "retired" && body.status !== "retired") {
        res.status(400).json({ message: "Cannot reactivate a retired asset" })
        return
      }
      if (body.serialNumber !== existing[0].serial_number) {
        const dup = await db.query("SELECT id FROM assets WHERE serial_number = ? AND id <> ? AND deleted_at IS NULL", [
          body.serialNumber,
          id,
        ])
        if (dup[0]) {
          res.status(400).json({ message: "Duplicate serial number" })
          return
        }
      }
      await db
        .prepare(
          `UPDATE assets SET name=?, category_id=?, manufacturer=?, model_number=?, serial_number=?, description=?,
           purchase_date=?, purchase_cost=?, vendor_id=?, warranty_start=?, warranty_end=?, useful_life_months=?,
           depreciation_method=?, department_id=?, assigned_employee_id=?, location_id=?, condition=?, status=?,
           maintenance_frequency_days=?, last_maintenance_date=?, next_maintenance_date=?, updated_by=?, updated_at=NOW()
           WHERE id=? AND deleted_at IS NULL`,
        )
        .run(
          body.name,
          body.categoryId,
          body.manufacturer ?? "",
          body.modelNumber ?? "",
          body.serialNumber,
          body.description ?? "",
          body.purchaseDate,
          body.purchaseCost,
          body.vendorId || null,
          body.warrantyStart || null,
          body.warrantyEnd || null,
          body.usefulLifeMonths,
          body.depreciationMethod,
          body.departmentId || null,
          body.assignedEmployeeId || null,
          body.locationId || null,
          body.condition,
          body.status,
          body.maintenanceFrequencyDays,
          body.lastMaintenanceDate || null,
          body.nextMaintenanceDate || null,
          user.username,
          id,
        )
      await logActivity(db, { entityType: "asset", entityId: id, action: "update", actor: user.username })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/assets/register/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "assets", "delete")
      if (!user) return
      const id = String(req.params.id)
      await db
        .prepare("UPDATE assets SET status='retired', deleted_at=NOW(), updated_by=?, updated_at=NOW() WHERE id=? AND deleted_at IS NULL")
        .run(user.username, id)
      await logActivity(db, { entityType: "asset", entityId: id, action: "retire", actor: user.username })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  const categoryBody = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    parentId: z.string().optional().nullable(),
    active: z.boolean().default(true),
  })

  app.post("/api/assets/categories", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "categories", "create")
      if (!user) return
      const body = categoryBody.parse(req.body)
      const id = randomUUID()
      await db
        .prepare("INSERT INTO categories (id, code, name, parent_id, active) VALUES (?, ?, ?, ?, ?)")
        .run(id, body.code.toUpperCase(), body.name, body.parentId || null, body.active)
      await logActivity(db, { entityType: "category", entityId: id, action: "create", actor: user.username })
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/assets/categories/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "categories", "edit")
      if (!user) return
      const body = categoryBody.parse(req.body)
      const id = String(req.params.id)
      await db
        .prepare("UPDATE categories SET code=?, name=?, parent_id=?, active=? WHERE id=? AND deleted_at IS NULL")
        .run(body.code.toUpperCase(), body.name, body.parentId || null, body.active, id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/assets/categories/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "categories", "delete")
      if (!user) return
      const id = String(req.params.id)
      await db.prepare("UPDATE categories SET deleted_at=NOW(), active=FALSE WHERE id=?").run(id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  const assignBody = z.object({
    assetId: z.string().min(1),
    employeeId: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
    locationId: z.string().optional().nullable(),
    assignedAt: z.string().min(1),
    reason: z.string().optional(),
    approvalStatus: z.enum(["pending", "approved", "rejected"]).default("approved"),
  })

  app.post("/api/assets/assignments", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "assignments", "create")
      if (!user) return
      const body = assignBody.parse(req.body)
      const active = await db.query("SELECT id FROM assignments WHERE asset_id = ? AND active = TRUE", [body.assetId])
      if (active[0]) {
        res.status(400).json({ message: "Asset already has an active assignment. Transfer or return first." })
        return
      }
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM assignments")
      const id = randomUUID()
      const assignmentNo = `ASG${String(Number(count[0]?.n ?? 0) + 1).padStart(5, "0")}`
      await db
        .prepare(
          `INSERT INTO assignments (id, assignment_no, asset_id, employee_id, department_id, location_id, assigned_at, reason, approval_status, active, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
        )
        .run(
          id,
          assignmentNo,
          body.assetId,
          body.employeeId || null,
          body.departmentId || null,
          body.locationId || null,
          body.assignedAt,
          body.reason ?? "",
          body.approvalStatus,
          user.username,
        )
      await db
        .prepare(
          "UPDATE assets SET assigned_employee_id=?, department_id=COALESCE(?, department_id), location_id=COALESCE(?, location_id), status='assigned', updated_at=NOW() WHERE id=?",
        )
        .run(body.employeeId || null, body.departmentId || null, body.locationId || null, body.assetId)
      await logActivity(db, {
        entityType: "assignment",
        entityId: id,
        action: "assign",
        details: body.reason,
        actor: user.username,
      })
      res.status(201).json({ id, assignmentNo })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/assets/assignments/:id/transfer", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "assignments", "edit")
      if (!user) return
      const body = assignBody.extend({ reason: z.string().min(1) }).parse(req.body)
      const id = String(req.params.id)
      const current = await db.query<{ asset_id: string }>("SELECT asset_id FROM assignments WHERE id = ? AND active = TRUE", [id])
      if (!current[0]) {
        res.status(404).json({ message: "Active assignment not found" })
        return
      }
      await db
        .prepare("UPDATE assignments SET active=FALSE, returned_at=CURRENT_DATE WHERE id=?")
        .run(id)
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM assignments")
      const newId = randomUUID()
      const assignmentNo = `ASG${String(Number(count[0]?.n ?? 0) + 1).padStart(5, "0")}`
      await db
        .prepare(
          `INSERT INTO assignments (id, assignment_no, asset_id, employee_id, department_id, location_id, assigned_at, reason, approval_status, active, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
        )
        .run(
          newId,
          assignmentNo,
          current[0].asset_id,
          body.employeeId || null,
          body.departmentId || null,
          body.locationId || null,
          body.assignedAt,
          body.reason,
          body.approvalStatus,
          user.username,
        )
      await db
        .prepare(
          "UPDATE assets SET assigned_employee_id=?, department_id=COALESCE(?, department_id), location_id=COALESCE(?, location_id), status='assigned', updated_at=NOW() WHERE id=?",
        )
        .run(body.employeeId || null, body.departmentId || null, body.locationId || null, current[0].asset_id)
      await logActivity(db, {
        entityType: "assignment",
        entityId: newId,
        action: "transfer",
        details: body.reason,
        actor: user.username,
      })
      res.json({ id: newId, assignmentNo })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/assets/assignments/:id/return", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "assignments", "edit")
      if (!user) return
      const id = String(req.params.id)
      const current = await db.query<{ asset_id: string }>("SELECT asset_id FROM assignments WHERE id = ? AND active = TRUE", [id])
      if (!current[0]) {
        res.status(404).json({ message: "Active assignment not found" })
        return
      }
      await db.prepare("UPDATE assignments SET active=FALSE, returned_at=CURRENT_DATE WHERE id=?").run(id)
      await db
        .prepare("UPDATE assets SET assigned_employee_id=NULL, status='active', updated_at=NOW() WHERE id=?")
        .run(current[0].asset_id)
      await logActivity(db, { entityType: "assignment", entityId: id, action: "return", actor: user.username })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  const woBody = z.object({
    assetId: z.string().min(1),
    maintenanceType: z.enum(["preventive", "corrective"]),
    issueDescription: z.string().min(1),
    priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    scheduledAt: z.string().optional().nullable(),
    assignedTechnician: z.string().optional(),
    estimatedCost: z.coerce.number().nonnegative().default(0),
  })

  app.post("/api/assets/work-orders", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "maintenance", "create")
      if (!user) return
      const body = woBody.parse(req.body)
      if (body.scheduledAt && new Date(body.scheduledAt).getTime() < Date.now() - 86400000) {
        res.status(400).json({ message: "Scheduled date cannot be in the distant past" })
        return
      }
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM work_orders")
      const id = randomUUID()
      const workOrderNo = `WO${String(Number(count[0]?.n ?? 0) + 1).padStart(5, "0")}`
      const status = body.scheduledAt ? "scheduled" : "open"
      await db
        .prepare(
          `INSERT INTO work_orders (
            id, work_order_no, asset_id, maintenance_type, issue_description, priority, scheduled_at,
            assigned_technician, estimated_cost, status, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          workOrderNo,
          body.assetId,
          body.maintenanceType,
          body.issueDescription,
          body.priority,
          body.scheduledAt || null,
          body.assignedTechnician || "tech",
          body.estimatedCost,
          status,
          user.username,
        )
      await db
        .prepare(
          "INSERT INTO work_order_history (id, work_order_id, from_status, to_status, note, actor) VALUES (?, ?, NULL, ?, 'Created', ?)",
        )
        .run(randomUUID(), id, status, user.username)
      await db
        .prepare("UPDATE assets SET status='under_maintenance', updated_at=NOW() WHERE id=? AND status <> 'retired'")
        .run(body.assetId)
      await logActivity(db, { entityType: "work_order", entityId: id, action: "create", actor: user.username })
      res.status(201).json({ id, workOrderNo })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/assets/work-orders/:id/status", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "maintenance", "edit")
      if (!user) return
      const id = String(req.params.id)
      const body = z
        .object({
          status: z.enum(["open", "scheduled", "in_progress", "on_hold", "completed", "closed"]),
          note: z.string().optional(),
          actualCost: z.coerce.number().optional(),
          technicianNotes: z.string().optional(),
          partsReplaced: z.string().optional(),
        })
        .parse(req.body)
      const current = await db.query<{ status: string; asset_id: string }>(
        "SELECT status, asset_id FROM work_orders WHERE id = ? AND deleted_at IS NULL",
        [id],
      )
      if (!current[0]) {
        res.status(404).json({ message: "Work order not found" })
        return
      }
      const allowed = WO_TRANSITIONS[current[0].status] ?? []
      if (!allowed.includes(body.status)) {
        res.status(400).json({
          message: `Invalid transition from ${current[0].status} to ${body.status}`,
          allowed,
        })
        return
      }
      await db
        .prepare(
          `UPDATE work_orders SET status=?, actual_cost=COALESCE(?, actual_cost),
           technician_notes=COALESCE(?, technician_notes), parts_replaced=COALESCE(?, parts_replaced),
           completed_at=CASE WHEN ? IN ('completed','closed') THEN COALESCE(completed_at, NOW()) ELSE completed_at END,
           updated_at=NOW() WHERE id=?`,
        )
        .run(
          body.status,
          body.actualCost ?? null,
          body.technicianNotes ?? null,
          body.partsReplaced ?? null,
          body.status,
          id,
        )
      await db
        .prepare(
          "INSERT INTO work_order_history (id, work_order_id, from_status, to_status, note, actor) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(randomUUID(), id, current[0].status, body.status, body.note ?? "", user.username)
      if (body.status === "completed" || body.status === "closed") {
        await db
          .prepare(
            "UPDATE assets SET status='active', last_maintenance_date=CURRENT_DATE, next_maintenance_date=CURRENT_DATE + INTERVAL '90 days', updated_at=NOW() WHERE id=?",
          )
          .run(current[0].asset_id)
      }
      await logActivity(db, {
        entityType: "work_order",
        entityId: id,
        action: `status:${body.status}`,
        actor: user.username,
      })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/assets/work-orders/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "maintenance", "delete")
      if (!user) return
      await db.prepare("UPDATE work_orders SET deleted_at=NOW() WHERE id=?").run(String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  const vendorBody = z.object({
    name: z.string().min(1),
    contactPerson: z.string().optional(),
    email: z.string().email(),
    phone: z.string().min(8),
    address: z.string().optional(),
    taxId: z.string().optional(),
    serviceCategories: z.string().optional(),
    contractStart: z.string().optional().nullable(),
    contractEnd: z.string().optional().nullable(),
  })

  app.post("/api/assets/vendors", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "vendors", "create")
      if (!user) return
      const body = vendorBody.parse(req.body)
      if (body.contractStart && body.contractEnd && body.contractEnd < body.contractStart) {
        res.status(400).json({ message: "Contract end must be on or after start" })
        return
      }
      const dup = await db.query("SELECT id FROM vendors WHERE LOWER(email)=LOWER(?) AND deleted_at IS NULL", [body.email])
      if (dup[0]) {
        res.status(400).json({ message: "Duplicate vendor email" })
        return
      }
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM vendors")
      const id = randomUUID()
      const vendorNo = `V${String(Number(count[0]?.n ?? 0) + 1).padStart(5, "0")}`
      await db
        .prepare(
          `INSERT INTO vendors (id, vendor_no, name, contact_person, email, phone, address, tax_id, service_categories, contract_start, contract_end)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          vendorNo,
          body.name,
          body.contactPerson ?? "",
          body.email,
          body.phone,
          body.address ?? "",
          body.taxId ?? "",
          body.serviceCategories ?? "",
          body.contractStart || null,
          body.contractEnd || null,
        )
      await logActivity(db, { entityType: "vendor", entityId: id, action: "create", actor: user.username })
      res.status(201).json({ id, vendorNo })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/assets/vendors/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "vendors", "edit")
      if (!user) return
      const body = vendorBody.parse(req.body)
      const id = String(req.params.id)
      await db
        .prepare(
          `UPDATE vendors SET name=?, contact_person=?, email=?, phone=?, address=?, tax_id=?, service_categories=?,
           contract_start=?, contract_end=? WHERE id=? AND deleted_at IS NULL`,
        )
        .run(
          body.name,
          body.contactPerson ?? "",
          body.email,
          body.phone,
          body.address ?? "",
          body.taxId ?? "",
          body.serviceCategories ?? "",
          body.contractStart || null,
          body.contractEnd || null,
          id,
        )
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/assets/vendors/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "vendors", "delete")
      if (!user) return
      await db.prepare("UPDATE vendors SET deleted_at=NOW() WHERE id=?").run(String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })
}
