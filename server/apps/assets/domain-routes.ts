import type { Express } from "express"
import type { AppDatabase } from "../../shared/db"
import { okList, parsePaging, requirePerm, requireUser } from "./api-helpers"
import { registerAssetsCrud } from "./crud-routes"
import { ROLE_PERMISSIONS } from "./rbac"

export function registerAssetsApi(app: Express, db: AppDatabase) {
  app.get("/api/assets/v1/openapi.json", (_req, res) => {
    res.json({
      openapi: "3.0.3",
      info: {
        title: "Asset Register & Maintenance API",
        version: "1.0.0",
        description: "Synthetic enterprise asset training data only.",
      },
      servers: [{ url: "/api/assets" }],
      paths: {
        "/dashboard": { get: { summary: "Dashboard KPIs" } },
        "/register": { get: { summary: "List assets" }, post: { summary: "Register asset" } },
        "/categories": { get: { summary: "List categories" } },
        "/assignments": { get: { summary: "List assignments" }, post: { summary: "Assign asset" } },
        "/work-orders": { get: { summary: "List work orders" }, post: { summary: "Create work order" } },
        "/vendors": { get: { summary: "List vendors" } },
      },
    })
  })

  app.get("/api/assets/permissions/me", async (req, res, next) => {
    try {
      const user = await requireUser(db, req, res)
      if (!user) return
      res.json({ role: user.role, permissions: ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] ?? {} })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/assets/dashboard", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "dashboard", "view"))) return
      const [total, byStatus, byCategory, byLocation, upcoming, overdue, warranty, value, recent, transactions] =
        await Promise.all([
          db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM assets WHERE deleted_at IS NULL"),
          db.query<{ status: string; n: number }>(
            "SELECT status, COUNT(*)::int AS n FROM assets WHERE deleted_at IS NULL GROUP BY status",
          ),
          db.query<{ name: string; n: number }>(
            `SELECT c.name, COUNT(a.id)::int AS n FROM categories c
             LEFT JOIN assets a ON a.category_id = c.id AND a.deleted_at IS NULL
             WHERE c.deleted_at IS NULL GROUP BY c.id, c.name ORDER BY n DESC`,
          ),
          db.query<{ name: string; n: number }>(
            `SELECT l.name, COUNT(a.id)::int AS n FROM locations l
             LEFT JOIN assets a ON a.location_id = l.id AND a.deleted_at IS NULL
             GROUP BY l.id, l.name ORDER BY n DESC LIMIT 8`,
          ),
          db.query(
            `SELECT wo.id, wo.work_order_no AS "workOrderNo", wo.scheduled_at AS "scheduledAt", wo.priority, a.name AS asset
             FROM work_orders wo JOIN assets a ON a.id = wo.asset_id
             WHERE wo.deleted_at IS NULL AND wo.status IN ('open','scheduled') AND wo.scheduled_at >= NOW()
             ORDER BY wo.scheduled_at ASC LIMIT 8`,
          ),
          db.query<{ n: number }>(
            `SELECT COUNT(*)::int AS n FROM work_orders
             WHERE deleted_at IS NULL AND status NOT IN ('completed','closed')
               AND scheduled_at < NOW()`,
          ),
          db.query<{ n: number }>(
            `SELECT COUNT(*)::int AS n FROM assets
             WHERE deleted_at IS NULL AND warranty_end IS NOT NULL
               AND warranty_end <= (CURRENT_DATE + INTERVAL '30 days') AND warranty_end >= CURRENT_DATE`,
          ),
          db.query<{ purchase: number; book: number }>(
            `SELECT COALESCE(SUM(purchase_cost),0)::float AS purchase, COALESCE(SUM(book_value),0)::float AS book
             FROM assets WHERE deleted_at IS NULL AND status <> 'retired'`,
          ),
          db.query(
            `SELECT id, asset_no AS "assetNo", name, status, created_at AS "createdAt"
             FROM assets WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 8`,
          ),
          db.query(
            `SELECT id, action, details, actor, created_at AS "createdAt"
             FROM activity_logs ORDER BY created_at DESC LIMIT 10`,
          ),
        ])

      const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, r.n]))
      res.json({
        totalAssets: Number(total[0]?.n ?? 0),
        byStatus: statusMap,
        active: Number(statusMap.active ?? 0),
        assigned: Number(statusMap.assigned ?? 0),
        underMaintenance: Number(statusMap.under_maintenance ?? 0),
        retired: Number(statusMap.retired ?? 0),
        byCategory,
        byLocation,
        upcomingMaintenance: upcoming,
        overdueMaintenance: Number(overdue[0]?.n ?? 0),
        warrantyAlerts: Number(warranty[0]?.n ?? 0),
        purchaseValue: Number(value[0]?.purchase ?? 0),
        bookValue: Number(value[0]?.book ?? 0),
        recentAssets: recent,
        recentTransactions: transactions,
      })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/assets/lookups", async (req, res, next) => {
    try {
      if (!(await requireUser(db, req, res))) return
      const [categories, departments, locations, employees, vendors, assets] = await Promise.all([
        db.query<{ id: string; code: string; name: string }>(
          "SELECT id, code, name FROM categories WHERE deleted_at IS NULL AND active = TRUE ORDER BY name",
        ),
        db.query<{ id: string; code: string; name: string }>("SELECT id, code, name FROM departments ORDER BY name"),
        db.query<{ id: string; code: string; name: string; building: string }>(
          "SELECT id, code, name, building FROM locations ORDER BY name",
        ),
        db.query<{ id: string; code: string; name: string }>(
          'SELECT id, emp_no AS code, name FROM employees ORDER BY name',
        ),
        db.query<{ id: string; code: string; name: string }>(
          'SELECT id, vendor_no AS code, name FROM vendors WHERE deleted_at IS NULL ORDER BY name',
        ),
        db.query<{ id: string; code: string; name: string }>(
          'SELECT id, asset_no AS code, name FROM assets WHERE deleted_at IS NULL AND status <> \'retired\' ORDER BY asset_no LIMIT 200',
        ),
      ])
      res.json({ categories, departments, locations, employees, vendors, assets })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/assets/register", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "assets", "view"))) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const status = String(req.query.status ?? "").trim()
      const categoryId = String(req.query.categoryId ?? "").trim()
      const departmentId = String(req.query.departmentId ?? "").trim()
      const locationId = String(req.query.locationId ?? "").trim()
      const params: unknown[] = []
      let where = "a.deleted_at IS NULL"
      if (q) {
        where += " AND (LOWER(a.name) LIKE ? OR LOWER(a.asset_no) LIKE ? OR LOWER(a.asset_tag) LIKE ? OR LOWER(a.serial_number) LIKE ?)"
        const like = `%${q}%`
        params.push(like, like, like, like)
      }
      if (status) {
        where += " AND a.status = ?"
        params.push(status)
      }
      if (categoryId) {
        where += " AND a.category_id = ?"
        params.push(categoryId)
      }
      if (departmentId) {
        where += " AND a.department_id = ?"
        params.push(departmentId)
      }
      if (locationId) {
        where += " AND a.location_id = ?"
        params.push(locationId)
      }
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM assets a WHERE ${where}`, params)
      const rows = await db.query(
        `SELECT a.id, a.asset_no AS "assetNo", a.name, a.asset_tag AS "assetTag", a.serial_number AS "serialNumber",
                a.manufacturer, a.model_number AS "modelNumber", a.purchase_date AS "purchaseDate",
                a.purchase_cost::float AS "purchaseCost", a.book_value::float AS "bookValue",
                a.condition, a.status, a.next_maintenance_date AS "nextMaintenanceDate",
                a.warranty_end AS "warrantyEnd", a.category_id AS "categoryId",
                c.name AS category, d.name AS department, l.name AS location, e.name AS "assignedEmployee",
                a.department_id AS "departmentId", a.location_id AS "locationId",
                a.assigned_employee_id AS "assignedEmployeeId", a.vendor_id AS "vendorId",
                a.useful_life_months AS "usefulLifeMonths", a.depreciation_method AS "depreciationMethod",
                a.maintenance_frequency_days AS "maintenanceFrequencyDays",
                a.warranty_start AS "warrantyStart", a.last_maintenance_date AS "lastMaintenanceDate",
                a.description
         FROM assets a
         JOIN categories c ON c.id = a.category_id
         LEFT JOIN departments d ON d.id = a.department_id
         LEFT JOIN locations l ON l.id = a.location_id
         LEFT JOIN employees e ON e.id = a.assigned_employee_id
         WHERE ${where}
         ORDER BY a.asset_no LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/assets/register/:id", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "assets", "view"))) return
      const id = String(req.params.id)
      const asset = await db.query(
        `SELECT a.id, a.asset_no AS "assetNo", a.name, a.asset_tag AS "assetTag", a.serial_number AS "serialNumber",
                a.manufacturer, a.model_number AS "modelNumber", a.description,
                a.purchase_date AS "purchaseDate", a.purchase_cost::float AS "purchaseCost",
                a.book_value::float AS "bookValue", a.condition, a.status,
                a.warranty_start AS "warrantyStart", a.warranty_end AS "warrantyEnd",
                a.useful_life_months AS "usefulLifeMonths", a.depreciation_method AS "depreciationMethod",
                a.maintenance_frequency_days AS "maintenanceFrequencyDays",
                a.last_maintenance_date AS "lastMaintenanceDate", a.next_maintenance_date AS "nextMaintenanceDate",
                a.category_id AS "categoryId", a.vendor_id AS "vendorId",
                a.department_id AS "departmentId", a.location_id AS "locationId",
                a.assigned_employee_id AS "assignedEmployeeId",
                c.name AS category, v.name AS vendor, d.name AS department, l.name AS location, e.name AS "assignedEmployee"
         FROM assets a
         JOIN categories c ON c.id = a.category_id
         LEFT JOIN vendors v ON v.id = a.vendor_id
         LEFT JOIN departments d ON d.id = a.department_id
         LEFT JOIN locations l ON l.id = a.location_id
         LEFT JOIN employees e ON e.id = a.assigned_employee_id
         WHERE a.id = ? AND a.deleted_at IS NULL`,
        [id],
      )
      if (!asset[0]) {
        res.status(404).json({ message: "Asset not found" })
        return
      }
      const [assignments, workOrders, activity] = await Promise.all([
        db.query(
          `SELECT asg.assignment_no AS "assignmentNo", asg.assigned_at AS "assignedAt", asg.returned_at AS "returnedAt",
                  asg.reason, asg.approval_status AS "approvalStatus", asg.active, e.name AS employee
           FROM assignments asg LEFT JOIN employees e ON e.id = asg.employee_id
           WHERE asg.asset_id = ? ORDER BY asg.assigned_at DESC`,
          [id],
        ),
        db.query(
          `SELECT id, work_order_no AS "workOrderNo", maintenance_type AS "maintenanceType", status, priority,
                  scheduled_at AS "scheduledAt", estimated_cost::float AS "estimatedCost"
           FROM work_orders WHERE asset_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 30`,
          [id],
        ),
        db.query(
          "SELECT action, details, actor, created_at AS \"createdAt\" FROM activity_logs WHERE entity_type = 'asset' AND entity_id = ? ORDER BY created_at DESC LIMIT 20",
          [id],
        ),
      ])
      res.json({ asset: asset[0], assignments, workOrders, activity })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/assets/categories", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "categories", "view"))) return
      const rows = await db.query(
        `SELECT c.id, c.code, c.name, c.parent_id AS "parentId", c.active,
                COUNT(a.id)::int AS "assetCount"
         FROM categories c
         LEFT JOIN assets a ON a.category_id = c.id AND a.deleted_at IS NULL
         WHERE c.deleted_at IS NULL
         GROUP BY c.id ORDER BY c.code`,
      )
      res.json({ data: rows, total: rows.length, page: 1, pageSize: rows.length })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/assets/assignments", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "assignments", "view"))) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const params: unknown[] = []
      let where = "TRUE"
      if (q) {
        where += " AND (LOWER(a.asset_no) LIKE ? OR LOWER(e.name) LIKE ? OR LOWER(asg.assignment_no) LIKE ?)"
        const like = `%${q}%`
        params.push(like, like, like)
      }
      const total = await db.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM assignments asg
         JOIN assets a ON a.id = asg.asset_id
         LEFT JOIN employees e ON e.id = asg.employee_id
         WHERE ${where}`,
        params,
      )
      const rows = await db.query(
        `SELECT asg.id, asg.assignment_no AS "assignmentNo", asg.asset_id AS "assetId",
                a.asset_no AS "assetNo", a.name AS asset, e.name AS employee,
                d.name AS department, l.name AS location,
                asg.assigned_at AS "assignedAt", asg.returned_at AS "returnedAt",
                asg.reason, asg.approval_status AS "approvalStatus", asg.active,
                asg.employee_id AS "employeeId", asg.department_id AS "departmentId", asg.location_id AS "locationId"
         FROM assignments asg
         JOIN assets a ON a.id = asg.asset_id
         LEFT JOIN employees e ON e.id = asg.employee_id
         LEFT JOIN departments d ON d.id = asg.department_id
         LEFT JOIN locations l ON l.id = asg.location_id
         WHERE ${where}
         ORDER BY asg.assigned_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/assets/work-orders", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "maintenance", "view"))) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const status = String(req.query.status ?? "").trim()
      const params: unknown[] = []
      let where = "wo.deleted_at IS NULL"
      if (q) {
        where += " AND (LOWER(wo.work_order_no) LIKE ? OR LOWER(a.name) LIKE ? OR LOWER(wo.issue_description) LIKE ?)"
        const like = `%${q}%`
        params.push(like, like, like)
      }
      if (status) {
        where += " AND wo.status = ?"
        params.push(status)
      }
      const total = await db.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM work_orders wo JOIN assets a ON a.id = wo.asset_id WHERE ${where}`,
        params,
      )
      const rows = await db.query(
        `SELECT wo.id, wo.work_order_no AS "workOrderNo", wo.asset_id AS "assetId", a.name AS asset, a.asset_no AS "assetNo",
                wo.maintenance_type AS "maintenanceType", wo.issue_description AS "issueDescription",
                wo.priority, wo.reported_at AS "reportedAt", wo.scheduled_at AS "scheduledAt",
                wo.assigned_technician AS "assignedTechnician", wo.estimated_cost::float AS "estimatedCost",
                wo.actual_cost::float AS "actualCost", wo.status, wo.completed_at AS "completedAt",
                wo.technician_notes AS "technicianNotes", wo.parts_replaced AS "partsReplaced"
         FROM work_orders wo JOIN assets a ON a.id = wo.asset_id
         WHERE ${where}
         ORDER BY wo.scheduled_at NULLS LAST, wo.created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/assets/vendors", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "vendors", "view"))) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const params: unknown[] = []
      let where = "deleted_at IS NULL"
      if (q) {
        where += " AND (LOWER(name) LIKE ? OR LOWER(vendor_no) LIKE ? OR LOWER(email) LIKE ?)"
        const like = `%${q}%`
        params.push(like, like, like)
      }
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM vendors WHERE ${where}`, params)
      const rows = await db.query(
        `SELECT id, vendor_no AS "vendorNo", name, contact_person AS "contactPerson", email, phone, address,
                tax_id AS "taxId", service_categories AS "serviceCategories",
                contract_start AS "contractStart", contract_end AS "contractEnd"
         FROM vendors WHERE ${where} ORDER BY vendor_no LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/assets/reports/:name", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "reports", "view"))) return
      const name = String(req.params.name)
      if (name === "inventory") {
        const rows = await db.query(
          `SELECT asset_no AS "assetNo", name, status, purchase_cost::float AS "purchaseCost", book_value::float AS "bookValue"
           FROM assets WHERE deleted_at IS NULL ORDER BY asset_no`,
        )
        res.json({ name, rows })
        return
      }
      if (name === "warranty") {
        const rows = await db.query(
          `SELECT asset_no AS "assetNo", name, warranty_end AS "warrantyEnd"
           FROM assets WHERE deleted_at IS NULL AND warranty_end IS NOT NULL
           ORDER BY warranty_end`,
        )
        res.json({ name, rows })
        return
      }
      if (name === "depreciation") {
        const rows = await db.query(
          `SELECT asset_no AS "assetNo", name, purchase_cost::float AS "purchaseCost",
                  book_value::float AS "bookValue", useful_life_months AS "usefulLifeMonths", depreciation_method AS "depreciationMethod"
           FROM assets WHERE deleted_at IS NULL ORDER BY asset_no`,
        )
        res.json({ name, rows })
        return
      }
      if (name === "maintenance-costs") {
        const rows = await db.query(
          `SELECT a.asset_no AS "assetNo", a.name, SUM(COALESCE(wo.actual_cost, wo.estimated_cost, 0))::float AS cost
           FROM assets a LEFT JOIN work_orders wo ON wo.asset_id = a.id AND wo.deleted_at IS NULL
           WHERE a.deleted_at IS NULL GROUP BY a.id ORDER BY cost DESC`,
        )
        res.json({ name, rows })
        return
      }
      if (name === "overdue") {
        const rows = await db.query(
          `SELECT work_order_no AS "workOrderNo", status, scheduled_at AS "scheduledAt", priority
           FROM work_orders WHERE deleted_at IS NULL AND status NOT IN ('completed','closed') AND scheduled_at < NOW()
           ORDER BY scheduled_at`,
        )
        res.json({ name, rows })
        return
      }
      if (name === "assignments") {
        const rows = await db.query(
          `SELECT asg.assignment_no AS "assignmentNo", a.asset_no AS "assetNo", e.name AS employee,
                  asg.assigned_at AS "assignedAt", asg.active
           FROM assignments asg JOIN assets a ON a.id = asg.asset_id
           LEFT JOIN employees e ON e.id = asg.employee_id ORDER BY asg.assigned_at DESC`,
        )
        res.json({ name, rows })
        return
      }
      if (name === "retired") {
        const rows = await db.query(
          `SELECT asset_no AS "assetNo", name, status, updated_at AS "updatedAt"
           FROM assets WHERE deleted_at IS NULL AND status = 'retired' ORDER BY updated_at DESC`,
        )
        res.json({ name, rows })
        return
      }
      res.status(404).json({ message: "Unknown report" })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/assets/notifications", async (req, res, next) => {
    try {
      if (!(await requireUser(db, req, res))) return
      const rows = await db.query(
        `SELECT id, 'Warranty / maintenance' AS title, details AS body, created_at AS "createdAt"
         FROM activity_logs ORDER BY created_at DESC LIMIT 5`,
      )
      res.json(rows)
    } catch (error) {
      next(error)
    }
  })

  registerAssetsCrud(app, db)
}
