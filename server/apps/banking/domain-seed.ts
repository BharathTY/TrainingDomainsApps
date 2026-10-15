import { randomUUID } from "node:crypto"
import { faker } from "@faker-js/faker"
import type { AppDatabase } from "../../shared/db"
import { BANKING_CLEAR, BANKING_TABLES } from "./schema"

faker.seed(42)

export async function ensureBankingSchema(db: AppDatabase) {
  for (const sql of BANKING_TABLES) await db.exec(sql)
}

export async function bankingIsSeeded(db: AppDatabase) {
  const rows = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM accounts")
  return Number(rows[0]?.n ?? 0) > 0
}

function pad(n: number, w = 4) {
  return String(n).padStart(w, "0")
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

export async function seedBankingDomain(db: AppDatabase) {
  for (const table of BANKING_CLEAR) await db.exec(`DELETE FROM ${table}`)

  const customers = [
    {
      id: "cust-1",
      username: "priya",
      customer_no: "CIF10001",
      full_name: "Priya Sharma",
      email: "priya.sharma@demo.bank",
      phone: "9876543210",
      address: "12, 100 Feet Road, Indiranagar",
      branch_code: "BLR001",
      branch_name: "Indiranagar Branch",
    },
    {
      id: "cust-2",
      username: "arjun",
      customer_no: "CIF10002",
      full_name: "Arjun Mehta",
      email: "arjun.mehta@demo.bank",
      phone: "9988776655",
      address: "45, Koramangala 5th Block",
      branch_code: "BLR002",
      branch_name: "Koramangala Branch",
    },
    {
      id: "cust-3",
      username: "admin",
      customer_no: "CIF10003",
      full_name: "Banking Admin",
      email: "admin@demo.bank",
      phone: "9000012345",
      address: "Head Office, MG Road",
      branch_code: "BLR000",
      branch_name: "Head Office",
    },
  ]

  for (const c of customers) {
    await db
      .prepare(
        `INSERT INTO customers (id, username, customer_no, full_name, email, phone, address, city, branch_code, branch_name, kyc_status, date_of_birth)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Bengaluru', ?, ?, 'verified', ?)`,
      )
      .run(
        c.id,
        c.username,
        c.customer_no,
        c.full_name,
        c.email,
        c.phone,
        c.address,
        c.branch_code,
        c.branch_name,
        faker.date.birthdate({ min: 25, max: 55, mode: "age" }).toISOString().slice(0, 10),
      )

    await db
      .prepare(
        `INSERT INTO profile_settings (username, date_format, time_format, notify_email, notify_sms, notify_push, phone_masked, email_masked)
         VALUES (?, 'dd-MMM-yyyy', 'hh:mm a', TRUE, TRUE, FALSE, ?, ?)`,
      )
      .run(c.username, `******${c.phone.slice(-4)}`, `${c.email.slice(0, 2)}***@demo.bank`)
  }

  type AccSeed = {
    id: string
    customer_id: string
    account_no: string
    account_type: string
    nickname: string
    balance: number
    status: string
    favorite: boolean
    rate: number
    maturity?: string | null
  }

  const accounts: AccSeed[] = [
    { id: "acc-1", customer_id: "cust-1", account_no: "501100220001", account_type: "savings", nickname: "Everyday savings", balance: 125000, status: "active", favorite: true, rate: 3.5 },
    { id: "acc-2", customer_id: "cust-1", account_no: "501100220002", account_type: "current", nickname: "Business current", balance: 48000, status: "active", favorite: false, rate: 0 },
    { id: "acc-3", customer_id: "cust-1", account_no: "501100220003", account_type: "salary", nickname: "Salary account", balance: 82000, status: "active", favorite: true, rate: 3.0 },
    { id: "acc-4", customer_id: "cust-1", account_no: "501100220004", account_type: "fixed_deposit", nickname: "FD 2025", balance: 200000, status: "active", favorite: false, rate: 6.8, maturity: "2027-03-15" },
    { id: "acc-5", customer_id: "cust-2", account_no: "501100330001", account_type: "savings", nickname: "Primary savings", balance: 56000, status: "active", favorite: true, rate: 3.5 },
    { id: "acc-6", customer_id: "cust-2", account_no: "501100330002", account_type: "current", nickname: "Ops current", balance: 15000, status: "active", favorite: false, rate: 0 },
    { id: "acc-7", customer_id: "cust-2", account_no: "501100330003", account_type: "salary", nickname: "Payroll", balance: 41000, status: "frozen", favorite: false, rate: 3.0 },
    { id: "acc-8", customer_id: "cust-3", account_no: "501100990001", account_type: "savings", nickname: "Admin float", balance: 500000, status: "active", favorite: true, rate: 3.5 },
    { id: "acc-9", customer_id: "cust-1", account_no: "501100220009", account_type: "savings", nickname: "Closed nest", balance: 0, status: "closed", favorite: false, rate: 0 },
  ]

  for (const a of accounts) {
    await db
      .prepare(
        `INSERT INTO accounts (id, customer_id, account_no, account_type, nickname, balance, available_balance, status, is_favorite, interest_rate, opened_at, maturity_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        a.id,
        a.customer_id,
        a.account_no,
        a.account_type,
        a.nickname,
        a.balance,
        a.status === "frozen" || a.status === "closed" ? 0 : a.balance,
        a.status,
        a.favorite,
        a.rate,
        daysAgo(faker.number.int({ min: 90, max: 900 })).toISOString().slice(0, 10),
        a.maturity ?? null,
      )
  }

  const beneficiaries = [
    { id: "ben-1", customer_id: "cust-1", name: "Arjun Mehta", account_no: "501100330001", bank_name: "Demo National Bank", ifsc: "DEMO0001001", bank_type: "same_bank", nickname: "Arjun", fav: true },
    { id: "ben-2", customer_id: "cust-1", name: "Neha Reddy", account_no: "882200110045", bank_name: "Horizon Bank", ifsc: "HORZ0002211", bank_type: "other_bank", nickname: "Neha rent", fav: false },
    { id: "ben-3", customer_id: "cust-1", name: "Power Grid Ltd", account_no: "998800110022", bank_name: "Utility Bank", ifsc: "UTIL0003344", bank_type: "other_bank", nickname: "Electricity", fav: true },
    { id: "ben-4", customer_id: "cust-2", name: "Priya Sharma", account_no: "501100220001", bank_name: "Demo National Bank", ifsc: "DEMO0001001", bank_type: "same_bank", nickname: "Priya", fav: true },
    { id: "ben-5", customer_id: "cust-2", name: "Asha Mehta", account_no: "776655443322", bank_name: "Coastal Bank", ifsc: "COAS0005566", bank_type: "other_bank", nickname: "Mom", fav: false },
  ]

  for (const b of beneficiaries) {
    await db
      .prepare(
        `INSERT INTO beneficiaries (id, customer_id, name, account_no, bank_name, ifsc, bank_type, nickname, is_favorite, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      )
      .run(b.id, b.customer_id, b.name, b.account_no, b.bank_name, b.ifsc, b.bank_type, b.nickname, b.fav)
  }

  const categories = ["transfer", "salary", "interest", "fee", "refund", "bill", "atm", "other"] as const
  const statuses = ["completed", "completed", "completed", "pending", "failed", "cancelled"] as const

  let txnSeq = 1
  for (const acc of accounts.filter((a) => a.status !== "closed")) {
    let running = Math.max(5000, acc.balance - faker.number.int({ min: 10000, max: 40000 }))
    for (let i = 0; i < 40; i++) {
      const isCredit = faker.datatype.boolean()
      const amount = faker.number.int({ min: 200, max: 25000 })
      running = isCredit ? running + amount : Math.max(0, running - amount)
      const when = daysAgo(faker.number.int({ min: 0, max: 90 }))
      when.setHours(faker.number.int({ min: 8, max: 20 }), faker.number.int({ min: 0, max: 59 }), 0, 0)
      const status = i === 0 ? "completed" : faker.helpers.arrayElement(statuses)
      await db
        .prepare(
          `INSERT INTO transactions (id, account_id, txn_ref, txn_type, category, description, amount, balance_after, status, counterpart_name, counterpart_account, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          acc.id,
          `TXN${pad(txnSeq++, 6)}`,
          isCredit ? "credit" : "debit",
          faker.helpers.arrayElement(categories),
          faker.helpers.arrayElement([
            "UPI transfer",
            "NEFT credit",
            "ATM withdrawal",
            "Salary credit",
            "Interest credit",
            "Bill payment",
            "Card refund",
            "Branch deposit",
            "IMPS debit",
            "Service fee",
          ]),
          amount,
          running,
          status,
          faker.person.fullName(),
          faker.finance.accountNumber(12),
          when.toISOString(),
        )
    }
    await db.prepare("UPDATE accounts SET balance = ?, available_balance = ? WHERE id = ?").run(
      acc.balance,
      acc.status === "active" ? acc.balance : 0,
      acc.id,
    )
  }

  const transfers = [
    { id: "trf-1", customer_id: "cust-1", from: "acc-1", to: "acc-2", ben: null, amount: 5000, type: "own", status: "completed", freq: "once" },
    { id: "trf-2", customer_id: "cust-1", from: "acc-3", to: null, ben: "ben-2", amount: 12000, type: "external", status: "completed", freq: "once" },
    { id: "trf-3", customer_id: "cust-1", from: "acc-1", to: null, ben: "ben-1", amount: 2500, type: "internal", status: "pending", freq: "once" },
    { id: "trf-4", customer_id: "cust-2", from: "acc-5", to: null, ben: "ben-4", amount: 3000, type: "internal", status: "failed", freq: "once" },
    { id: "trf-5", customer_id: "cust-1", from: "acc-2", to: null, ben: "ben-3", amount: 1800, type: "external", status: "cancelled", freq: "monthly" },
  ]

  for (const t of transfers) {
    const ref = `TRF${pad(transfers.indexOf(t) + 1, 5)}`
    await db
      .prepare(
        `INSERT INTO transfers (id, transfer_ref, customer_id, from_account_id, to_account_id, beneficiary_id, amount, remarks, transfer_type, status, frequency, failure_reason, created_by, created_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        t.id,
        ref,
        t.customer_id,
        t.from,
        t.to,
        t.ben,
        t.amount,
        faker.lorem.words(3),
        t.type,
        t.status,
        t.freq,
        t.status === "failed" ? "Beneficiary bank unavailable (simulated)" : null,
        t.customer_id === "cust-1" ? "priya" : "arjun",
        daysAgo(faker.number.int({ min: 1, max: 20 })).toISOString(),
        t.status === "completed" ? daysAgo(faker.number.int({ min: 0, max: 10 })).toISOString() : null,
      )
  }

  const schedules = [
    { id: "sch-1", no: "SCH0001", customer_id: "cust-1", from: "acc-1", ben: "ben-2", amount: 15000, status: "scheduled", freq: "monthly", days: 5 },
    { id: "sch-2", no: "SCH0002", customer_id: "cust-1", from: "acc-3", ben: "ben-3", amount: 2200, status: "scheduled", freq: "weekly", days: 2 },
    { id: "sch-3", no: "SCH0003", customer_id: "cust-1", from: "acc-1", ben: "ben-1", amount: 1000, status: "completed", freq: "once", days: -3 },
    { id: "sch-4", no: "SCH0004", customer_id: "cust-2", from: "acc-5", ben: "ben-5", amount: 5000, status: "cancelled", freq: "once", days: 10 },
    { id: "sch-5", no: "SCH0005", customer_id: "cust-2", from: "acc-6", ben: "ben-4", amount: 800, status: "failed", freq: "daily", days: 1 },
  ]

  for (const s of schedules) {
    const exec = daysAgo(-s.days)
    await db
      .prepare(
        `INSERT INTO scheduled_payments (id, schedule_no, customer_id, from_account_id, beneficiary_id, amount, remarks, execute_date, execute_time, frequency, status, next_run)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, '09:30', ?, ?, ?)`,
      )
      .run(
        s.id,
        s.no,
        s.customer_id,
        s.from,
        s.ben,
        s.amount,
        "Scheduled payment",
        exec.toISOString().slice(0, 10),
        s.freq,
        s.status,
        s.status === "scheduled" ? exec.toISOString() : null,
      )
  }

  const announcements = [
    { title: "Scheduled maintenance", body: "Internet banking will be unavailable Sunday 02:00–04:00 IST for maintenance.", severity: "warning" },
    { title: "New UPI limits", body: "Daily UPI limit for savings accounts is ₹1,00,000 for this demo environment.", severity: "info" },
    { title: "Phishing alert", body: "Demo Bank will never ask for OTP or password over phone or email.", severity: "danger" },
  ]
  for (const a of announcements) {
    await db
      .prepare("INSERT INTO announcements (id, title, body, severity, published_at) VALUES (?, ?, ?, ?, ?)")
      .run(randomUUID(), a.title, a.body, a.severity, daysAgo(faker.number.int({ min: 0, max: 14 })).toISOString())
  }

  for (const username of ["priya", "arjun", "admin", "teller", "manager"]) {
    for (let i = 0; i < 3; i++) {
      await db
        .prepare(
          `INSERT INTO notifications (id, username, title, body, read, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          username,
          faker.helpers.arrayElement(["Transfer completed", "Statement ready", "Security alert", "Scheduled payment due"]),
          faker.lorem.sentence(),
          i > 0,
          daysAgo(i).toISOString(),
        )
    }
    for (let i = 0; i < 5; i++) {
      await db
        .prepare(
          `INSERT INTO login_activity (id, username, ip, user_agent, success, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          username,
          `103.21.${faker.number.int({ min: 1, max: 200 })}.${faker.number.int({ min: 1, max: 250 })}`,
          "Chrome/Training",
          i !== 4,
          daysAgo(i).toISOString(),
        )
    }
  }
}
