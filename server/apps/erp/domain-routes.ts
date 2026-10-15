import { randomUUID } from "node:crypto"
import type { Express, Response } from "express"
import { z } from "zod"
import type { AppDatabase } from "../../shared/db"
import {
  DEFAULT_ORG,
  assertBalanced,
  audit,
  correlationId,
  journalTotals,
  notify,
  parsePaging,
  requirePerm,
  requireUser,
  sodAllowsPost,
} from "./api-helpers"
import { registerErpCrud } from "./crud-routes"
import { registerWorkflowRoutes } from "./workflow-routes"
import { ROLE_PERMISSIONS, can } from "./rbac"

function okList(res: Response, rows: unknown[], total: number, page: number, pageSize: number) {
  res.json({ data: rows, total, page, pageSize })
}

export function registerErpApi(app: Express, db: AppDatabase) {
  app.get("/api/erp/v1/openapi.json", (_req, res) => {
    res.json({
      openapi: "3.0.3",
      info: {
        title: "QSpiders ERP Practice API",
        version: "1.0.0",
        description:
          "Practice ERP API. Tax and statutory payroll rules are demo-configurable only — not claimed as jurisdiction-compliant.",
      },
      servers: [{ url: "/api/erp" }],
      paths: {
        "/v1/dashboard": { get: { summary: "Role KPI dashboard" } },
        "/v1/journals": { get: { summary: "List journals" }, post: { summary: "Create draft journal" } },
        "/v1/journals/{id}/post": { post: { summary: "Post balanced journal" } },
        "/v1/approvals": { get: { summary: "List approvals" } },
        "/v1/reports/{name}": { get: { summary: "Downloadable reports from persisted data" } },
        "/v1/workflows/procure-to-pay": { get: { summary: "P2P chain status" } },
      },
    })
  })

  app.get("/api/erp/dashboard", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "dashboard", "view")
      if (!user) return
      const [
        revenue,
        expenses,
        bank,
        arOpen,
        apOpen,
        employees,
        pendingLeaves,
        openPos,
        lowStock,
        pendingApprovals,
        openOrders,
        pendingGrn,
      ] = await Promise.all([
        db.query<{ n: number }>(
          `SELECT COALESCE(SUM(credit - debit),0)::float AS n FROM journal_lines jl
           JOIN journals j ON j.id = jl.journal_id
           JOIN chart_of_accounts a ON a.id = jl.account_id
           WHERE j.status = 'posted' AND a.account_type = 'income'`,
        ),
        db.query<{ n: number }>(
          `SELECT COALESCE(SUM(debit - credit),0)::float AS n FROM journal_lines jl
           JOIN journals j ON j.id = jl.journal_id
           JOIN chart_of_accounts a ON a.id = jl.account_id
           WHERE j.status = 'posted' AND a.account_type = 'expense'`,
        ),
        db.query<{ n: number }>("SELECT COALESCE(SUM(balance),0)::float AS n FROM bank_accounts"),
        db.query<{ n: number; aging: number }>(
          `SELECT COALESCE(SUM(balance),0)::float AS n,
                  COALESCE(SUM(balance) FILTER (WHERE due_date < CURRENT_DATE),0)::float AS aging
           FROM customer_invoices WHERE status IN ('open','partial')`,
        ),
        db.query<{ n: number; aging: number }>(
          `SELECT COALESCE(SUM(amount + tax_amount),0)::float AS n,
                  COALESCE(SUM(amount + tax_amount) FILTER (WHERE due_date < CURRENT_DATE),0)::float AS aging
           FROM vendor_invoices WHERE status IN ('open','approved','pending_approval')`,
        ),
        db.query<{ n: number; joiners: number; exits: number }>(
          `SELECT COUNT(*)::int AS n,
                  COUNT(*) FILTER (WHERE joining_date >= CURRENT_DATE - 30)::int AS joiners,
                  COUNT(*) FILTER (WHERE status = 'exited')::int AS exits
           FROM employees WHERE deleted_at IS NULL`,
        ),
        db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM leave_requests WHERE status = 'pending_approval'"),
        db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM purchase_orders WHERE status IN ('approved','pending_approval')"),
        db.query<{ n: number }>(`
          SELECT COUNT(*)::int AS n FROM (
            SELECT i.id FROM items i
            LEFT JOIN stock_balances b ON b.item_id = i.id
            WHERE i.deleted_at IS NULL
            GROUP BY i.id, i.reorder_level
            HAVING COALESCE(SUM(b.qty),0) <= i.reorder_level
          ) t`),
        db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM approvals WHERE status = 'pending'"),
        db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM sales_orders WHERE status IN ('approved','pending_approval','draft')"),
        db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM purchase_orders WHERE status = 'approved'"),
      ])

      const budget = await db.query<{ budget: number; actual: number }>(`
        SELECT COALESCE(SUM(b.amount),0)::float AS budget,
               COALESCE((
                 SELECT SUM(jl.debit - jl.credit) FROM journal_lines jl
                 JOIN journals j ON j.id = jl.journal_id
                 WHERE j.status = 'posted' AND jl.account_id = b.account_id
               ),0)::float AS actual
        FROM budgets b
        GROUP BY b.account_id LIMIT 5`)

      res.json({
        role: user.role,
        finance: {
          revenue: Number(revenue[0]?.n ?? 0),
          expenses: Number(expenses[0]?.n ?? 0),
          cashBank: Number(bank[0]?.n ?? 0),
          arBalance: Number(arOpen[0]?.n ?? 0),
          arAging: Number(arOpen[0]?.aging ?? 0),
          apBalance: Number(apOpen[0]?.n ?? 0),
          apAging: Number(apOpen[0]?.aging ?? 0),
          pendingApprovals: Number(pendingApprovals[0]?.n ?? 0),
          budgetVsActual: budget,
        },
        hr: {
          totalEmployees: Number(employees[0]?.n ?? 0),
          newJoiners: Number(employees[0]?.joiners ?? 0),
          exits: Number(employees[0]?.exits ?? 0),
          pendingLeaves: Number(pendingLeaves[0]?.n ?? 0),
        },
        operations: {
          openPurchaseOrders: Number(openPos[0]?.n ?? 0),
          pendingGoodsReceipts: Number(pendingGrn[0]?.n ?? 0),
          lowStock: Number(lowStock[0]?.n ?? 0),
          openSalesOrders: Number(openOrders[0]?.n ?? 0),
        },
      })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/permissions/me", async (req, res, next) => {
    try {
      const user = await requireUser(db, req, res)
      if (!user) return
      res.json({ role: user.role, permissions: ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] ?? {} })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/organizations", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "organizations", "view"))) return
      const rows = await db.query(
        `SELECT o.id, o.code, o.name, o.currency_code AS "currencyCode", o.fiscal_year_start_month AS "fiscalYearStartMonth",
                le.name AS "legalEntity"
         FROM organizations o
         LEFT JOIN legal_entities le ON le.organization_id = o.id
         WHERE o.deleted_at IS NULL`,
      )
      res.json(rows)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/employees", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "employees", "view")
      if (!user) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const params: unknown[] = []
      let where = "e.deleted_at IS NULL"
      if (user.role === "employee") {
        where += " AND e.username = ?"
        params.push(user.username)
      }
      if (q) {
        where += " AND (LOWER(e.first_name) LIKE ? OR LOWER(e.last_name) LIKE ? OR LOWER(e.employee_no) LIKE ? OR LOWER(e.email) LIKE ?)"
        const like = `%${q}%`
        params.push(like, like, like, like)
      }
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM employees e WHERE ${where}`, params)
      const rows = await db.query(
        `SELECT e.id, e.employee_no AS "employeeNo", e.first_name AS "firstName", e.last_name AS "lastName",
                e.email, e.phone, e.status, e.joining_date AS "joiningDate", e.location,
                e.department_id AS "departmentId", e.position_id AS "positionId",
                d.name AS department, p.title AS designation, e.manager_id AS "managerId"
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN positions p ON p.id = e.position_id
         WHERE ${where}
         ORDER BY e.employee_no
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/employees/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "employees", "view")
      if (!user) return
      const id = String(req.params.id)
      const emp = await db.query(
        `SELECT e.*, d.name AS department, p.title AS designation
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN positions p ON p.id = e.position_id
         WHERE e.id = ? AND e.deleted_at IS NULL`,
        [id],
      )
      if (!emp[0]) {
        res.status(404).json({ message: "Employee not found" })
        return
      }
      if (user.role === "employee" && emp[0].username !== user.username) {
        res.status(403).json({ message: "Employees may only view their own profile" })
        return
      }
      const history = await db.query("SELECT * FROM employment_history WHERE employee_id = ? ORDER BY effective_on DESC", [id])
      const docs = await db.query("SELECT * FROM employee_documents WHERE employee_id = ?", [id])
      let salary = null
      if (can(user.role, "salary", "view")) {
        salary = await db.query(
          `SELECT es.gross, ss.name AS structure, es.effective_from AS "effectiveFrom"
           FROM employee_salaries es JOIN salary_structures ss ON ss.id = es.structure_id
           WHERE es.employee_id = ? ORDER BY es.effective_from DESC LIMIT 1`,
          [id],
        )
      }
      res.json({ employee: emp[0], history, documents: docs, salary: salary?.[0] ?? null })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/departments", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "departments", "view"))) return
      res.json(
        await db.query(
          `SELECT d.id, d.code, d.name, d.parent_id AS "parentId", cc.name AS "costCenter"
           FROM departments d LEFT JOIN cost_centers cc ON cc.department_id = d.id
           WHERE d.deleted_at IS NULL ORDER BY d.code`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/attendance", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "attendance", "view")
      if (!user) return
      const { page, pageSize, offset } = parsePaging(req)
      let where = "1=1"
      const params: unknown[] = []
      if (user.role === "employee") {
        where = "e.username = ?"
        params.push(user.username)
      }
      const total = await db.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM attendance a JOIN employees e ON e.id = a.employee_id WHERE ${where}`,
        params,
      )
      const rows = await db.query(
        `SELECT a.id, e.employee_no AS "employeeNo", e.first_name || ' ' || e.last_name AS "employeeName",
                a.work_date AS "workDate", a.check_in AS "checkIn", a.check_out AS "checkOut", a.status
         FROM attendance a JOIN employees e ON e.id = a.employee_id
         WHERE ${where}
         ORDER BY a.work_date DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/leaves", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "leaves", "view")
      if (!user) return
      const { page, pageSize, offset } = parsePaging(req)
      let where = "1=1"
      const params: unknown[] = []
      if (user.role === "employee") {
        where = "e.username = ?"
        params.push(user.username)
      }
      const total = await db.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM leave_requests lr JOIN employees e ON e.id = lr.employee_id WHERE ${where}`,
        params,
      )
      const rows = await db.query(
        `SELECT lr.id, e.employee_no AS "employeeNo", e.first_name || ' ' || e.last_name AS "employeeName",
                lr.leave_type_id AS "leaveTypeId", lt.name AS "leaveType",
                lr.start_date AS "startDate", lr.end_date AS "endDate",
                lr.days, lr.status, lr.reason
         FROM leave_requests lr
         JOIN employees e ON e.id = lr.employee_id
         JOIN leave_types lt ON lt.id = lr.leave_type_id
         WHERE ${where}
         ORDER BY lr.created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/leaves", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "leaves", "create")
      if (!user) return
      const body = z
        .object({
          leaveTypeId: z.string(),
          startDate: z.string(),
          endDate: z.string(),
          reason: z.string().optional(),
        })
        .parse(req.body)
      const emp = await db.query<{ id: string }>("SELECT id FROM employees WHERE username = ?", [user.username])
      if (!emp[0]) {
        res.status(400).json({ message: "No employee linked to this user" })
        return
      }
      const id = randomUUID()
      await db
        .prepare(
          `INSERT INTO leave_requests (id, organization_id, employee_id, leave_type_id, start_date, end_date, days, status, reason, created_by)
           VALUES (?, ?, ?, ?, ?, ?, 1, 'pending_approval', ?, ?)`,
        )
        .run(id, DEFAULT_ORG, emp[0].id, body.leaveTypeId, body.startDate, body.endDate, body.reason ?? null, user.username)
      await notify(db, "deptmgr", "Leave approval", "A leave request needs review", "leaves")
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "submit",
        entityType: "leave_request",
        entityId: id,
        correlationId: correlationId(req),
      })
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/payroll", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "payroll", "view"))) return
      const runs = await db.query(
        `SELECT id, period_label AS "periodLabel", start_date AS "startDate", end_date AS "endDate", status, approved_by AS "approvedBy"
         FROM payroll_runs ORDER BY start_date DESC`,
      )
      res.json(runs)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/payroll/:id/payslips", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "payroll", "view")
      if (!user) return
      let sql = `SELECT p.id, e.employee_no AS "employeeNo", e.first_name || ' ' || e.last_name AS "employeeName",
                        p.gross, p.deductions, p.net
                 FROM payslips p JOIN employees e ON e.id = p.employee_id
                 WHERE p.payroll_run_id = ?`
      const params: unknown[] = [String(req.params.id)]
      if (user.role === "employee") {
        sql += " AND e.username = ?"
        params.push(user.username)
      }
      res.json(await db.query(sql, params))
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/accounts", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "accounts", "view"))) return
      res.json(
        await db.query(
          `SELECT id, code, name, account_type AS "accountType", is_postable AS "isPostable"
           FROM chart_of_accounts ORDER BY code`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/periods", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "accounts", "view"))) return
      res.json(
        await db.query(
          `SELECT id, name, start_date AS "startDate", end_date AS "endDate", status, closed_by AS "closedBy"
           FROM accounting_periods ORDER BY start_date`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/journals", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "journals", "view"))) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const status = String(req.query.status ?? "")
      const params: unknown[] = []
      let where = "1=1"
      if (status) {
        where += " AND j.status = ?"
        params.push(status)
      }
      if (q) {
        where += " AND (LOWER(j.journal_no) LIKE ? OR LOWER(COALESCE(j.memo,'')) LIKE ?)"
        params.push(`%${q}%`, `%${q}%`)
      }
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM journals j WHERE ${where}`, params)
      const rows = await db.query(
        `SELECT j.id, j.journal_no AS "journalNo", j.journal_date AS "journalDate", j.source, j.status, j.memo,
                j.created_by AS "createdBy", j.posted_by AS "postedBy", j.version,
                COALESCE(SUM(jl.debit),0)::float AS debit, COALESCE(SUM(jl.credit),0)::float AS credit
         FROM journals j
         LEFT JOIN journal_lines jl ON jl.journal_id = j.id
         WHERE ${where}
         GROUP BY j.id
         ORDER BY j.journal_date DESC, j.journal_no DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/journals/:id", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "journals", "view"))) return
      const id = String(req.params.id)
      const journal = await db.query(`SELECT * FROM journals WHERE id = ?`, [id])
      if (!journal[0]) {
        res.status(404).json({ message: "Journal not found" })
        return
      }
      const lines = await db.query(
        `SELECT jl.id, a.code AS "accountCode", a.name AS "accountName", jl.debit::float AS debit, jl.credit::float AS credit, jl.memo
         FROM journal_lines jl JOIN chart_of_accounts a ON a.id = jl.account_id
         WHERE jl.journal_id = ? ORDER BY jl.debit DESC`,
        [id],
      )
      const totals = await journalTotals(db, id)
      res.json({ journal: journal[0], lines, totals })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/journals", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "journals", "create")
      if (!user) return
      const body = z
        .object({
          journalDate: z.string(),
          memo: z.string().optional(),
          lines: z
            .array(
              z.object({
                accountId: z.string(),
                debit: z.number().min(0),
                credit: z.number().min(0),
                costCenterId: z.string().optional(),
                memo: z.string().optional(),
              }),
            )
            .min(2),
        })
        .parse(req.body)
      const debit = body.lines.reduce((s, l) => s + l.debit, 0)
      const credit = body.lines.reduce((s, l) => s + l.credit, 0)
      if (Math.abs(debit - credit) > 0.001) {
        res.status(400).json({ message: "Debits must equal credits", debit, credit })
        return
      }
      const id = randomUUID()
      const no = `JNL-${Date.now().toString().slice(-6)}`
      await db
        .prepare(
          `INSERT INTO journals (id, organization_id, journal_no, period_id, journal_date, source, status, memo, created_by)
           VALUES (?, ?, ?, 'per-7', ?, 'manual', 'draft', ?, ?)`,
        )
        .run(id, DEFAULT_ORG, no, body.journalDate, body.memo ?? null, user.username)
      for (const line of body.lines) {
        await db
          .prepare(
            `INSERT INTO journal_lines (id, journal_id, account_id, cost_center_id, debit, credit, memo)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(randomUUID(), id, line.accountId, line.costCenterId ?? null, line.debit, line.credit, line.memo ?? null)
      }
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "create",
        entityType: "journal",
        entityId: id,
        correlationId: correlationId(req),
      })
      res.status(201).json({ id, journalNo: no })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/journals/:id/post", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "journals", "approve")
      if (!user) return
      const id = String(req.params.id)
      const journal = await db.query<{ id: string; status: string; created_by: string; version: number }>(
        "SELECT id, status, created_by, version FROM journals WHERE id = ?",
        [id],
      )
      if (!journal[0]) {
        res.status(404).json({ message: "Journal not found" })
        return
      }
      if (journal[0].status === "posted") {
        res.status(409).json({ message: "Journal already posted; use a reversal to correct" })
        return
      }
      if (!sodAllowsPost(journal[0].created_by, user.username, user.role)) {
        res.status(403).json({ message: "Segregation of duties: creator cannot post this journal" })
        return
      }
      const balanced = await assertBalanced(db, id)
      if (!balanced.ok) {
        res.status(400).json({ message: balanced.message, totals: balanced.totals })
        return
      }
      const expectedVersion = Number(req.body?.version ?? journal[0].version)
      const updated = await db.query(
        `UPDATE journals SET status = 'posted', posted_at = NOW(), posted_by = ?, version = version + 1, updated_by = ?, updated_at = NOW()
         WHERE id = ? AND version = ? AND status <> 'posted' RETURNING id`,
        [user.username, user.username, id, expectedVersion],
      )
      if (!updated[0]) {
        res.status(409).json({ message: "Concurrent update; reload and retry" })
        return
      }
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "post",
        entityType: "journal",
        entityId: id,
        details: JSON.stringify(balanced.totals),
        correlationId: correlationId(req),
      })
      res.json({ ok: true, totals: balanced.totals })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/journals/:id/reverse", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "journals", "approve")
      if (!user) return
      const id = String(req.params.id)
      const journal = await db.query<{ status: string; journal_date: string; memo: string }>(
        "SELECT status, journal_date::text AS journal_date, memo FROM journals WHERE id = ?",
        [id],
      )
      if (!journal[0] || journal[0].status !== "posted") {
        res.status(400).json({ message: "Only posted journals can be reversed" })
        return
      }
      const lines = await db.query<{ account_id: string; debit: number; credit: number; cost_center_id: string | null }>(
        "SELECT account_id, debit::float AS debit, credit::float AS credit, cost_center_id FROM journal_lines WHERE journal_id = ?",
        [id],
      )
      const revId = randomUUID()
      const no = `JNL-R${Date.now().toString().slice(-5)}`
      await db
        .prepare(
          `INSERT INTO journals (id, organization_id, journal_no, period_id, journal_date, source, source_ref, status, memo, posted_at, posted_by, created_by)
           VALUES (?, ?, ?, 'per-7', CURRENT_DATE, 'reversal', ?, 'posted', ?, NOW(), ?, ?)`,
        )
        .run(revId, DEFAULT_ORG, no, id, `Reversal of ${journal[0].memo ?? id}`, user.username, user.username)
      for (const line of lines) {
        await db
          .prepare(
            `INSERT INTO journal_lines (id, journal_id, account_id, cost_center_id, debit, credit, memo)
             VALUES (?, ?, ?, ?, ?, ?, 'Reversal')`,
          )
          .run(randomUUID(), revId, line.account_id, line.cost_center_id, line.credit, line.debit)
      }
      await db.prepare("UPDATE journals SET reversed_by_journal_id = ? WHERE id = ?").run(revId, id)
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "reverse",
        entityType: "journal",
        entityId: id,
        details: revId,
        correlationId: correlationId(req),
      })
      res.status(201).json({ id: revId, journalNo: no })
    } catch (error) {
      next(error)
    }
  })

  // Masters & ops lists
  for (const [path, moduleId, sql] of [
    [
      "vendors",
      "vendors",
      `SELECT id, code, name, email, phone, city, status, on_time_rate::float AS "onTimeRate" FROM vendors WHERE deleted_at IS NULL ORDER BY code`,
    ],
    [
      "customers",
      "customers",
      `SELECT id, code, name, email, phone, city, status FROM customers WHERE deleted_at IS NULL ORDER BY code`,
    ],
    [
      "items",
      "items",
      `SELECT i.id, i.sku, i.name, i.category_id AS "categoryId", c.name AS category,
              i.uom_id AS "uomId", u.code AS uom, i.unit_cost::float AS "unitCost",
              i.unit_price::float AS "unitPrice", i.reorder_level AS "reorderLevel",
              COALESCE(SUM(b.qty),0)::float AS "onHand"
       FROM items i
       LEFT JOIN item_categories c ON c.id = i.category_id
       LEFT JOIN uoms u ON u.id = i.uom_id
       LEFT JOIN stock_balances b ON b.item_id = i.id
       WHERE i.deleted_at IS NULL
       GROUP BY i.id, c.name, u.code ORDER BY i.sku`,
    ],
    [
      "warehouses",
      "warehouses",
      `SELECT id, code, name, city FROM warehouses WHERE deleted_at IS NULL ORDER BY code`,
    ],
    [
      "cost-centers",
      "budgets",
      `SELECT id, code, name, department_id AS "departmentId" FROM cost_centers ORDER BY code`,
    ],
    [
      "tax-codes",
      "accounts",
      `SELECT id, code, name, rate::float AS rate, jurisdiction FROM tax_codes ORDER BY code`,
    ],
    [
      "bank-accounts",
      "banking",
      `SELECT id, code, name, account_no AS "accountNo", bank_name AS "bankName", balance::float AS balance FROM bank_accounts ORDER BY code`,
    ],
    [
      "assets",
      "assets",
      `SELECT id, asset_no AS "assetNo", name, category, acquisition_date AS "acquisitionDate",
              acquisition_cost::float AS "acquisitionCost", status, assigned_to AS "assignedTo", location
       FROM fixed_assets ORDER BY asset_no`,
    ],
    [
      "recruitment",
      "recruitment",
      `SELECT id, title, department_id AS "departmentId", status, openings, created_at AS "createdAt" FROM job_requisitions ORDER BY created_at DESC`,
    ],
  ] as const) {
    app.get(`/api/erp/${path}`, async (req, res, next) => {
      try {
        if (!(await requirePerm(db, req, res, moduleId, "view"))) return
        const { page, pageSize, offset, q } = parsePaging(req)
        const all = await db.query(sql)
        const filtered = q
          ? all.filter((row) => JSON.stringify(row).toLowerCase().includes(q))
          : all
        okList(res, filtered.slice(offset, offset + pageSize), filtered.length, page, pageSize)
      } catch (error) {
        next(error)
      }
    })
  }

  app.get("/api/erp/purchase-orders", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "procurement", "view"))) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const params: unknown[] = []
      let where = "1=1"
      if (q) {
        where += " AND (LOWER(po.po_no) LIKE ? OR LOWER(v.name) LIKE ?)"
        params.push(`%${q}%`, `%${q}%`)
      }
      const total = await db.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id WHERE ${where}`,
        params,
      )
      const rows = await db.query(
        `SELECT po.id, po.po_no AS "poNo", po.vendor_id AS "vendorId", v.name AS vendor,
                po.warehouse_id AS "warehouseId", po.status, po.order_date AS "orderDate",
                po.expected_on AS "expectedOn", po.total_amount::float AS "totalAmount", po.requisition_id AS "requisitionId",
                (SELECT pl.item_id FROM po_lines pl WHERE pl.purchase_order_id = po.id LIMIT 1) AS "itemId",
                (SELECT pl.qty::float FROM po_lines pl WHERE pl.purchase_order_id = po.id LIMIT 1) AS qty,
                (SELECT pl.unit_cost::float FROM po_lines pl WHERE pl.purchase_order_id = po.id LIMIT 1) AS "unitCost"
         FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id
         WHERE ${where}
         ORDER BY po.order_date DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/purchase-requisitions", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "procurement", "view"))) return
      res.json(
        await db.query(
          `SELECT pr.id, pr.req_no AS "reqNo", d.name AS department, pr.status, pr.needed_by AS "neededBy", pr.notes
           FROM purchase_requisitions pr LEFT JOIN departments d ON d.id = pr.department_id
           ORDER BY pr.created_at DESC`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/goods-receipts", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "inventory", "view"))) return
      res.json(
        await db.query(
          `SELECT g.id, g.grn_no AS "grnNo", g.purchase_order_id AS "purchaseOrderId", w.name AS warehouse,
                  g.received_on AS "receivedOn", g.status
           FROM goods_receipts g JOIN warehouses w ON w.id = g.warehouse_id
           ORDER BY g.received_on DESC`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/sales-orders", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "sales", "view"))) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const params: unknown[] = []
      let where = "1=1"
      if (q) {
        where += " AND (LOWER(so.so_no) LIKE ? OR LOWER(c.name) LIKE ?)"
        params.push(`%${q}%`, `%${q}%`)
      }
      const total = await db.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM sales_orders so JOIN customers c ON c.id = so.customer_id WHERE ${where}`,
        params,
      )
      const rows = await db.query(
        `SELECT so.id, so.so_no AS "soNo", so.customer_id AS "customerId", c.name AS customer,
                so.warehouse_id AS "warehouseId", so.status, so.order_date AS "orderDate",
                so.total_amount::float AS "totalAmount",
                (SELECT sl.item_id FROM so_lines sl WHERE sl.sales_order_id = so.id LIMIT 1) AS "itemId",
                (SELECT sl.qty::float FROM so_lines sl WHERE sl.sales_order_id = so.id LIMIT 1) AS qty,
                (SELECT sl.unit_price::float FROM so_lines sl WHERE sl.sales_order_id = so.id LIMIT 1) AS "unitPrice"
         FROM sales_orders so JOIN customers c ON c.id = so.customer_id
         WHERE ${where}
         ORDER BY so.order_date DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/vendor-invoices", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "ap", "view"))) return
      const { page, pageSize, offset } = parsePaging(req)
      const total = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM vendor_invoices")
      const rows = await db.query(
        `SELECT vi.id, vi.invoice_no AS "invoiceNo", v.name AS vendor, vi.invoice_date AS "invoiceDate",
                vi.due_date AS "dueDate", (vi.amount + vi.tax_amount)::float AS total, vi.status, vi.match_status AS "matchStatus"
         FROM vendor_invoices vi JOIN vendors v ON v.id = vi.vendor_id
         ORDER BY vi.invoice_date DESC LIMIT ? OFFSET ?`,
        [pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/customer-invoices", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "ar", "view"))) return
      const { page, pageSize, offset } = parsePaging(req)
      const total = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM customer_invoices")
      const rows = await db.query(
        `SELECT ci.id, ci.invoice_no AS "invoiceNo", c.name AS customer, ci.invoice_date AS "invoiceDate",
                ci.due_date AS "dueDate", ci.amount::float AS amount, ci.balance::float AS balance, ci.status
         FROM customer_invoices ci JOIN customers c ON c.id = ci.customer_id
         ORDER BY ci.invoice_date DESC LIMIT ? OFFSET ?`,
        [pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/expenses", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "expenses", "view")
      if (!user) return
      let where = "1=1"
      const params: unknown[] = []
      if (user.role === "employee") {
        where = "e.username = ?"
        params.push(user.username)
      }
      const rows = await db.query(
        `SELECT ec.id, ec.claim_no AS "claimNo", e.first_name || ' ' || e.last_name AS "employeeName",
                ec.amount::float AS amount, ec.status, ec.submitted_at AS "submittedAt",
                ec.cost_center_id AS "costCenterId", ec.notes,
                (SELECT el.category FROM expense_lines el WHERE el.claim_id = ec.id LIMIT 1) AS category,
                (SELECT el.expense_date FROM expense_lines el WHERE el.claim_id = ec.id LIMIT 1) AS "expenseDate",
                (SELECT el.receipt_name FROM expense_lines el WHERE el.claim_id = ec.id LIMIT 1) AS "receiptName"
         FROM expense_claims ec JOIN employees e ON e.id = ec.employee_id
         WHERE ${where}
         ORDER BY ec.created_at DESC`,
        params,
      )
      res.json(rows)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/budgets", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "budgets", "view"))) return
      res.json(
        await db.query(
          `SELECT b.id, b.department_id AS "departmentId", d.name AS department,
                  b.account_id AS "accountId", a.code AS "accountCode", a.name AS "accountName",
                  b.cost_center_id AS "costCenterId",
                  b.fiscal_year AS "fiscalYear", b.amount::float AS budget,
                  COALESCE((
                    SELECT SUM(jl.debit - jl.credit) FROM journal_lines jl
                    JOIN journals j ON j.id = jl.journal_id
                    WHERE j.status = 'posted' AND jl.account_id = b.account_id
                  ),0)::float AS actual
           FROM budgets b
           LEFT JOIN departments d ON d.id = b.department_id
           LEFT JOIN chart_of_accounts a ON a.id = b.account_id
           ORDER BY d.name`,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/inventory/ledger", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "inventory", "view"))) return
      const { page, pageSize, offset } = parsePaging(req)
      const total = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM stock_ledger")
      const rows = await db.query(
        `SELECT l.id, i.sku, i.name AS item, w.name AS warehouse, l.direction, l.qty::float AS qty,
                l.unit_cost::float AS "unitCost", l.ref_type AS "refType", l.occurred_on AS "occurredOn"
         FROM stock_ledger l
         JOIN items i ON i.id = l.item_id
         JOIN warehouses w ON w.id = l.warehouse_id
         ORDER BY l.occurred_on DESC, l.created_at DESC
         LIMIT ? OFFSET ?`,
        [pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/approvals", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "approvals", "view")
      if (!user) return
      const rows = await db.query(
        `SELECT a.id, a.entity_type AS "entityType", a.entity_id AS "entityId", a.status, a.current_step AS "currentStep",
                a.amount::float AS amount, a.requested_by AS "requestedBy",
                s.approver_role AS "approverRole", s.status AS "stepStatus"
         FROM approvals a
         LEFT JOIN approval_steps s ON s.approval_id = a.id AND s.step_no = a.current_step
         WHERE a.status = 'pending'
         ORDER BY a.created_at`,
      )
      const visible =
        user.role === "sysadmin" || user.role === "auditor"
          ? rows
          : rows.filter((row) => row.approverRole === user.role || can(user.role, "approvals", "approve"))
      res.json(visible)
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/approvals/:id/decide", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "approvals", "approve")
      if (!user) return
      const body = z.object({ decision: z.enum(["approved", "rejected"]), comment: z.string().optional() }).parse(req.body)
      const id = String(req.params.id)
      const approval = await db.query<{ id: string; status: string; current_step: number; entity_type: string; entity_id: string }>(
        "SELECT id, status, current_step, entity_type, entity_id FROM approvals WHERE id = ?",
        [id],
      )
      if (!approval[0] || approval[0].status !== "pending") {
        res.status(400).json({ message: "Approval is not pending" })
        return
      }
      const step = await db.query<{ id: string; approver_role: string; status: string }>(
        "SELECT id, approver_role, status FROM approval_steps WHERE approval_id = ? AND step_no = ?",
        [id, approval[0].current_step],
      )
      if (!step[0] || (step[0].approver_role !== user.role && user.role !== "sysadmin")) {
        res.status(403).json({ message: "Not the assigned approver for this step" })
        return
      }
      await db
        .prepare("UPDATE approval_steps SET status = ?, decided_at = NOW(), approver_user = ?, comment = ? WHERE id = ?")
        .run(body.decision, user.username, body.comment ?? null, step[0].id)
      const nextStatus = body.decision === "rejected" ? "rejected" : "approved"
      await db.prepare("UPDATE approvals SET status = ?, updated_at = NOW() WHERE id = ?").run(nextStatus, id)
      await notify(db, approval[0].entity_id.startsWith("entity") ? "employee" : "employee", `Approval ${nextStatus}`, body.comment ?? nextStatus, "approvals")
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: body.decision,
        entityType: "approval",
        entityId: id,
        details: body.comment,
        correlationId: correlationId(req),
      })
      res.json({ ok: true, status: nextStatus })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/notifications", async (req, res, next) => {
    try {
      const user = await requireUser(db, req, res)
      if (!user) return
      res.json(
        await db.query(
          `SELECT id, title, body, link_path AS "linkPath", read_at AS "readAt", created_at AS "createdAt"
           FROM notifications WHERE username = ? ORDER BY created_at DESC LIMIT 50`,
          [user.username],
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/audit-logs", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "audit", "view"))) return
      const { page, pageSize, offset } = parsePaging(req)
      const total = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM audit_logs")
      const rows = await db.query(
        `SELECT id, actor, action, entity_type AS "entityType", entity_id AS "entityId", details, correlation_id AS "correlationId", created_at AS "createdAt"
         FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/reports/:name", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "reports", "view"))) return
      const name = String(req.params.name)
      if (name === "trial-balance") {
        const rows = await db.query(
          `SELECT a.code, a.name, a.account_type AS "accountType",
                  COALESCE(SUM(jl.debit),0)::float AS debit,
                  COALESCE(SUM(jl.credit),0)::float AS credit
           FROM chart_of_accounts a
           LEFT JOIN journal_lines jl ON jl.account_id = a.id
           LEFT JOIN journals j ON j.id = jl.journal_id AND j.status = 'posted'
           GROUP BY a.id ORDER BY a.code`,
        )
        res.json({ name, rows })
        return
      }
      if (name === "profit-and-loss") {
        const rows = await db.query(
          `SELECT a.code, a.name, a.account_type AS "accountType",
                  COALESCE(SUM(jl.debit - jl.credit),0)::float AS amount
           FROM chart_of_accounts a
           LEFT JOIN journal_lines jl ON jl.account_id = a.id
           LEFT JOIN journals j ON j.id = jl.journal_id AND j.status = 'posted'
           WHERE a.account_type IN ('income','expense')
           GROUP BY a.id ORDER BY a.code`,
        )
        res.json({ name, rows })
        return
      }
      if (name === "balance-sheet") {
        const rows = await db.query(
          `SELECT a.code, a.name, a.account_type AS "accountType",
                  COALESCE(SUM(jl.debit - jl.credit),0)::float AS amount
           FROM chart_of_accounts a
           LEFT JOIN journal_lines jl ON jl.account_id = a.id
           LEFT JOIN journals j ON j.id = jl.journal_id AND j.status = 'posted'
           WHERE a.account_type IN ('asset','liability','equity')
           GROUP BY a.id ORDER BY a.code`,
        )
        res.json({ name, rows })
        return
      }
      if (name === "ar-aging") {
        res.json({
          name,
          rows: await db.query(
            `SELECT c.name AS customer, ci.invoice_no AS "invoiceNo", ci.due_date AS "dueDate", ci.balance::float AS balance,
                    CASE
                      WHEN ci.due_date >= CURRENT_DATE THEN 'current'
                      WHEN ci.due_date >= CURRENT_DATE - 30 THEN '1-30'
                      WHEN ci.due_date >= CURRENT_DATE - 60 THEN '31-60'
                      ELSE '60+'
                    END AS bucket
             FROM customer_invoices ci JOIN customers c ON c.id = ci.customer_id
             WHERE ci.status IN ('open','partial') ORDER BY ci.due_date`,
          ),
        })
        return
      }
      if (name === "ap-aging") {
        res.json({
          name,
          rows: await db.query(
            `SELECT v.name AS vendor, vi.invoice_no AS "invoiceNo", vi.due_date AS "dueDate",
                    (vi.amount + vi.tax_amount)::float AS balance,
                    CASE
                      WHEN vi.due_date >= CURRENT_DATE THEN 'current'
                      WHEN vi.due_date >= CURRENT_DATE - 30 THEN '1-30'
                      WHEN vi.due_date >= CURRENT_DATE - 60 THEN '31-60'
                      ELSE '60+'
                    END AS bucket
             FROM vendor_invoices vi JOIN vendors v ON v.id = vi.vendor_id
             WHERE vi.status IN ('open','approved','pending_approval') ORDER BY vi.due_date`,
          ),
        })
        return
      }
      if (name === "inventory-valuation") {
        res.json({
          name,
          rows: await db.query(
            `SELECT i.sku, i.name, w.name AS warehouse, b.qty::float AS qty, i.unit_cost::float AS "unitCost",
                    (b.qty * i.unit_cost)::float AS value
             FROM stock_balances b
             JOIN items i ON i.id = b.item_id
             JOIN warehouses w ON w.id = b.warehouse_id
             WHERE i.deleted_at IS NULL
             ORDER BY value DESC`,
          ),
        })
        return
      }
      if (name === "low-stock") {
        res.json({
          name,
          rows: await db.query(
            `SELECT i.sku, i.name, i.reorder_level AS "reorderLevel", COALESCE(SUM(b.qty),0)::float AS "onHand"
             FROM items i LEFT JOIN stock_balances b ON b.item_id = i.id
             WHERE i.deleted_at IS NULL
             GROUP BY i.id HAVING COALESCE(SUM(b.qty),0) <= i.reorder_level
             ORDER BY "onHand"`,
          ),
        })
        return
      }
      if (name === "payroll-register") {
        const user = await requireUser(db, req, res)
        if (!user) return
        if (!can(user.role, "salary", "view") && !can(user.role, "payroll", "view")) {
          res.status(403).json({ message: "Payroll register requires salary or payroll access" })
          return
        }
        res.json({
          name,
          rows: await db.query(
            `SELECT pr.period_label AS "periodLabel", e.employee_no AS "employeeNo",
                    e.first_name || ' ' || e.last_name AS "employeeName", p.gross, p.deductions, p.net
             FROM payslips p
             JOIN payroll_runs pr ON pr.id = p.payroll_run_id
             JOIN employees e ON e.id = p.employee_id
             ORDER BY e.employee_no`,
          ),
        })
        return
      }
      if (name === "budget-vs-actual") {
        res.json({
          name,
          rows: await db.query(
            `SELECT d.name AS department, a.name AS account, b.amount::float AS budget,
                    COALESCE((
                      SELECT SUM(jl.debit - jl.credit) FROM journal_lines jl
                      JOIN journals j ON j.id = jl.journal_id
                      WHERE j.status = 'posted' AND jl.account_id = b.account_id
                    ),0)::float AS actual
             FROM budgets b
             LEFT JOIN departments d ON d.id = b.department_id
             LEFT JOIN chart_of_accounts a ON a.id = b.account_id`,
          ),
        })
        return
      }
      if (name === "fixed-asset-register") {
        res.json({
          name,
          rows: await db.query(
            `SELECT asset_no AS "assetNo", name, category, acquisition_date AS "acquisitionDate",
                    acquisition_cost::float AS "acquisitionCost", status, location FROM fixed_assets ORDER BY asset_no`,
          ),
        })
        return
      }
      res.status(404).json({ message: "Unknown report" })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/periods/:id/close", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "accounts", "approve")
      if (!user) return
      const id = String(req.params.id)
      const openJournals = await db.query<{ n: number }>(
        "SELECT COUNT(*)::int AS n FROM journals WHERE period_id = ? AND status <> 'posted'",
        [id],
      )
      if (Number(openJournals[0]?.n ?? 0) > 0) {
        res.status(400).json({ message: "Close blocked: unposted journals remain in the period" })
        return
      }
      await db
        .prepare("UPDATE accounting_periods SET status = 'closed', closed_at = NOW(), closed_by = ? WHERE id = ? AND status = 'open'")
        .run(user.username, id)
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "close_period",
        entityType: "accounting_period",
        entityId: id,
        correlationId: correlationId(req),
      })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  registerErpCrud(app, db)
  registerWorkflowRoutes(app, db)
}
