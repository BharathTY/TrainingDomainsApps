import { randomUUID } from "node:crypto"
import type { Express, Request } from "express"
import type { AppDatabase } from "../../shared/db"
import {
  customerForUser,
  logActivity,
  maskAccount,
  okList,
  parsePaging,
  requirePerm,
  requireUser,
  resolveCustomerScope,
  transferRef,
  txnRef,
} from "./api-helpers"

const DAILY_LIMIT = 100_000
const REAUTH_THRESHOLD = 50_000

function periodBounds(period: string, from?: string, to?: string) {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  if (period === "7d") start.setDate(start.getDate() - 6)
  else if (period === "30d") start.setDate(start.getDate() - 29)
  else if (period === "90d") start.setDate(start.getDate() - 89)
  else if (period === "custom" && from && to) {
    return { start: new Date(`${from}T00:00:00`), end: new Date(`${to}T23:59:59`) }
  } else start.setDate(start.getDate() - 29)
  return { start, end }
}

async function assertAccountAccess(db: AppDatabase, accountId: string, customerId: string | undefined, role: string) {
  const rows = await db.query<{ id: string; customer_id: string; status: string; available_balance: number; account_no: string; nickname: string }>(
    "SELECT id, customer_id, status, available_balance::float AS available_balance, account_no, nickname FROM accounts WHERE id = ? AND deleted_at IS NULL",
    [accountId],
  )
  const acc = rows[0]
  if (!acc) return { error: "Account not found" as const }
  if (role === "customer" && customerId && acc.customer_id !== customerId) return { error: "Account not found" as const }
  return { acc }
}

