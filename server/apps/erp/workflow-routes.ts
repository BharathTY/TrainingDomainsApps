import { randomUUID } from "node:crypto"
import type { Express } from "express"
import { z } from "zod"
import type { AppDatabase } from "../../shared/db"
import {
  DEFAULT_ORG,
  adjustStock,
  audit,
  correlationId,
  notify,
  requirePerm,
} from "./api-helpers"

export function registerWorkflowRoutes(app: Express, db: AppDatabase) {
  app.get("/api/erp/workflows/procure-to-pay", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "workflows", "view"))) return
      const [pr, rfq, po, grn, invoice, payment] = await Promise.all([
        db.query(`SELECT id, req_no AS "reqNo", status FROM purchase_requisitions ORDER BY created_at DESC LIMIT 5`),
        db.query(`SELECT id, rfq_no AS "rfqNo", status, requisition_id AS "requisitionId" FROM rfqs ORDER BY created_at DESC LIMIT 5`),
        db.query(`SELECT id, po_no AS "poNo", status, requisition_id AS "requisitionId", total_amount::float AS "totalAmount" FROM purchase_orders ORDER BY created_at DESC LIMIT 5`),
        db.query(`SELECT id, grn_no AS "grnNo", purchase_order_id AS "purchaseOrderId", status FROM goods_receipts ORDER BY created_at DESC LIMIT 5`),
        db.query(`SELECT id, invoice_no AS "invoiceNo", purchase_order_id AS "purchaseOrderId", goods_receipt_id AS "goodsReceiptId", status, match_status AS "matchStatus" FROM vendor_invoices ORDER BY created_at DESC LIMIT 5`),
        db.query(`SELECT id, payment_no AS "paymentNo", status, amount::float AS amount FROM payments WHERE direction = 'out' ORDER BY created_at DESC LIMIT 5`),
      ])
      res.json({
        workflow: "procure-to-pay",
        steps: [
          "requisition",
          "department_approval",
          "rfq",
          "purchase_order",
          "goods_receipt",
          "inventory_update",
          "vendor_invoice_match",
          "finance_approval",
          "payment",
          "gl_posting",
        ],
        data: { purchaseRequisitions: pr, rfqs: rfq, purchaseOrders: po, goodsReceipts: grn, vendorInvoices: invoice, payments: payment },
      })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/workflows/procure-to-pay/receive", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "inventory", "approve")
      if (!user) return
      const body = z.object({ purchaseOrderId: z.string() }).parse(req.body)
      const po = await db.query<{ id: string; status: string; warehouse_id: string; vendor_id: string }>(
        "SELECT id, status, warehouse_id, vendor_id FROM purchase_orders WHERE id = ?",
        [body.purchaseOrderId],
      )
      if (!po[0] || po[0].status !== "approved") {
        res.status(400).json({ message: "PO must be approved before goods receipt" })
        return
      }
      const lines = await db.query<{ id: string; item_id: string; qty: number; unit_cost: number; received_qty: number }>(
        "SELECT id, item_id, qty::float AS qty, unit_cost::float AS unit_cost, received_qty::float AS received_qty FROM po_lines WHERE purchase_order_id = ?",
        [body.purchaseOrderId],
      )
      const grnId = randomUUID()
      const grnNo = `GRN-${Date.now().toString().slice(-6)}`
      await db
        .prepare(
          `INSERT INTO goods_receipts (id, organization_id, grn_no, purchase_order_id, warehouse_id, received_on, status, created_by)
           VALUES (?, ?, ?, ?, ?, CURRENT_DATE, 'posted', ?)`,
        )
        .run(grnId, DEFAULT_ORG, grnNo, body.purchaseOrderId, po[0].warehouse_id ?? "wh-blr", user.username)
      for (const line of lines) {
        const qty = line.qty - line.received_qty
        if (qty <= 0) continue
        await db
          .prepare("INSERT INTO gr_lines (id, goods_receipt_id, item_id, qty) VALUES (?, ?, ?, ?)")
          .run(randomUUID(), grnId, line.item_id, qty)
        const stock = await adjustStock(db, {
          organizationId: DEFAULT_ORG,
          itemId: line.item_id,
          warehouseId: po[0].warehouse_id ?? "wh-blr",
          qty,
          direction: "in",
          unitCost: line.unit_cost,
          refType: "goods_receipt",
          refId: grnId,
          occurredOn: new Date().toISOString().slice(0, 10),
          actor: user.username,
        })
        if (!stock.ok) {
          res.status(400).json({ message: stock.message })
          return
        }
        await db.prepare("UPDATE po_lines SET received_qty = received_qty + ? WHERE id = ?").run(qty, line.id)
      }
      await db.prepare("UPDATE purchase_orders SET status = 'received', updated_by = ?, updated_at = NOW() WHERE id = ?").run(user.username, body.purchaseOrderId)
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "receive",
        entityType: "goods_receipt",
        entityId: grnId,
        correlationId: correlationId(req),
      })
      res.status(201).json({ id: grnId, grnNo })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/workflows/procure-to-pay/match-invoice", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "ap", "edit")
      if (!user) return
      const body = z
        .object({
          vendorId: z.string(),
          purchaseOrderId: z.string(),
          goodsReceiptId: z.string(),
          amount: z.number().positive(),
        })
        .parse(req.body)
      const po = await db.query<{ total_amount: number }>("SELECT total_amount::float AS total_amount FROM purchase_orders WHERE id = ?", [
        body.purchaseOrderId,
      ])
      const grn = await db.query<{ purchase_order_id: string }>("SELECT purchase_order_id FROM goods_receipts WHERE id = ?", [
        body.goodsReceiptId,
      ])
      if (!po[0] || !grn[0] || grn[0].purchase_order_id !== body.purchaseOrderId) {
        res.status(400).json({ message: "Invoice must reference matching PO and GRN" })
        return
      }
      const matchStatus = Math.abs(po[0].total_amount - body.amount) < 1 ? "matched" : "variance"
      const id = randomUUID()
      const invoiceNo = `VIN-${Date.now().toString().slice(-6)}`
      await db
        .prepare(
          `INSERT INTO vendor_invoices (id, organization_id, invoice_no, vendor_id, purchase_order_id, goods_receipt_id, invoice_date, due_date, amount, tax_amount, status, match_status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE, CURRENT_DATE + 30, ?, ?, 'pending_approval', ?, ?)`,
        )
        .run(id, DEFAULT_ORG, invoiceNo, body.vendorId, body.purchaseOrderId, body.goodsReceiptId, body.amount, body.amount * 0.18, matchStatus, user.username)
      await notify(db, "finmgr", "Vendor invoice pending", `${invoiceNo} awaits finance approval`, "ap")
      res.status(201).json({ id, invoiceNo, matchStatus })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/workflows/procure-to-pay/pay", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "ap", "approve")
      if (!user) return
      const body = z
        .object({
          vendorInvoiceId: z.string(),
          idempotencyKey: z.string().min(8),
        })
        .parse(req.body)
      const existing = await db.query<{ id: string; payment_no: string }>(
        "SELECT id, payment_no FROM payments WHERE idempotency_key = ?",
        [body.idempotencyKey],
      )
      if (existing[0]) {
        res.json({ id: existing[0].id, paymentNo: existing[0].payment_no, idempotent: true })
        return
      }
      const invoice = await db.query<{ id: string; vendor_id: string; amount: number; tax_amount: number; status: string }>(
        "SELECT id, vendor_id, amount::float AS amount, tax_amount::float AS tax_amount, status FROM vendor_invoices WHERE id = ?",
        [body.vendorInvoiceId],
      )
      if (!invoice[0] || !["approved", "open"].includes(invoice[0].status)) {
        res.status(400).json({ message: "Invoice must be approved before payment" })
        return
      }
      const total = invoice[0].amount + invoice[0].tax_amount
      const payId = randomUUID()
      const paymentNo = `PAY-${Date.now().toString().slice(-6)}`
      const journalId = randomUUID()
      await db
        .prepare(
          `INSERT INTO journals (id, organization_id, journal_no, period_id, journal_date, source, source_ref, status, memo, posted_at, posted_by, created_by)
           VALUES (?, ?, ?, 'per-7', CURRENT_DATE, 'payment', ?, 'posted', 'Vendor payment', NOW(), ?, ?)`,
        )
        .run(journalId, DEFAULT_ORG, `JNL-P${Date.now().toString().slice(-5)}`, payId, user.username, user.username)
      await db
        .prepare("INSERT INTO journal_lines (id, journal_id, account_id, debit, credit) VALUES (?, ?, 'acc-2000', ?, 0)")
        .run(randomUUID(), journalId, total)
      await db
        .prepare("INSERT INTO journal_lines (id, journal_id, account_id, debit, credit) VALUES (?, ?, 'acc-1010', 0, ?)")
        .run(randomUUID(), journalId, total)
      await db
        .prepare(
          `INSERT INTO payments (id, organization_id, payment_no, direction, party_type, party_id, amount, payment_date, status, bank_account_id, journal_id, idempotency_key, created_by)
           VALUES (?, ?, ?, 'out', 'vendor', ?, ?, CURRENT_DATE, 'completed', 'bank-hdfc', ?, ?, ?)`,
        )
        .run(payId, DEFAULT_ORG, paymentNo, invoice[0].vendor_id, total, journalId, body.idempotencyKey, user.username)
      await db.prepare("INSERT INTO payment_allocations (id, payment_id, invoice_type, invoice_id, amount) VALUES (?, ?, 'vendor', ?, ?)").run(
        randomUUID(),
        payId,
        invoice[0].id,
        total,
      )
      await db.prepare("UPDATE vendor_invoices SET status = 'paid' WHERE id = ?").run(invoice[0].id)
      await db.prepare("UPDATE bank_accounts SET balance = balance - ? WHERE id = 'bank-hdfc'").run(total)
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "pay",
        entityType: "payment",
        entityId: payId,
        correlationId: correlationId(req),
      })
      res.status(201).json({ id: payId, paymentNo, journalId })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/workflows/order-to-cash", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "workflows", "view"))) return
      const [orders, deliveries, invoices, receipts] = await Promise.all([
        db.query(`SELECT id, so_no AS "soNo", status, total_amount::float AS "totalAmount" FROM sales_orders ORDER BY created_at DESC LIMIT 5`),
        db.query(`SELECT id, delivery_no AS "deliveryNo", sales_order_id AS "salesOrderId", status, tracking_no AS "trackingNo" FROM deliveries ORDER BY created_at DESC LIMIT 5`),
        db.query(`SELECT id, invoice_no AS "invoiceNo", sales_order_id AS "salesOrderId", balance::float AS balance, status FROM customer_invoices ORDER BY created_at DESC LIMIT 5`),
        db.query(`SELECT id, payment_no AS "paymentNo", amount::float AS amount, status FROM payments WHERE direction = 'in' ORDER BY created_at DESC LIMIT 5`),
      ])
      res.json({
        workflow: "order-to-cash",
        steps: ["order", "availability", "approval", "fulfillment", "delivery", "invoice", "receipt", "allocation"],
        data: { salesOrders: orders, deliveries, customerInvoices: invoices, receipts },
      })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/workflows/order-to-cash/fulfill", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "sales", "edit")
      if (!user) return
      const body = z.object({ salesOrderId: z.string() }).parse(req.body)
      const so = await db.query<{ id: string; status: string; warehouse_id: string; customer_id: string; total_amount: number }>(
        "SELECT id, status, warehouse_id, customer_id, total_amount::float AS total_amount FROM sales_orders WHERE id = ?",
        [body.salesOrderId],
      )
      if (!so[0] || so[0].status !== "approved") {
        res.status(400).json({ message: "Sales order must be approved" })
        return
      }
      const lines = await db.query<{ id: string; item_id: string; qty: number; unit_price: number; fulfilled_qty: number }>(
        "SELECT id, item_id, qty::float AS qty, unit_price::float AS unit_price, fulfilled_qty::float AS fulfilled_qty FROM so_lines WHERE sales_order_id = ?",
        [body.salesOrderId],
      )
      const delId = randomUUID()
      const deliveryNo = `DEL-${Date.now().toString().slice(-6)}`
      const wh = so[0].warehouse_id ?? "wh-blr"
      await db
        .prepare(
          `INSERT INTO deliveries (id, organization_id, delivery_no, sales_order_id, warehouse_id, delivered_on, status, tracking_no, created_by)
           VALUES (?, ?, ?, ?, ?, CURRENT_DATE, 'delivered', ?, ?)`,
        )
        .run(delId, DEFAULT_ORG, deliveryNo, body.salesOrderId, wh, `TRK-${Date.now().toString().slice(-5)}`, user.username)
      for (const line of lines) {
        const qty = line.qty - line.fulfilled_qty
        if (qty <= 0) continue
        const stock = await adjustStock(db, {
          organizationId: DEFAULT_ORG,
          itemId: line.item_id,
          warehouseId: wh,
          qty,
          direction: "out",
          unitCost: line.unit_price,
          refType: "delivery",
          refId: delId,
          occurredOn: new Date().toISOString().slice(0, 10),
          actor: user.username,
        })
        if (!stock.ok) {
          res.status(400).json({ message: stock.message })
          return
        }
        await db.prepare("INSERT INTO delivery_lines (id, delivery_id, item_id, qty) VALUES (?, ?, ?, ?)").run(randomUUID(), delId, line.item_id, qty)
        await db.prepare("UPDATE so_lines SET fulfilled_qty = fulfilled_qty + ? WHERE id = ?").run(qty, line.id)
      }
      await db.prepare("UPDATE sales_orders SET status = 'fulfilled', updated_by = ?, updated_at = NOW() WHERE id = ?").run(user.username, body.salesOrderId)
      const invId = randomUUID()
      const invoiceNo = `CIN-${Date.now().toString().slice(-6)}`
      await db
        .prepare(
          `INSERT INTO customer_invoices (id, organization_id, invoice_no, customer_id, sales_order_id, delivery_id, invoice_date, due_date, amount, tax_amount, status, balance, created_by)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE, CURRENT_DATE + 30, ?, ?, 'open', ?, ?)`,
        )
        .run(invId, DEFAULT_ORG, invoiceNo, so[0].customer_id, body.salesOrderId, delId, so[0].total_amount, so[0].total_amount * 0.18, so[0].total_amount, user.username)
      res.status(201).json({ deliveryId: delId, deliveryNo, invoiceId: invId, invoiceNo })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/workflows/order-to-cash/receive-payment", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "ar", "approve")
      if (!user) return
      const body = z.object({ customerInvoiceId: z.string(), idempotencyKey: z.string().min(8) }).parse(req.body)
      const existing = await db.query<{ id: string; payment_no: string }>(
        "SELECT id, payment_no FROM payments WHERE idempotency_key = ?",
        [body.idempotencyKey],
      )
      if (existing[0]) {
        res.json({ id: existing[0].id, paymentNo: existing[0].payment_no, idempotent: true })
        return
      }
      const invoice = await db.query<{ id: string; customer_id: string; balance: number; status: string }>(
        "SELECT id, customer_id, balance::float AS balance, status FROM customer_invoices WHERE id = ?",
        [body.customerInvoiceId],
      )
      if (!invoice[0] || invoice[0].balance <= 0) {
        res.status(400).json({ message: "Invoice has no open balance" })
        return
      }
      const amount = invoice[0].balance
      const payId = randomUUID()
      const paymentNo = `RCV-${Date.now().toString().slice(-6)}`
      const journalId = randomUUID()
      await db
        .prepare(
          `INSERT INTO journals (id, organization_id, journal_no, period_id, journal_date, source, source_ref, status, memo, posted_at, posted_by, created_by)
           VALUES (?, ?, ?, 'per-7', CURRENT_DATE, 'receipt', ?, 'posted', 'Customer receipt', NOW(), ?, ?)`,
        )
        .run(journalId, DEFAULT_ORG, `JNL-R${Date.now().toString().slice(-5)}`, payId, user.username, user.username)
      await db.prepare("INSERT INTO journal_lines (id, journal_id, account_id, debit, credit) VALUES (?, ?, 'acc-1010', ?, 0)").run(randomUUID(), journalId, amount)
      await db.prepare("INSERT INTO journal_lines (id, journal_id, account_id, debit, credit) VALUES (?, ?, 'acc-1100', 0, ?)").run(randomUUID(), journalId, amount)
      await db
        .prepare(
          `INSERT INTO payments (id, organization_id, payment_no, direction, party_type, party_id, amount, payment_date, status, bank_account_id, journal_id, idempotency_key, created_by)
           VALUES (?, ?, ?, 'in', 'customer', ?, ?, CURRENT_DATE, 'completed', 'bank-hdfc', ?, ?, ?)`,
        )
        .run(payId, DEFAULT_ORG, paymentNo, invoice[0].customer_id, amount, journalId, body.idempotencyKey, user.username)
      await db.prepare("INSERT INTO payment_allocations (id, payment_id, invoice_type, invoice_id, amount) VALUES (?, ?, 'customer', ?, ?)").run(
        randomUUID(),
        payId,
        invoice[0].id,
        amount,
      )
      await db.prepare("UPDATE customer_invoices SET balance = 0, status = 'paid' WHERE id = ?").run(invoice[0].id)
      await db.prepare("UPDATE bank_accounts SET balance = balance + ? WHERE id = 'bank-hdfc'").run(amount)
      res.status(201).json({ id: payId, paymentNo, journalId })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/workflows/hire-to-retire", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "workflows", "view"))) return
      const [reqs, candidates, offers, payroll, offboard] = await Promise.all([
        db.query(`SELECT id, title, status, openings FROM job_requisitions ORDER BY created_at DESC LIMIT 5`),
        db.query(`SELECT id, full_name AS "fullName", stage, requisition_id AS "requisitionId" FROM candidates ORDER BY created_at DESC LIMIT 10`),
        db.query(`SELECT id, candidate_id AS "candidateId", offered_ctc::float AS "offeredCtc", status FROM offers ORDER BY id DESC LIMIT 5`),
        db.query(`SELECT id, period_label AS "periodLabel", status FROM payroll_runs ORDER BY start_date DESC LIMIT 5`),
        db.query(`SELECT id, employee_no AS "employeeNo", status, leaving_date AS "leavingDate" FROM employees WHERE status = 'exited' OR leaving_date IS NOT NULL LIMIT 5`),
      ])
      res.json({
        workflow: "hire-to-retire",
        steps: ["requisition", "candidates", "interview", "offer", "employee", "onboarding", "attendance", "payroll", "gl_posting", "offboarding"],
        data: { requisitions: reqs, candidates, offers, payrollRuns: payroll, offboarded: offboard },
      })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/workflows/hire-to-retire/accept-offer", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "recruitment", "approve")
      if (!user) return
      const body = z.object({ offerId: z.string() }).parse(req.body)
      const offer = await db.query<{ id: string; candidate_id: string; offered_ctc: number; status: string }>(
        "SELECT id, candidate_id, offered_ctc::float AS offered_ctc, status FROM offers WHERE id = ?",
        [body.offerId],
      )
      if (!offer[0]) {
        res.status(404).json({ message: "Offer not found" })
        return
      }
      await db.prepare("UPDATE offers SET status = 'accepted', accepted_at = NOW() WHERE id = ?").run(body.offerId)
      await db.prepare("UPDATE candidates SET stage = 'hired' WHERE id = ?").run(offer[0].candidate_id)
      const cand = await db.query<{ full_name: string; email: string }>("SELECT full_name, email FROM candidates WHERE id = ?", [
        offer[0].candidate_id,
      ])
      const empId = randomUUID()
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM employees")
      const no = `E${String(Number(count[0]?.n ?? 0) + 1).padStart(5, "0")}`
      const [first, ...rest] = (cand[0]?.full_name ?? "New Hire").split(" ")
      await db
        .prepare(
          `INSERT INTO employees (id, organization_id, employee_no, first_name, last_name, email, department_id, position_id, status, joining_date, created_by)
           VALUES (?, ?, ?, ?, ?, ?, 'dept-eng', 'pos-assoc', 'active', CURRENT_DATE, ?)`,
        )
        .run(empId, DEFAULT_ORG, no, first, rest.join(" ") || "Hire", cand[0]?.email ?? `${no.toLowerCase()}@example.com`, user.username)
      await db
        .prepare("INSERT INTO employee_salaries (id, employee_id, structure_id, effective_from, gross) VALUES (?, ?, 'sal-std', CURRENT_DATE, ?)")
        .run(randomUUID(), empId, offer[0].offered_ctc / 12)
      await db
        .prepare("INSERT INTO employment_history (id, employee_id, event_type, effective_on, notes, created_by) VALUES (?, ?, 'hired', CURRENT_DATE, 'From recruitment offer', ?)")
        .run(randomUUID(), empId, user.username)
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "hire",
        entityType: "employee",
        entityId: empId,
        correlationId: correlationId(req),
      })
      res.status(201).json({ employeeId: empId, employeeNo: no })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/workflows/hire-to-retire/offboard", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "employees", "approve")
      if (!user) return
      const body = z.object({ employeeId: z.string() }).parse(req.body)
      await db
        .prepare("UPDATE employees SET status = 'exited', leaving_date = CURRENT_DATE, updated_by = ?, updated_at = NOW() WHERE id = ?")
        .run(user.username, body.employeeId)
      await db
        .prepare("UPDATE fixed_assets SET assigned_to = NULL, status = 'in_store' WHERE assigned_to = ?")
        .run(body.employeeId)
      await db
        .prepare(
          "INSERT INTO employment_history (id, employee_id, event_type, effective_on, notes, created_by) VALUES (?, ?, 'offboarded', CURRENT_DATE, 'Assets returned; access revocation recorded', ?)",
        )
        .run(randomUUID(), body.employeeId, user.username)
      await audit(db, {
        organizationId: DEFAULT_ORG,
        actor: user.username,
        action: "offboard",
        entityType: "employee",
        entityId: body.employeeId,
        details: "asset_return,access_revocation,final_settlement_flagged",
        correlationId: correlationId(req),
      })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/workflows/record-to-report", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "workflows", "view"))) return
      const [drafts, posted, periods] = await Promise.all([
        db.query(`SELECT id, journal_no AS "journalNo", status FROM journals WHERE status IN ('draft','pending_approval') ORDER BY created_at DESC LIMIT 10`),
        db.query(`SELECT COUNT(*)::int AS n FROM journals WHERE status = 'posted'`),
        db.query(`SELECT id, name, status FROM accounting_periods ORDER BY start_date`),
      ])
      res.json({
        workflow: "record-to-report",
        steps: ["operational_postings", "journal_review", "balance_check", "post", "statements", "reconciliation", "period_close"],
        data: { unpostedJournals: drafts, postedCount: Number(posted[0]?.n ?? 0), periods },
      })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/erp/workflows/expense-to-reimbursement", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "workflows", "view"))) return
      const claims = await db.query(
        `SELECT id, claim_no AS "claimNo", amount::float AS amount, status, employee_id AS "employeeId" FROM expense_claims ORDER BY created_at DESC LIMIT 20`,
      )
      res.json({
        workflow: "expense-to-reimbursement",
        steps: ["submit", "manager_approval", "finance_policy_check", "reimbursement", "payment", "gl_posting"],
        data: { claims },
      })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/erp/workflows/expense-to-reimbursement/reimburse", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "expenses", "approve")
      if (!user) return
      const body = z.object({ claimId: z.string() }).parse(req.body)
      const claim = await db.query<{ id: string; amount: number; status: string; cost_center_id: string | null; employee_id: string }>(
        "SELECT id, amount::float AS amount, status, cost_center_id, employee_id FROM expense_claims WHERE id = ?",
        [body.claimId],
      )
      if (!claim[0] || claim[0].status !== "approved") {
        res.status(400).json({ message: "Claim must be approved before reimbursement" })
        return
      }
      const journalId = randomUUID()
      const payId = randomUUID()
      await db
        .prepare(
          `INSERT INTO journals (id, organization_id, journal_no, period_id, journal_date, source, source_ref, status, memo, posted_at, posted_by, created_by)
           VALUES (?, ?, ?, 'per-7', CURRENT_DATE, 'expense', ?, 'posted', 'Expense reimbursement', NOW(), ?, ?)`,
        )
        .run(journalId, DEFAULT_ORG, `JNL-E${Date.now().toString().slice(-5)}`, claim[0].id, user.username, user.username)
      await db
        .prepare("INSERT INTO journal_lines (id, journal_id, account_id, cost_center_id, debit, credit) VALUES (?, ?, 'acc-5200', ?, ?, 0)")
        .run(randomUUID(), journalId, claim[0].cost_center_id, claim[0].amount)
      await db
        .prepare("INSERT INTO journal_lines (id, journal_id, account_id, cost_center_id, debit, credit) VALUES (?, ?, 'acc-1010', 'cc-fin', 0, ?)")
        .run(randomUUID(), journalId, claim[0].amount)
      await db
        .prepare(
          `INSERT INTO payments (id, organization_id, payment_no, direction, party_type, party_id, amount, payment_date, status, bank_account_id, journal_id, created_by)
           VALUES (?, ?, ?, 'out', 'employee', ?, ?, CURRENT_DATE, 'completed', 'bank-hdfc', ?, ?)`,
        )
        .run(payId, DEFAULT_ORG, `EXP-P${Date.now().toString().slice(-5)}`, claim[0].employee_id, claim[0].amount, journalId, user.username)
      await db
        .prepare("UPDATE expense_claims SET status = 'reimbursed', reimbursed_at = NOW(), payment_id = ?, journal_id = ? WHERE id = ?")
        .run(payId, journalId, claim[0].id)
      await db.prepare("UPDATE bank_accounts SET balance = balance - ? WHERE id = 'bank-hdfc'").run(claim[0].amount)
      const emp = await db.query<{ username: string | null }>("SELECT username FROM employees WHERE id = ?", [claim[0].employee_id])
      if (emp[0]?.username) await notify(db, emp[0].username, "Expense reimbursed", "Your claim was paid", "expenses")
      res.json({ ok: true, paymentId: payId, journalId })
    } catch (error) {
      next(error)
    }
  })
}