export function registerBankingApi(app: Express, db: AppDatabase) {
  app.get("/api/banking/v1/openapi.json", (_req, res) => {
    res.json({
      openapi: "3.0.3",
      info: { title: "Demo National Bank API", version: "1.0.0", description: "Synthetic banking training API" },
      paths: {
        "/api/banking/dashboard": { get: { summary: "Dashboard KPIs" } },
        "/api/banking/accounts": { get: { summary: "List accounts" } },
        "/api/banking/transfers": { post: { summary: "Create transfer" } },
        "/api/banking/statements": { get: { summary: "Account statement" } },
        "/api/banking/beneficiaries": { get: { summary: "List beneficiaries" } },
      },
    })
  })

  app.get("/api/banking/notifications", async (req, res, next) => {
    try {
      const user = await requireUser(db, req, res)
      if (!user) return
      const rows = await db.query(
        `SELECT id, title, body, read, created_at AS "createdAt"
         FROM notifications WHERE username = ? ORDER BY created_at DESC LIMIT 20`,
        [user.username],
      )
      res.json(rows)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/banking/dashboard", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "dashboard", "view")
      if (!user) return
      const customerId = await resolveCustomerScope(db, user, String(req.query.customerId ?? ""))
      const customer = customerId
        ? (
            await db.query(
              `SELECT id, full_name AS "fullName", customer_no AS "customerNo", email, phone, branch_name AS "branchName", branch_code AS "branchCode"
               FROM customers WHERE id = ?`,
              [customerId],
            )
          )[0]
        : null

      const accountFilter = customerId ? "AND customer_id = ?" : ""
      const params = customerId ? [customerId] : []

      const [accounts, recent, scheduled, announcements, chart, lastLogin] = await Promise.all([
        db.query(
          `SELECT id, account_no AS "accountNo", account_type AS "accountType", nickname, balance::float AS balance,
                  available_balance::float AS "availableBalance", status, is_favorite AS "isFavorite"
           FROM accounts WHERE deleted_at IS NULL ${accountFilter} ORDER BY is_favorite DESC, account_type`,
          params,
        ),
        db.query(
          `SELECT t.id, t.txn_ref AS "txnRef", t.description, t.txn_type AS "txnType", t.amount::float AS amount,
                  t.status, t.created_at AS "createdAt", a.nickname AS account
           FROM transactions t
           JOIN accounts a ON a.id = t.account_id
           WHERE TRUE ${customerId ? "AND a.customer_id = ?" : ""}
           ORDER BY t.created_at DESC LIMIT 8`,
          params,
        ),
        db.query(
          `SELECT id, schedule_no AS "scheduleNo", amount::float AS amount, execute_date AS "executeDate",
                  execute_time AS "executeTime", frequency, status
           FROM scheduled_payments
           WHERE deleted_at IS NULL AND status = 'scheduled' ${customerId ? "AND customer_id = ?" : ""}
           ORDER BY execute_date ASC LIMIT 5`,
          params,
        ),
        db.query(
          `SELECT id, title, body, severity, published_at AS "publishedAt"
           FROM announcements ORDER BY published_at DESC LIMIT 5`,
        ),
        db.query<{ day: string; credits: number; debits: number }>(
          `SELECT to_char(t.created_at::date, 'YYYY-MM-DD') AS day,
                  COALESCE(SUM(CASE WHEN t.txn_type = 'credit' THEN t.amount ELSE 0 END),0)::float AS credits,
                  COALESCE(SUM(CASE WHEN t.txn_type = 'debit' THEN t.amount ELSE 0 END),0)::float AS debits
           FROM transactions t
           JOIN accounts a ON a.id = t.account_id
           WHERE t.created_at >= CURRENT_DATE - INTERVAL '6 days' ${customerId ? "AND a.customer_id = ?" : ""}
           GROUP BY t.created_at::date ORDER BY day`,
          params,
        ),
        db.query<{ createdAt: string }>(
          `SELECT created_at AS "createdAt" FROM login_activity
           WHERE username = ? AND success = TRUE ORDER BY created_at DESC LIMIT 1 OFFSET 1`,
          [user.username],
        ),
      ])

      const totalBalance = accounts
        .filter((a) => (a as { status: string }).status === "active")
        .reduce((sum, a) => sum + Number((a as { balance: number }).balance ?? 0), 0)

      res.json({
        customer,
        totalBalance,
        accounts,
        recentTransactions: recent,
        upcomingTransfers: scheduled,
        announcements,
        activityChart: chart,
        lastLoginAt: lastLogin[0]?.createdAt ?? null,
        transferLimit: DAILY_LIMIT,
      })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/banking/accounts", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "accounts", "view")
      if (!user) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const customerId = await resolveCustomerScope(db, user, String(req.query.customerId ?? ""))
      const type = String(req.query.type ?? "").trim()
      const status = String(req.query.status ?? "").trim()
      const favorite = String(req.query.favorite ?? "")

      const where: string[] = ["deleted_at IS NULL"]
      const params: unknown[] = []
      if (customerId) {
        where.push("customer_id = ?")
        params.push(customerId)
      }
      if (type) {
        where.push("account_type = ?")
        params.push(type)
      }
      if (status) {
        where.push("status = ?")
        params.push(status)
      }
      if (favorite === "true") where.push("is_favorite = TRUE")
      if (q) {
        where.push("(LOWER(account_no) LIKE ? OR LOWER(nickname) LIKE ? OR LOWER(account_type) LIKE ?)")
        params.push(`%${q}%`, `%${q}%`, `%${q}%`)
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM accounts ${whereSql}`, params)
      const rows = await db.query(
        `SELECT id, account_no AS "accountNo", account_type AS "accountType", nickname,
                balance::float AS balance, available_balance::float AS "availableBalance",
                status, is_favorite AS "isFavorite", interest_rate::float AS "interestRate",
                opened_at AS "openedAt", maturity_date AS "maturityDate", currency
         FROM accounts ${whereSql}
         ORDER BY is_favorite DESC, account_type, account_no
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/banking/accounts/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "accounts", "view")
      if (!user) return
      const customerId = await resolveCustomerScope(db, user)
      const access = await assertAccountAccess(db, String(req.params.id), customerId, user.role)
      if ("error" in access && access.error) {
        res.status(404).json({ message: access.error })
        return
      }
      const rows = await db.query(
        `SELECT a.id, a.account_no AS "accountNo", a.account_type AS "accountType", a.nickname,
                a.balance::float AS balance, a.available_balance::float AS "availableBalance",
                a.status, a.is_favorite AS "isFavorite", a.interest_rate::float AS "interestRate",
                a.opened_at AS "openedAt", a.maturity_date AS "maturityDate", a.currency,
                c.full_name AS "customerName", c.customer_no AS "customerNo", c.email, c.phone,
                c.address, c.branch_code AS "branchCode", c.branch_name AS "branchName", c.kyc_status AS "kycStatus"
         FROM accounts a
         JOIN customers c ON c.id = a.customer_id
         WHERE a.id = ?`,
        [req.params.id],
      )
      res.json(rows[0])
    } catch (error) {
      next(error)
    }
  })

  app.patch("/api/banking/accounts/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "accounts", "view")
      if (!user) return
      const customerId = await resolveCustomerScope(db, user)
      const access = await assertAccountAccess(db, String(req.params.id), customerId, user.role)
      if ("error" in access && access.error) {
        res.status(404).json({ message: access.error })
        return
      }
      const nickname = String(req.body?.nickname ?? "").trim().slice(0, 40)
      const isFavorite = Boolean(req.body?.isFavorite)
      await db
        .prepare("UPDATE accounts SET nickname = COALESCE(NULLIF(?, ''), nickname), is_favorite = ? WHERE id = ?")
        .run(nickname, isFavorite, req.params.id)
      await logActivity(db, {
        entityType: "account",
        entityId: String(req.params.id),
        action: "update",
        details: `nickname/favorite updated`,
        actor: user.username,
      })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/banking/beneficiaries", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "beneficiaries", "view")
      if (!user) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const customerId = await resolveCustomerScope(db, user, String(req.query.customerId ?? ""))
      const where: string[] = ["deleted_at IS NULL"]
      const params: unknown[] = []
      if (customerId) {
        where.push("customer_id = ?")
        params.push(customerId)
      }
      if (q) {
        where.push("(LOWER(name) LIKE ? OR LOWER(account_no) LIKE ? OR LOWER(nickname) LIKE ? OR LOWER(bank_name) LIKE ?)")
        params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
      }
      const whereSql = `WHERE ${where.join(" AND ")}`
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM beneficiaries ${whereSql}`, params)
      const rows = await db.query(
        `SELECT id, name, account_no AS "accountNo", bank_name AS "bankName", ifsc, bank_type AS "bankType",
                nickname, is_favorite AS "isFavorite", status, created_at AS "createdAt"
         FROM beneficiaries ${whereSql}
         ORDER BY is_favorite DESC, name
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/banking/beneficiaries", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "beneficiaries", "create")
      if (!user) return
      const customerId = (await resolveCustomerScope(db, user)) ?? (await customerForUser(db, user.username))?.id
      if (!customerId) {
        res.status(400).json({ message: "No customer profile linked to this user" })
        return
      }
      const name = String(req.body?.name ?? "").trim()
      const accountNo = String(req.body?.accountNo ?? "").trim()
      const bankName = String(req.body?.bankName ?? "").trim()
      const ifsc = String(req.body?.ifsc ?? "").trim().toUpperCase()
      const bankType = String(req.body?.bankType ?? "same_bank")
      const nickname = String(req.body?.nickname ?? "").trim()
      if (!name || name.length < 2) {
        res.status(400).json({ message: "Beneficiary name is required", field: "name" })
        return
      }
      if (!/^\d{9,18}$/.test(accountNo)) {
        res.status(400).json({ message: "Account number must be 9–18 digits", field: "accountNo" })
        return
      }
      if (!bankName) {
        res.status(400).json({ message: "Bank name is required", field: "bankName" })
        return
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
        res.status(400).json({ message: "Invalid IFSC format", field: "ifsc" })
        return
      }
      const id = randomUUID()
      await db
        .prepare(
          `INSERT INTO beneficiaries (id, customer_id, name, account_no, bank_name, ifsc, bank_type, nickname, is_favorite, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE, 'active')`,
        )
        .run(id, customerId, name, accountNo, bankName, ifsc, bankType === "other_bank" ? "other_bank" : "same_bank", nickname)
      await logActivity(db, { entityType: "beneficiary", entityId: id, action: "create", actor: user.username })
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  app.patch("/api/banking/beneficiaries/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "beneficiaries", "edit")
      if (!user) return
      const customerId = await resolveCustomerScope(db, user)
      const existing = await db.query<{ id: string; customer_id: string }>(
        "SELECT id, customer_id FROM beneficiaries WHERE id = ? AND deleted_at IS NULL",
        [req.params.id],
      )
      if (!existing[0] || (user.role === "customer" && existing[0].customer_id !== customerId)) {
        res.status(404).json({ message: "Beneficiary not found" })
        return
      }
      const name = String(req.body?.name ?? "").trim()
      const nickname = String(req.body?.nickname ?? "").trim()
      const isFavorite = Boolean(req.body?.isFavorite)
      const bankName = String(req.body?.bankName ?? "").trim()
      const ifsc = String(req.body?.ifsc ?? "").trim().toUpperCase()
      await db
        .prepare(
          `UPDATE beneficiaries SET
             name = COALESCE(NULLIF(?, ''), name),
             nickname = COALESCE(?, nickname),
             bank_name = COALESCE(NULLIF(?, ''), bank_name),
             ifsc = COALESCE(NULLIF(?, ''), ifsc),
             is_favorite = ?,
             updated_at = NOW()
           WHERE id = ?`,
        )
        .run(name, nickname, bankName, ifsc, isFavorite, req.params.id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.delete("/api/banking/beneficiaries/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "beneficiaries", "delete")
      if (!user) return
      const customerId = await resolveCustomerScope(db, user)
      const existing = await db.query<{ id: string; customer_id: string }>(
        "SELECT id, customer_id FROM beneficiaries WHERE id = ? AND deleted_at IS NULL",
        [req.params.id],
      )
      if (!existing[0] || (user.role === "customer" && existing[0].customer_id !== customerId)) {
        res.status(404).json({ message: "Beneficiary not found" })
        return
      }
      await db.prepare("UPDATE beneficiaries SET deleted_at = NOW(), status = 'deleted' WHERE id = ?").run(req.params.id)
      await logActivity(db, { entityType: "beneficiary", entityId: String(req.params.id), action: "delete", actor: user.username })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/banking/transfers/preview", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "transfers", "create")
      if (!user) return
      const result = await validateTransfer(db, req, user)
      if ("error" in result) {
        res.status(result.status ?? 400).json({ message: result.error, code: result.code })
        return
      }
      res.json({
        ...result.preview,
        requiresReauth: result.preview.amount >= REAUTH_THRESHOLD,
        dailyLimit: DAILY_LIMIT,
      })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/banking/transfers", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "transfers", "create")
      if (!user) return

      const idempotencyKey = String(req.headers["x-idempotency-key"] ?? req.body?.idempotencyKey ?? "").trim()
      if (idempotencyKey) {
        const prior = await db.query<{ id: string; transfer_ref: string; status: string }>(
          "SELECT id, transfer_ref, status FROM transfers WHERE transfer_ref = ?",
          [idempotencyKey],
        )
        if (prior[0]) {
          res.json({ id: prior[0].id, transferRef: prior[0].transfer_ref, status: prior[0].status, duplicate: true })
          return
        }
      }

      const simulate = String(req.body?.simulate ?? "")
      const result = await validateTransfer(db, req, user)
      if ("error" in result) {
        res.status(result.status ?? 400).json({ message: result.error, code: result.code })
        return
      }

      const { preview, from, customerId } = result
      if (preview.amount >= REAUTH_THRESHOLD && !req.body?.reauthConfirmed) {
        res.status(403).json({
          message: "Re-authentication required for transfers at or above ₹50,000",
          code: "REAUTH_REQUIRED",
        })
        return
      }

      const id = randomUUID()
      const ref = idempotencyKey || transferRef()
      const when = preview.scheduledFor ? new Date(preview.scheduledFor) : null
      const isScheduled = Boolean(when && when.getTime() > Date.now() + 60_000)

      if (simulate === "fail") {
        await db
          .prepare(
            `INSERT INTO transfers (id, transfer_ref, customer_id, from_account_id, to_account_id, beneficiary_id, amount, remarks, transfer_type, status, scheduled_for, frequency, failure_reason, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'failed', ?, ?, ?, ?)`,
          )
          .run(
            id,
            ref,
            customerId,
            preview.fromAccountId,
            preview.toAccountId,
            preview.beneficiaryId,
            preview.amount,
            preview.remarks,
            preview.transferType,
            when?.toISOString() ?? null,
            preview.frequency,
            "Simulated network failure",
            user.username,
          )
        res.status(502).json({ message: "Transfer failed due to simulated network error", code: "TRANSFER_FAILED", transferRef: ref, id })
        return
      }

      if (simulate === "timeout") {
        res.status(504).json({ message: "Transfer timed out (simulated). Check status before retrying.", code: "TRANSFER_TIMEOUT" })
        return
      }

      const status = isScheduled ? "pending" : "completed"
      await db
        .prepare(
          `INSERT INTO transfers (id, transfer_ref, customer_id, from_account_id, to_account_id, beneficiary_id, amount, remarks, transfer_type, status, scheduled_for, frequency, created_by, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          ref,
          customerId,
          preview.fromAccountId,
          preview.toAccountId,
          preview.beneficiaryId,
          preview.amount,
          preview.remarks,
          preview.transferType,
          status,
          when?.toISOString() ?? null,
          preview.frequency,
          user.username,
          status === "completed" ? new Date().toISOString() : null,
        )

      if (status === "completed") {
        await applyTransferBalances(db, preview, from, id, ref)
      }

      await db
        .prepare("INSERT INTO notifications (id, username, title, body, read) VALUES (?, ?, ?, ?, FALSE)")
        .run(randomUUID(), user.username, status === "completed" ? "Transfer successful" : "Transfer scheduled", `Reference ${ref} for ₹${preview.amount}`)

      await logActivity(db, {
        entityType: "transfer",
        entityId: id,
        action: status === "completed" ? "complete" : "schedule",
        details: ref,
        actor: user.username,
      })

      res.status(201).json({
        id,
        transferRef: ref,
        status,
        amount: preview.amount,
        fromAccount: maskAccount(from.account_no),
        toLabel: preview.toLabel,
        remarks: preview.remarks,
        completedAt: status === "completed" ? new Date().toISOString() : null,
        scheduledFor: when?.toISOString() ?? null,
      })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/banking/transfers", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "transfers", "view")
      if (!user) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const customerId = await resolveCustomerScope(db, user)
      const status = String(req.query.status ?? "").trim()
      const where: string[] = ["TRUE"]
      const params: unknown[] = []
      if (customerId) {
        where.push("t.customer_id = ?")
        params.push(customerId)
      }
      if (status) {
        where.push("t.status = ?")
        params.push(status)
      }
      if (q) {
        where.push("(LOWER(t.transfer_ref) LIKE ? OR LOWER(t.remarks) LIKE ?)")
        params.push(`%${q}%`, `%${q}%`)
      }
      const whereSql = where.join(" AND ")
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM transfers t WHERE ${whereSql}`, params)
      const rows = await db.query(
        `SELECT t.id, t.transfer_ref AS "transferRef", t.amount::float AS amount, t.remarks, t.transfer_type AS "transferType",
                t.status, t.frequency, t.scheduled_for AS "scheduledFor", t.created_at AS "createdAt", t.completed_at AS "completedAt",
                fa.account_no AS "fromAccountNo", fa.nickname AS "fromNickname",
                COALESCE(ta.account_no, b.account_no) AS "toAccountNo",
                COALESCE(ta.nickname, b.name) AS "toLabel"
         FROM transfers t
         JOIN accounts fa ON fa.id = t.from_account_id
         LEFT JOIN accounts ta ON ta.id = t.to_account_id
         LEFT JOIN beneficiaries b ON b.id = t.beneficiary_id
         WHERE ${whereSql}
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/banking/transfers/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "transfers", "view")
      if (!user) return
      const customerId = await resolveCustomerScope(db, user)
      const rows = await db.query(
        `SELECT t.*, fa.account_no AS "fromAccountNo", fa.nickname AS "fromNickname",
                COALESCE(ta.account_no, b.account_no) AS "toAccountNo",
                COALESCE(ta.nickname, b.name) AS "toLabel",
                b.bank_name AS "bankName", b.ifsc
         FROM transfers t
         JOIN accounts fa ON fa.id = t.from_account_id
         LEFT JOIN accounts ta ON ta.id = t.to_account_id
         LEFT JOIN beneficiaries b ON b.id = t.beneficiary_id
         WHERE t.id = ? ${customerId && user.role === "customer" ? "AND t.customer_id = ?" : ""}`,
        customerId && user.role === "customer" ? [req.params.id, customerId] : [req.params.id],
      )
      if (!rows[0]) {
        res.status(404).json({ message: "Transfer not found" })
        return
      }
      const row = rows[0] as Record<string, unknown>
      res.json({
        id: row.id,
        transferRef: row.transfer_ref,
        amount: Number(row.amount),
        remarks: row.remarks,
        transferType: row.transfer_type,
        status: row.status,
        frequency: row.frequency,
        scheduledFor: row.scheduled_for,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        failureReason: row.failure_reason,
        fromAccountNo: row.fromAccountNo,
        fromNickname: row.fromNickname,
        toAccountNo: row.toAccountNo,
        toLabel: row.toLabel,
        bankName: row.bankName,
        ifsc: row.ifsc,
      })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/banking/transfers/:id/cancel", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "transfers", "edit")
      if (!user) return
      const rows = await db.query<{ id: string; status: string; customer_id: string }>(
        "SELECT id, status, customer_id FROM transfers WHERE id = ?",
        [req.params.id],
      )
      const t = rows[0]
      if (!t) {
        res.status(404).json({ message: "Transfer not found" })
        return
      }
      const customerId = await resolveCustomerScope(db, user)
      if (user.role === "customer" && t.customer_id !== customerId) {
        res.status(404).json({ message: "Transfer not found" })
        return
      }
      if (t.status !== "pending") {
        res.status(400).json({ message: "Only pending transfers can be cancelled" })
        return
      }
      await db.prepare("UPDATE transfers SET status = 'cancelled' WHERE id = ?").run(req.params.id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/banking/statements", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "statements", "view")
      if (!user) return
      const accountId = String(req.query.accountId ?? "").trim()
      if (!accountId) {
        res.status(400).json({ message: "accountId is required" })
        return
      }
      const customerId = await resolveCustomerScope(db, user)
      const access = await assertAccountAccess(db, accountId, customerId, user.role)
      if ("error" in access && access.error) {
        res.status(404).json({ message: access.error })
        return
      }

      const period = String(req.query.period ?? "30d")
      const { start, end } = periodBounds(period, String(req.query.from ?? ""), String(req.query.to ?? ""))
      const { page, pageSize, offset, q } = parsePaging(req)
      const txnType = String(req.query.txnType ?? "").trim()
      const status = String(req.query.status ?? "").trim()
      const category = String(req.query.category ?? "").trim()
      const sort = String(req.query.sort ?? "date_desc")

      const where = ["t.account_id = ?", "t.created_at >= ?", "t.created_at <= ?"]
      const params: unknown[] = [accountId, start.toISOString(), end.toISOString()]
      if (txnType) {
        where.push("t.txn_type = ?")
        params.push(txnType)
      }
      if (status) {
        where.push("t.status = ?")
        params.push(status)
      }
      if (category) {
        where.push("t.category = ?")
        params.push(category)
      }
      if (q) {
        where.push("(LOWER(t.description) LIKE ? OR LOWER(t.txn_ref) LIKE ?)")
        params.push(`%${q}%`, `%${q}%`)
      }
      const whereSql = where.join(" AND ")
      const order =
        sort === "amount_asc"
          ? "t.amount ASC"
          : sort === "amount_desc"
            ? "t.amount DESC"
            : sort === "date_asc"
              ? "t.created_at ASC"
              : "t.created_at DESC"

      const totals = await db.query<{ credits: number; debits: number; n: number }>(
        `SELECT COALESCE(SUM(CASE WHEN txn_type='credit' THEN amount ELSE 0 END),0)::float AS credits,
                COALESCE(SUM(CASE WHEN txn_type='debit' THEN amount ELSE 0 END),0)::float AS debits,
                COUNT(*)::int AS n
         FROM transactions t WHERE ${whereSql}`,
        params,
      )
      const rows = await db.query(
        `SELECT t.id, t.txn_ref AS "txnRef", t.txn_type AS "txnType", t.category, t.description,
                t.amount::float AS amount, t.balance_after::float AS "balanceAfter", t.status,
                t.counterpart_name AS "counterpartName", t.counterpart_account AS "counterpartAccount",
                t.created_at AS "createdAt"
         FROM transactions t
         WHERE ${whereSql}
         ORDER BY ${order}
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )

      const opening = await db.query<{ balance_after: number }>(
        `SELECT balance_after::float AS balance_after FROM transactions
         WHERE account_id = ? AND created_at < ?
         ORDER BY created_at DESC LIMIT 1`,
        [accountId, start.toISOString()],
      )
      const credits = Number(totals[0]?.credits ?? 0)
      const debits = Number(totals[0]?.debits ?? 0)
      const openingBalance = Number(opening[0]?.balance_after ?? access.acc!.available_balance)
      const closingBalance = openingBalance + credits - debits

      res.json({
        account: {
          id: access.acc!.id,
          accountNo: access.acc!.account_no,
          nickname: access.acc!.nickname,
          maskedAccountNo: maskAccount(access.acc!.account_no),
        },
        period: { from: start.toISOString(), to: end.toISOString(), label: period },
        summary: { openingBalance, totalCredits: credits, totalDebits: debits, closingBalance },
        data: rows,
        total: Number(totals[0]?.n ?? 0),
        page,
        pageSize,
      })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/banking/transactions/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "statements", "view")
      if (!user) return
      const customerId = await resolveCustomerScope(db, user)
      const rows = await db.query(
        `SELECT t.id, t.txn_ref AS "txnRef", t.txn_type AS "txnType", t.category, t.description,
                t.amount::float AS amount, t.balance_after::float AS "balanceAfter", t.status,
                t.counterpart_name AS "counterpartName", t.counterpart_account AS "counterpartAccount",
                t.created_at AS "createdAt", a.account_no AS "accountNo", a.nickname
         FROM transactions t
         JOIN accounts a ON a.id = t.account_id
         WHERE t.id = ? ${customerId && user.role === "customer" ? "AND a.customer_id = ?" : ""}`,
        customerId && user.role === "customer" ? [req.params.id, customerId] : [req.params.id],
      )
      if (!rows[0]) {
        res.status(404).json({ message: "Transaction not found" })
        return
      }
      res.json(rows[0])
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/banking/scheduled", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "scheduled", "view")
      if (!user) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const customerId = await resolveCustomerScope(db, user)
      const status = String(req.query.status ?? "").trim()
      const where: string[] = ["s.deleted_at IS NULL"]
      const params: unknown[] = []
      if (customerId) {
        where.push("s.customer_id = ?")
        params.push(customerId)
      }
      if (status) {
        where.push("s.status = ?")
        params.push(status)
      }
      if (q) {
        where.push("(LOWER(s.schedule_no) LIKE ? OR LOWER(s.remarks) LIKE ? OR LOWER(b.name) LIKE ?)")
        params.push(`%${q}%`, `%${q}%`, `%${q}%`)
      }
      const whereSql = where.join(" AND ")
      const total = await db.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM scheduled_payments s JOIN beneficiaries b ON b.id = s.beneficiary_id WHERE ${whereSql}`,
        params,
      )
      const rows = await db.query(
        `SELECT s.id, s.schedule_no AS "scheduleNo", s.amount::float AS amount, s.remarks,
                s.execute_date AS "executeDate", s.execute_time AS "executeTime", s.frequency, s.status,
                s.next_run AS "nextRun", a.account_no AS "fromAccountNo", a.nickname AS "fromNickname",
                b.name AS "beneficiaryName", b.account_no AS "beneficiaryAccount"
         FROM scheduled_payments s
         JOIN accounts a ON a.id = s.from_account_id
         JOIN beneficiaries b ON b.id = s.beneficiary_id
         WHERE ${whereSql}
         ORDER BY s.execute_date ASC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/banking/scheduled", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "scheduled", "create")
      if (!user) return
      const customerId = (await resolveCustomerScope(db, user)) ?? (await customerForUser(db, user.username))?.id
      if (!customerId) {
        res.status(400).json({ message: "No customer profile" })
        return
      }
      const fromAccountId = String(req.body?.fromAccountId ?? "")
      const beneficiaryId = String(req.body?.beneficiaryId ?? "")
      const amount = Number(req.body?.amount)
      const executeDate = String(req.body?.executeDate ?? "")
      const executeTime = String(req.body?.executeTime ?? "09:00")
      const frequency = String(req.body?.frequency ?? "once")
      const remarks = String(req.body?.remarks ?? "").trim()

      if (!fromAccountId || !beneficiaryId) {
        res.status(400).json({ message: "Source account and beneficiary are required" })
        return
      }
      if (!(amount > 0)) {
        res.status(400).json({ message: "Amount must be greater than zero" })
        return
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(executeDate)) {
        res.status(400).json({ message: "Valid execute date is required" })
        return
      }
      const access = await assertAccountAccess(db, fromAccountId, customerId, user.role)
      if ("error" in access && access.error) {
        res.status(404).json({ message: access.error })
        return
      }
      if (access.acc!.status !== "active") {
        res.status(400).json({ message: "Source account is not active" })
        return
      }

      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM scheduled_payments")
      const id = randomUUID()
      const scheduleNo = `SCH${pad(Number(count[0]?.n ?? 0) + 1, 4)}`
      const nextRun = new Date(`${executeDate}T${executeTime.length === 5 ? `${executeTime}:00` : executeTime}`)
      await db
        .prepare(
          `INSERT INTO scheduled_payments (id, schedule_no, customer_id, from_account_id, beneficiary_id, amount, remarks, execute_date, execute_time, frequency, status, next_run)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
        )
        .run(id, scheduleNo, customerId, fromAccountId, beneficiaryId, amount, remarks, executeDate, executeTime, frequency, nextRun.toISOString())
      res.status(201).json({ id, scheduleNo })
    } catch (error) {
      next(error)
    }
  })

  app.patch("/api/banking/scheduled/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "scheduled", "edit")
      if (!user) return
      const customerId = await resolveCustomerScope(db, user)
      const rows = await db.query<{ id: string; customer_id: string; status: string }>(
        "SELECT id, customer_id, status FROM scheduled_payments WHERE id = ? AND deleted_at IS NULL",
        [req.params.id],
      )
      if (!rows[0] || (user.role === "customer" && rows[0].customer_id !== customerId)) {
        res.status(404).json({ message: "Scheduled payment not found" })
        return
      }
      if (rows[0].status !== "scheduled") {
        res.status(400).json({ message: "Only scheduled payments can be edited" })
        return
      }
      const amount = req.body?.amount != null ? Number(req.body.amount) : null
      const executeDate = req.body?.executeDate ? String(req.body.executeDate) : null
      const executeTime = req.body?.executeTime ? String(req.body.executeTime) : null
      const frequency = req.body?.frequency ? String(req.body.frequency) : null
      const remarks = req.body?.remarks != null ? String(req.body.remarks) : null
      await db
        .prepare(
          `UPDATE scheduled_payments SET
             amount = COALESCE(?, amount),
             execute_date = COALESCE(?, execute_date),
             execute_time = COALESCE(?, execute_time),
             frequency = COALESCE(?, frequency),
             remarks = COALESCE(?, remarks),
             updated_at = NOW()
           WHERE id = ?`,
        )
        .run(amount, executeDate, executeTime, frequency, remarks, req.params.id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/banking/scheduled/:id/cancel", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "scheduled", "edit")
      if (!user) return
      const customerId = await resolveCustomerScope(db, user)
      const rows = await db.query<{ id: string; customer_id: string; status: string }>(
        "SELECT id, customer_id, status FROM scheduled_payments WHERE id = ? AND deleted_at IS NULL",
        [req.params.id],
      )
      if (!rows[0] || (user.role === "customer" && rows[0].customer_id !== customerId)) {
        res.status(404).json({ message: "Scheduled payment not found" })
        return
      }
      if (rows[0].status !== "scheduled") {
        res.status(400).json({ message: "Only scheduled payments can be cancelled" })
        return
      }
      await db.prepare("UPDATE scheduled_payments SET status = 'cancelled', updated_at = NOW() WHERE id = ?").run(req.params.id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/banking/profile", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "profile", "view")
      if (!user) return
      const customer = await customerForUser(db, user.username)
      const settings = await db.query(
        `SELECT date_format AS "dateFormat", time_format AS "timeFormat",
                notify_email AS "notifyEmail", notify_sms AS "notifySms", notify_push AS "notifyPush",
                phone_masked AS "phoneMasked", email_masked AS "emailMasked"
         FROM profile_settings WHERE username = ?`,
        [user.username],
      )
      const loginActivity = await db.query(
        `SELECT id, ip, user_agent AS "userAgent", success, created_at AS "createdAt"
         FROM login_activity WHERE username = ? ORDER BY created_at DESC LIMIT 10`,
        [user.username],
      )
      const detail = customer
        ? (
            await db.query(
              `SELECT id, full_name AS "fullName", customer_no AS "customerNo", email, phone, address, city,
                      branch_code AS "branchCode", branch_name AS "branchName", kyc_status AS "kycStatus",
                      date_of_birth AS "dateOfBirth"
               FROM customers WHERE id = ?`,
              [customer.id],
            )
          )[0]
        : { fullName: user.name, customerNo: null }
      res.json({ user: { username: user.username, role: user.role, name: user.name }, customer: detail, settings: settings[0] ?? null, loginActivity })
    } catch (error) {
      next(error)
    }
  })

  app.patch("/api/banking/profile", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "profile", "edit")
      if (!user) return
      const address = req.body?.address != null ? String(req.body.address).trim() : null
      if (address != null) {
        await db.prepare("UPDATE customers SET address = ? WHERE username = ?").run(address, user.username)
      }
      await db
        .prepare(
          `INSERT INTO profile_settings (username, date_format, time_format, notify_email, notify_sms, notify_push)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (username) DO UPDATE SET
             date_format = EXCLUDED.date_format,
             time_format = EXCLUDED.time_format,
             notify_email = EXCLUDED.notify_email,
             notify_sms = EXCLUDED.notify_sms,
             notify_push = EXCLUDED.notify_push,
             updated_at = NOW()`,
        )
        .run(
          user.username,
          String(req.body?.dateFormat ?? "dd-MMM-yyyy"),
          String(req.body?.timeFormat ?? "hh:mm a"),
          Boolean(req.body?.notifyEmail ?? true),
          Boolean(req.body?.notifySms ?? true),
          Boolean(req.body?.notifyPush ?? false),
        )
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/banking/profile/change-password", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "profile", "edit")
      if (!user) return
      const current = String(req.body?.currentPassword ?? "")
      const nextPassword = String(req.body?.newPassword ?? "")
      const row = await db.query<{ password: string }>("SELECT password FROM users WHERE username = ?", [user.username])
      if (!row[0] || row[0].password !== current) {
        res.status(400).json({ message: "Current password is incorrect", field: "currentPassword" })
        return
      }
      if (nextPassword.length < 6) {
        res.status(400).json({ message: "New password must be at least 6 characters", field: "newPassword" })
        return
      }
      await db.prepare("UPDATE users SET password = ? WHERE username = ?").run(nextPassword, user.username)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/banking/lookups", async (req, res, next) => {
    try {
      const user = await requireUser(db, req, res)
      if (!user) return
      const customerId = await resolveCustomerScope(db, user)
      const accounts = await db.query(
        `SELECT id, account_no AS "accountNo", account_type AS "accountType", nickname, available_balance::float AS "availableBalance", status
         FROM accounts WHERE deleted_at IS NULL AND status = 'active' ${customerId ? "AND customer_id = ?" : ""}
         ORDER BY nickname`,
        customerId ? [customerId] : [],
      )
      const beneficiaries = await db.query(
        `SELECT id, name, account_no AS "accountNo", bank_name AS "bankName", nickname, bank_type AS "bankType"
         FROM beneficiaries WHERE deleted_at IS NULL AND status = 'active' ${customerId ? "AND customer_id = ?" : ""}
         ORDER BY is_favorite DESC, name`,
        customerId ? [customerId] : [],
      )
      const ownAccounts = await db.query(
        `SELECT id, account_no AS "accountNo", nickname, account_type AS "accountType"
         FROM accounts WHERE deleted_at IS NULL AND status = 'active' ${customerId ? "AND customer_id = ?" : ""}`,
        customerId ? [customerId] : [],
      )
      res.json({ accounts, beneficiaries, ownAccounts })
    } catch (error) {
      next(error)
    }
  })
}

function pad(n: number, w = 4) {
  return String(n).padStart(w, "0")
}

type TransferPreview = {
  fromAccountId: string
  toAccountId: string | null
  beneficiaryId: string | null
  amount: number
  remarks: string
  transferType: string
  frequency: string
  scheduledFor: string | null
  toLabel: string
  availableBalance: number
}

async function validateTransfer(db: AppDatabase, req: Request, user: { username: string; role: string; name: string }) {
  const customerId = (await resolveCustomerScope(db, user)) ?? (await customerForUser(db, user.username))?.id
  if (!customerId) return { error: "No customer profile linked to this user", status: 400, code: "NO_CUSTOMER" }

  const fromAccountId = String(req.body?.fromAccountId ?? "")
  const toAccountId = req.body?.toAccountId ? String(req.body.toAccountId) : null
  const beneficiaryId = req.body?.beneficiaryId ? String(req.body.beneficiaryId) : null
  const amount = Number(req.body?.amount)
  const remarks = String(req.body?.remarks ?? "").trim()
  const frequency = String(req.body?.frequency ?? "once")
  const scheduledFor = req.body?.scheduledFor ? String(req.body.scheduledFor) : null
  const transferType = String(req.body?.transferType ?? (toAccountId ? "own" : beneficiaryId ? "external" : ""))

  if (!fromAccountId) return { error: "Source account is required", status: 400, code: "VALIDATION" }
  if (!(amount > 0)) return { error: "Enter a valid transfer amount", status: 400, code: "INVALID_AMOUNT" }
  if (amount > DAILY_LIMIT) return { error: `Amount exceeds daily limit of ₹${DAILY_LIMIT.toLocaleString("en-IN")}`, status: 400, code: "LIMIT" }
  if (!toAccountId && !beneficiaryId) return { error: "Select a destination account or beneficiary", status: 400, code: "VALIDATION" }
  if (toAccountId && toAccountId === fromAccountId) return { error: "Source and destination cannot be the same", status: 400, code: "VALIDATION" }

  const access = await assertAccountAccess(db, fromAccountId, customerId, user.role)
  if ("error" in access && access.error) return { error: access.error, status: 404, code: "NOT_FOUND" }
  const from = access.acc!
  if (from.status !== "active") return { error: "Source account is not active", status: 400, code: "ACCOUNT_STATUS" }
  if (Number(from.available_balance) < amount) {
    return { error: "Insufficient available balance", status: 400, code: "INSUFFICIENT_FUNDS" }
  }

  let toLabel = ""
  let resolvedType = transferType
  let resolvedBen: string | null = beneficiaryId
  let resolvedTo: string | null = toAccountId

  if (toAccountId) {
    const dest = await assertAccountAccess(db, toAccountId, customerId, user.role)
    if ("error" in dest && dest.error) return { error: "Destination account not found", status: 404, code: "NOT_FOUND" }
    toLabel = dest.acc!.nickname || dest.acc!.account_no
    resolvedType = "own"
    resolvedBen = null
  } else if (beneficiaryId) {
    const bens = await db.query<{ id: string; name: string; bank_type: string; customer_id: string; account_no: string }>(
      "SELECT id, name, bank_type, customer_id, account_no FROM beneficiaries WHERE id = ? AND deleted_at IS NULL",
      [beneficiaryId],
    )
    const ben = bens[0]
    if (!ben || (user.role === "customer" && ben.customer_id !== customerId)) {
      return { error: "Beneficiary not found", status: 404, code: "NOT_FOUND" }
    }
    toLabel = ben.name
    resolvedType = ben.bank_type === "same_bank" ? "internal" : "external"
    resolvedTo = null
    const internal = await db.query<{ id: string }>("SELECT id FROM accounts WHERE account_no = ? AND deleted_at IS NULL", [ben.account_no])
    if (internal[0] && ben.bank_type === "same_bank") resolvedTo = internal[0].id
  }

  const preview: TransferPreview = {
    fromAccountId,
    toAccountId: resolvedTo,
    beneficiaryId: resolvedBen,
    amount,
    remarks,
    transferType: resolvedType,
    frequency,
    scheduledFor,
    toLabel,
    availableBalance: Number(from.available_balance),
  }
  return { preview, from, customerId }
}

async function applyTransferBalances(
  db: AppDatabase,
  preview: TransferPreview,
  from: { id: string; available_balance: number; account_no: string },
  transferId: string,
  ref: string,
) {
  const debitBal = Number(from.available_balance) - preview.amount
  await db.prepare("UPDATE accounts SET balance = ?, available_balance = ? WHERE id = ?").run(debitBal, debitBal, from.id)
  await db
    .prepare(
      `INSERT INTO transactions (id, account_id, txn_ref, txn_type, category, description, amount, balance_after, status, counterpart_name, counterpart_account, transfer_id)
       VALUES (?, ?, ?, 'debit', 'transfer', ?, ?, ?, 'completed', ?, ?, ?)`,
    )
    .run(randomUUID(), from.id, txnRef(), `Transfer to ${preview.toLabel} (${ref})`, preview.amount, debitBal, preview.toLabel, null, transferId)

  if (preview.toAccountId) {
    const dest = await db.query<{ available_balance: number }>(
      "SELECT available_balance::float AS available_balance FROM accounts WHERE id = ?",
      [preview.toAccountId],
    )
    const creditBal = Number(dest[0]?.available_balance ?? 0) + preview.amount
    await db.prepare("UPDATE accounts SET balance = ?, available_balance = ? WHERE id = ?").run(creditBal, creditBal, preview.toAccountId)
    await db
      .prepare(
        `INSERT INTO transactions (id, account_id, txn_ref, txn_type, category, description, amount, balance_after, status, counterpart_name, counterpart_account, transfer_id)
         VALUES (?, ?, ?, 'credit', 'transfer', ?, ?, ?, 'completed', ?, ?, ?)`,
      )
      .run(randomUUID(), preview.toAccountId, txnRef(), `Transfer from ${from.account_no} (${ref})`, preview.amount, creditBal, from.account_no, from.account_no, transferId)
  }
}
