import { fakerEN_IN as faker } from "@faker-js/faker"
import type { AppDatabase } from "../../shared/db"
import { ERP_CLEAR, ERP_TABLES } from "./schema"
import { ERP_ROLES, ROLE_PERMISSIONS } from "./rbac"

type Statement = { sql: string; params?: unknown[] }

const ORG = "org-qspiders"
const ENTITY = "le-qspiders"

function d(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export async function ensureErpSchema(db: AppDatabase) {
  for (const sql of ERP_TABLES) await db.exec(sql)
}

export async function erpIsSeeded(db: AppDatabase) {
  const rows = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM organizations")
  return Number(rows[0]?.n ?? 0) > 0
}

export async function seedErpDomain(db: AppDatabase) {
  for (const table of ERP_CLEAR) await db.exec(`DELETE FROM ${table}`)
  faker.seed(20261014)
  const statements: Statement[] = []

  statements.push({
    sql: `INSERT INTO organizations (id, code, name, currency_code, fiscal_year_start_month, created_by) VALUES (?, ?, ?, 'INR', 4, 'sysadmin')`,
    params: [ORG, "QSP", "QSpiders Practice Group"],
  })
  statements.push({
    sql: `INSERT INTO legal_entities (id, organization_id, code, name, gstin) VALUES (?, ?, ?, ?, ?)`,
    params: [ENTITY, ORG, "QSP-IN", "QSpiders India Pvt Ltd", "29ABCDE1234F1Z5"],
  })

  for (const [code, name, symbol] of [
    ["INR", "Indian Rupee", "₹"],
    ["USD", "US Dollar", "$"],
    ["EUR", "Euro", "€"],
  ] as const) {
    statements.push({ sql: "INSERT INTO currencies (code, name, symbol) VALUES (?, ?, ?)", params: [code, name, symbol] })
  }
  statements.push({
    sql: "INSERT INTO exchange_rates (id, from_currency, to_currency, rate, effective_on) VALUES (?, 'USD', 'INR', 83.5, '2026-04-01')",
    params: ["fx-usd-inr"],
  })
  statements.push({
    sql: "INSERT INTO exchange_rates (id, from_currency, to_currency, rate, effective_on) VALUES (?, 'EUR', 'INR', 90.2, '2026-04-01')",
    params: ["fx-eur-inr"],
  })

  for (const [id, code, name, days] of [
    ["pt-net30", "NET30", "Net 30", 30],
    ["pt-net45", "NET45", "Net 45", 45],
    ["pt-immediate", "IMMEDIATE", "Due on receipt", 0],
  ] as const) {
    statements.push({ sql: "INSERT INTO payment_terms (id, code, name, days) VALUES (?, ?, ?, ?)", params: [id, code, name, days] })
  }

  for (const [id, code, name, rate] of [
    ["tax-igst18", "IGST18", "IGST 18% (demo)", 18],
    ["tax-cgst9", "CGST9", "CGST 9% (demo)", 9],
    ["tax-sgst9", "SGST9", "SGST 9% (demo)", 9],
    ["tax-nil", "NIL", "Nil rated (demo)", 0],
  ] as const) {
    statements.push({
      sql: "INSERT INTO tax_codes (id, code, name, rate, jurisdiction) VALUES (?, ?, ?, ?, 'IN-demo')",
      params: [id, code, name, rate],
    })
  }

  const depts = [
    ["dept-fin", "FIN", "Finance", null],
    ["dept-hr", "HR", "Human Resources", null],
    ["dept-ops", "OPS", "Operations", null],
    ["dept-proc", "PROC", "Procurement", "dept-ops"],
    ["dept-wh", "WH", "Warehouse", "dept-ops"],
    ["dept-sales", "SALES", "Sales", null],
    ["dept-eng", "ENG", "Engineering", null],
  ] as const
  for (const [id, code, name, parent] of depts) {
    statements.push({
      sql: "INSERT INTO departments (id, organization_id, code, name, parent_id) VALUES (?, ?, ?, ?, ?)",
      params: [id, ORG, code, name, parent],
    })
  }

  const costCenters = [
    ["cc-fin", "CC-FIN", "Finance CC", "dept-fin"],
    ["cc-hr", "CC-HR", "HR CC", "dept-hr"],
    ["cc-ops", "CC-OPS", "Operations CC", "dept-ops"],
    ["cc-sales", "CC-SALES", "Sales CC", "dept-sales"],
    ["cc-eng", "CC-ENG", "Engineering CC", "dept-eng"],
  ] as const
  for (const [id, code, name, dept] of costCenters) {
    statements.push({
      sql: "INSERT INTO cost_centers (id, organization_id, code, name, department_id) VALUES (?, ?, ?, ?, ?)",
      params: [id, ORG, code, name, dept],
    })
  }

  for (const [id, code, title] of [
    ["pos-mgr", "MGR", "Manager"],
    ["pos-exec", "EXEC", "Executive"],
    ["pos-analyst", "ANALYST", "Analyst"],
    ["pos-assoc", "ASSOC", "Associate"],
  ] as const) {
    statements.push({
      sql: "INSERT INTO positions (id, organization_id, code, title) VALUES (?, ?, ?, ?)",
      params: [id, ORG, code, title],
    })
  }

  const accounts = [
    ["acc-1000", "1000", "Cash", "asset"],
    ["acc-1010", "1010", "Bank - HDFC", "asset"],
    ["acc-1100", "1100", "Accounts Receivable", "asset"],
    ["acc-1200", "1200", "Inventory", "asset"],
    ["acc-1500", "1500", "Fixed Assets", "asset"],
    ["acc-1510", "1510", "Accumulated Depreciation", "asset"],
    ["acc-2000", "2000", "Accounts Payable", "liability"],
    ["acc-2100", "2100", "Accrued Expenses", "liability"],
    ["acc-3000", "3000", "Equity", "equity"],
    ["acc-4000", "4000", "Sales Revenue", "income"],
    ["acc-5000", "5000", "Cost of Goods Sold", "expense"],
    ["acc-5100", "5100", "Salaries Expense", "expense"],
    ["acc-5200", "5200", "Travel Expense", "expense"],
    ["acc-5300", "5300", "Office Expense", "expense"],
    ["acc-5400", "5400", "Depreciation Expense", "expense"],
    ["acc-5500", "5500", "Tax Expense (demo)", "expense"],
  ] as const
  for (const [id, code, name, type] of accounts) {
    statements.push({
      sql: "INSERT INTO chart_of_accounts (id, organization_id, code, name, account_type, is_postable) VALUES (?, ?, ?, ?, ?, TRUE)",
      params: [id, ORG, code, name, type],
    })
  }

  for (let i = 0; i < 12; i += 1) {
    const start = d("2026-04-01", i * 30)
    const end = d(start, 29)
    statements.push({
      sql: "INSERT INTO accounting_periods (id, organization_id, name, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)",
      params: [`per-${i + 1}`, ORG, `FY26-P${i + 1}`, start, end, i < 6 ? "closed" : "open"],
    })
  }

  statements.push({
    sql: "INSERT INTO salary_structures (id, organization_id, code, name) VALUES (?, ?, 'STD', 'Standard India structure')",
    params: ["sal-std", ORG],
  })
  for (const [id, code, name, type, amount, statutory] of [
    ["sc-basic", "BASIC", "Basic", "earning", 40000, false],
    ["sc-hra", "HRA", "HRA", "earning", 16000, false],
    ["sc-bonus", "BONUS", "Bonus", "earning", 5000, false],
    ["sc-pf", "PF", "Provident Fund (demo config)", "deduction", 1800, true],
    ["sc-pt", "PT", "Professional Tax (demo config)", "deduction", 200, true],
  ] as const) {
    statements.push({
      sql: "INSERT INTO salary_components (id, structure_id, code, name, component_type, amount, is_statutory) VALUES (?, 'sal-std', ?, ?, ?, ?, ?)",
      params: [id, code, name, type, amount, statutory],
    })
  }

  for (const [id, code, name] of [
    ["lt-cl", "CL", "Casual Leave"],
    ["lt-sl", "SL", "Sick Leave"],
    ["lt-el", "EL", "Earned Leave"],
  ] as const) {
    statements.push({ sql: "INSERT INTO leave_types (id, code, name, paid) VALUES (?, ?, ?, TRUE)", params: [id, code, name] })
  }

  for (const [id, code, name] of [
    ["uom-nos", "NOS", "Numbers"],
    ["uom-kg", "KG", "Kilogram"],
    ["uom-box", "BOX", "Box"],
  ] as const) {
    statements.push({ sql: "INSERT INTO uoms (id, code, name) VALUES (?, ?, ?)", params: [id, code, name] })
  }

  for (const [id, name] of [
    ["icat-raw", "Raw materials"],
    ["icat-fg", "Finished goods"],
    ["icat-svc", "Services"],
  ] as const) {
    statements.push({
      sql: "INSERT INTO item_categories (id, organization_id, name) VALUES (?, ?, ?)",
      params: [id, ORG, name],
    })
  }

  const warehouses = [
    ["wh-blr", "BLR", "Bengaluru WH", "Bengaluru"],
    ["wh-mum", "MUM", "Mumbai WH", "Mumbai"],
  ] as const
  for (const [id, code, name, city] of warehouses) {
    statements.push({
      sql: "INSERT INTO warehouses (id, organization_id, code, name, city) VALUES (?, ?, ?, ?, ?)",
      params: [id, ORG, code, name, city],
    })
    statements.push({
      sql: "INSERT INTO storage_locations (id, warehouse_id, code, name) VALUES (?, ?, 'A-01', 'Aisle A Bin 01')",
      params: [`loc-${id}`, id],
    })
  }

  statements.push({
    sql: "INSERT INTO bank_accounts (id, organization_id, code, name, account_no, bank_name, gl_account_id, balance) VALUES (?, ?, 'HDFC-OPS', 'HDFC Operating', '502000112233', 'HDFC Bank', 'acc-1010', 2500000)",
    params: ["bank-hdfc", ORG],
  })

  for (const role of ERP_ROLES) {
    const modules = ROLE_PERMISSIONS[role]
    for (const [moduleId, actions] of Object.entries(modules)) {
      statements.push({
        sql: `INSERT INTO permission_grants (id, role, module_id, can_view, can_create, can_edit, can_delete, can_approve, can_export)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          `pg-${role}-${moduleId}`,
          role,
          moduleId,
          actions.includes("view"),
          actions.includes("create"),
          actions.includes("edit"),
          actions.includes("delete"),
          actions.includes("approve"),
          actions.includes("export"),
        ],
      })
    }
  }

  const employeeIds: string[] = []
  const deptIds = depts.map((d) => d[0])
  for (let i = 1; i <= 220; i += 1) {
    const id = `emp-${i}`
    employeeIds.push(id)
    const dept = deptIds[i % deptIds.length]
    const first = faker.person.firstName()
    const last = faker.person.lastName()
    statements.push({
      sql: `INSERT INTO employees (id, organization_id, employee_no, first_name, last_name, email, phone, department_id, position_id, manager_id, location, status, joining_date, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 'hrexec')`,
      params: [
        id,
        ORG,
        `E${String(i).padStart(5, "0")}`,
        first,
        last,
        faker.internet.email({ firstName: first, lastName: last }).toLowerCase(),
        `9${faker.string.numeric(9)}`,
        dept,
        ["pos-mgr", "pos-exec", "pos-analyst", "pos-assoc"][i % 4],
        i > 10 ? `emp-${(i % 10) + 1}` : null,
        faker.location.city(),
        d("2020-01-01", i * 7),
      ],
    })
    for (const lt of ["lt-cl", "lt-sl", "lt-el"]) {
      statements.push({
        sql: "INSERT INTO leave_balances (id, employee_id, leave_type_id, balance) VALUES (?, ?, ?, ?)",
        params: [`lb-${i}-${lt}`, id, lt, 8 + (i % 5)],
      })
    }
    statements.push({
      sql: "INSERT INTO employee_salaries (id, employee_id, structure_id, effective_from, gross) VALUES (?, ?, 'sal-std', '2026-04-01', ?)",
      params: [`es-${i}`, id, 45000 + (i % 20) * 2500],
    })
    if (i <= 60) {
      statements.push({
        sql: "INSERT INTO attendance (id, employee_id, work_date, check_in, check_out, status) VALUES (?, ?, '2026-10-13', '2026-10-13T03:30:00Z', '2026-10-13T12:00:00Z', 'present')",
        params: [`att-${i}`, id],
      })
    }
  }

  // Link demo usernames to employees
  const userLinks: [string, string][] = [
    ["emp-1", "sysadmin"],
    ["emp-2", "finmgr"],
    ["emp-3", "accountant"],
    ["emp-4", "hrmgr"],
    ["emp-5", "hrexec"],
    ["emp-6", "deptmgr"],
    ["emp-7", "procmgr"],
    ["emp-8", "whmgr"],
    ["emp-9", "salesmgr"],
    ["emp-10", "employee"],
    ["emp-11", "auditor"],
    ["emp-12", "orgadmin"],
  ]
  for (const [empId, username] of userLinks) {
    statements.push({ sql: "UPDATE employees SET username = ? WHERE id = ?", params: [username, empId] })
  }

  for (let i = 1; i <= 20; i += 1) {
    statements.push({
      sql: `INSERT INTO leave_requests (id, organization_id, employee_id, leave_type_id, start_date, end_date, days, status, reason, created_by)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      params: [
        `lr-${i}`,
        ORG,
        employeeIds[i + 20],
        ["lt-cl", "lt-sl", "lt-el"][i % 3],
        d("2026-10-01", i),
        d("2026-10-01", i),
        i % 4 === 0 ? "pending_approval" : i % 4 === 1 ? "approved" : "draft",
        "Personal",
        "employee",
      ],
    })
  }

  for (let i = 1; i <= 80; i += 1) {
    const id = `ven-${i}`
    statements.push({
      sql: `INSERT INTO vendors (id, organization_id, code, name, email, phone, city, payment_term_id, on_time_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        id,
        ORG,
        `V${String(i).padStart(4, "0")}`,
        faker.company.name(),
        faker.internet.email().toLowerCase(),
        `9${faker.string.numeric(9)}`,
        faker.location.city(),
        "pt-net30",
        70 + (i % 30),
      ],
    })
  }

  for (let i = 1; i <= 80; i += 1) {
    const id = `cus-${i}`
    statements.push({
      sql: `INSERT INTO customers (id, organization_id, code, name, email, phone, city, payment_term_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        id,
        ORG,
        `C${String(i).padStart(4, "0")}`,
        faker.company.name(),
        faker.internet.email().toLowerCase(),
        `9${faker.string.numeric(9)}`,
        faker.location.city(),
        "pt-net30",
      ],
    })
  }

  const itemIds: string[] = []
  for (let i = 1; i <= 200; i += 1) {
    const id = `item-${i}`
    itemIds.push(id)
    const cost = 100 + (i % 40) * 25
    statements.push({
      sql: `INSERT INTO items (id, organization_id, sku, name, category_id, uom_id, unit_cost, unit_price, reorder_level, track_batch)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        id,
        ORG,
        `ERP-${String(i).padStart(4, "0")}`,
        faker.commerce.productName(),
        ["icat-raw", "icat-fg", "icat-svc"][i % 3],
        ["uom-nos", "uom-kg", "uom-box"][i % 3],
        cost,
        cost * 1.35,
        10 + (i % 8) * 5,
        i % 7 === 0,
      ],
    })
    const wh = i % 2 === 0 ? "wh-blr" : "wh-mum"
    const qty = i % 11 === 0 ? 5 : 40 + (i % 50)
    statements.push({
      sql: "INSERT INTO stock_balances (id, item_id, warehouse_id, qty) VALUES (?, ?, ?, ?)",
      params: [`sb-${i}`, id, wh, qty],
    })
    statements.push({
      sql: `INSERT INTO stock_ledger (id, organization_id, item_id, warehouse_id, direction, qty, unit_cost, ref_type, ref_id, occurred_on, created_by)
            VALUES (?, ?, ?, ?, 'in', ?, ?, 'seed', 'seed', '2026-09-01', 'whmgr')`,
      params: [`sl-${i}`, ORG, id, wh, qty, cost],
    })
  }

  // Procure-to-pay sample chain
  statements.push({
    sql: `INSERT INTO purchase_requisitions (id, organization_id, req_no, department_id, requested_by, status, needed_by, notes, created_by)
          VALUES ('pr-1', ?, 'PR-0001', 'dept-eng', 'emp-10', 'approved', '2026-10-20', 'Laptops for new joiners', 'employee')`,
    params: [ORG],
  })
  statements.push({
    sql: "INSERT INTO pr_lines (id, requisition_id, item_id, qty, estimated_unit_cost) VALUES ('prl-1', 'pr-1', 'item-1', 10, 45000)",
  })
  statements.push({
    sql: `INSERT INTO rfqs (id, organization_id, requisition_id, rfq_no, status) VALUES ('rfq-1', ?, 'pr-1', 'RFQ-0001', 'closed')`,
    params: [ORG],
  })
  statements.push({
    sql: "INSERT INTO vendor_quotations (id, rfq_id, vendor_id, total_amount, valid_until, status) VALUES ('vq-1', 'rfq-1', 'ven-1', 440000, '2026-10-25', 'selected')",
  })
  statements.push({
    sql: "INSERT INTO vendor_quotations (id, rfq_id, vendor_id, total_amount, valid_until, status) VALUES ('vq-2', 'rfq-1', 'ven-2', 460000, '2026-10-25', 'received')",
  })
  statements.push({
    sql: `INSERT INTO purchase_orders (id, organization_id, po_no, vendor_id, warehouse_id, requisition_id, status, order_date, expected_on, total_amount, created_by)
          VALUES ('po-1', ?, 'PO-0001', 'ven-1', 'wh-blr', 'pr-1', 'approved', '2026-10-05', '2026-10-18', 440000, 'procmgr')`,
    params: [ORG],
  })
  statements.push({
    sql: "INSERT INTO po_lines (id, purchase_order_id, item_id, qty, unit_cost, received_qty) VALUES ('pol-1', 'po-1', 'item-1', 10, 44000, 10)",
  })
  statements.push({
    sql: `INSERT INTO goods_receipts (id, organization_id, grn_no, purchase_order_id, warehouse_id, received_on, status, created_by)
          VALUES ('grn-1', ?, 'GRN-0001', 'po-1', 'wh-blr', '2026-10-12', 'posted', 'whmgr')`,
    params: [ORG],
  })
  statements.push({
    sql: "INSERT INTO gr_lines (id, goods_receipt_id, item_id, qty, batch_no) VALUES ('grl-1', 'grn-1', 'item-1', 10, 'B-LAP-01')",
  })
  statements.push({
    sql: `INSERT INTO vendor_invoices (id, organization_id, invoice_no, vendor_id, purchase_order_id, goods_receipt_id, invoice_date, due_date, amount, tax_amount, status, match_status, created_by)
          VALUES ('vi-1', ?, 'VIN-0001', 'ven-1', 'po-1', 'grn-1', '2026-10-13', '2026-11-12', 440000, 79200, 'approved', 'matched', 'accountant')`,
    params: [ORG],
  })

  for (let i = 2; i <= 40; i += 1) {
    statements.push({
      sql: `INSERT INTO purchase_orders (id, organization_id, po_no, vendor_id, warehouse_id, status, order_date, expected_on, total_amount, created_by)
            VALUES (?, ?, ?, ?, 'wh-blr', ?, ?, ?, ?, 'procmgr')`,
      params: [
        `po-${i}`,
        ORG,
        `PO-${String(i).padStart(4, "0")}`,
        `ven-${(i % 80) + 1}`,
        i % 5 === 0 ? "draft" : i % 5 === 1 ? "pending_approval" : "approved",
        d("2026-08-01", i),
        d("2026-08-15", i),
        10000 + i * 1500,
      ],
    })
    statements.push({
      sql: "INSERT INTO po_lines (id, purchase_order_id, item_id, qty, unit_cost) VALUES (?, ?, ?, ?, ?)",
      params: [`pol-${i}`, `po-${i}`, itemIds[i % itemIds.length], 5 + (i % 10), 500 + i * 10],
    })
  }

  // Order-to-cash sample
  statements.push({
    sql: `INSERT INTO sales_orders (id, organization_id, so_no, customer_id, warehouse_id, status, order_date, total_amount, created_by)
          VALUES ('so-1', ?, 'SO-0001', 'cus-1', 'wh-blr', 'approved', '2026-10-08', 135000, 'salesmgr')`,
    params: [ORG],
  })
  statements.push({
    sql: "INSERT INTO so_lines (id, sales_order_id, item_id, qty, unit_price, fulfilled_qty) VALUES ('sol-1', 'so-1', 'item-2', 20, 6750, 20)",
  })
  statements.push({
    sql: `INSERT INTO deliveries (id, organization_id, delivery_no, sales_order_id, warehouse_id, delivered_on, status, tracking_no, created_by)
          VALUES ('del-1', ?, 'DEL-0001', 'so-1', 'wh-blr', '2026-10-10', 'delivered', 'TRK-77881', 'whmgr')`,
    params: [ORG],
  })
  statements.push({
    sql: "INSERT INTO delivery_lines (id, delivery_id, item_id, qty) VALUES ('dell-1', 'del-1', 'item-2', 20)",
  })
  statements.push({
    sql: `INSERT INTO customer_invoices (id, organization_id, invoice_no, customer_id, sales_order_id, delivery_id, invoice_date, due_date, amount, tax_amount, status, balance, created_by)
          VALUES ('ci-1', ?, 'CIN-0001', 'cus-1', 'so-1', 'del-1', '2026-10-11', '2026-11-10', 135000, 24300, 'open', 135000, 'accountant')`,
    params: [ORG],
  })

  for (let i = 2; i <= 40; i += 1) {
    const amount = 20000 + i * 1200
    statements.push({
      sql: `INSERT INTO sales_orders (id, organization_id, so_no, customer_id, warehouse_id, status, order_date, total_amount, created_by)
            VALUES (?, ?, ?, ?, 'wh-mum', ?, ?, ?, 'salesmgr')`,
      params: [
        `so-${i}`,
        ORG,
        `SO-${String(i).padStart(4, "0")}`,
        `cus-${(i % 80) + 1}`,
        i % 4 === 0 ? "pending_approval" : "approved",
        d("2026-08-01", i * 2),
        amount,
      ],
    })
    statements.push({
      sql: "INSERT INTO so_lines (id, sales_order_id, item_id, qty, unit_price) VALUES (?, ?, ?, ?, ?)",
      params: [`sol-${i}`, `so-${i}`, itemIds[(i + 3) % itemIds.length], 3 + (i % 8), amount / 5],
    })
    if (i % 3 === 0) {
      statements.push({
        sql: `INSERT INTO customer_invoices (id, organization_id, invoice_no, customer_id, sales_order_id, invoice_date, due_date, amount, tax_amount, status, balance, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, 'accountant')`,
        params: [
          `ci-${i}`,
          ORG,
          `CIN-${String(i).padStart(4, "0")}`,
          `cus-${(i % 80) + 1}`,
          `so-${i}`,
          d("2026-08-10", i * 2),
          d("2026-09-10", i * 2),
          amount,
          amount * 0.18,
          amount,
        ],
      })
    }
  }

  for (let i = 2; i <= 30; i += 1) {
    const amount = 15000 + i * 800
    statements.push({
      sql: `INSERT INTO vendor_invoices (id, organization_id, invoice_no, vendor_id, invoice_date, due_date, amount, tax_amount, status, match_status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unmatched', 'accountant')`,
      params: [
        `vi-${i}`,
        ORG,
        `VIN-${String(i).padStart(4, "0")}`,
        `ven-${(i % 80) + 1}`,
        d("2026-08-05", i),
        d("2026-09-05", i),
        amount,
        amount * 0.18,
        i % 4 === 0 ? "pending_approval" : "open",
      ],
    })
  }

  // Balanced journals
  for (let i = 1; i <= 50; i += 1) {
    const jid = `jnl-${i}`
    const amount = 5000 + i * 250
    const status = i <= 35 ? "posted" : i <= 42 ? "pending_approval" : "draft"
    statements.push({
      sql: `INSERT INTO journals (id, organization_id, journal_no, period_id, journal_date, source, status, memo, posted_at, posted_by, created_by)
            VALUES (?, ?, ?, 'per-7', ?, 'manual', ?, ?, ?, ?, 'accountant')`,
      params: [
        jid,
        ORG,
        `JNL-${String(i).padStart(4, "0")}`,
        d("2026-10-01", i % 10),
        status,
        `Seed journal ${i}`,
        status === "posted" ? "2026-10-02T10:00:00Z" : null,
        status === "posted" ? "finmgr" : null,
      ],
    })
    statements.push({
      sql: "INSERT INTO journal_lines (id, journal_id, account_id, cost_center_id, debit, credit, memo) VALUES (?, ?, 'acc-5200', 'cc-ops', ?, 0, 'Debit')",
      params: [`jl-${i}-d`, jid, amount],
    })
    statements.push({
      sql: "INSERT INTO journal_lines (id, journal_id, account_id, cost_center_id, debit, credit, memo) VALUES (?, ?, 'acc-1010', 'cc-fin', 0, ?, 'Credit')",
      params: [`jl-${i}-c`, jid, amount],
    })
  }

  for (const [dept, cc, acct, amt] of [
    ["dept-fin", "cc-fin", "acc-5300", 500000],
    ["dept-hr", "cc-hr", "acc-5100", 2000000],
    ["dept-ops", "cc-ops", "acc-5200", 300000],
    ["dept-sales", "cc-sales", "acc-5200", 400000],
    ["dept-eng", "cc-eng", "acc-5300", 350000],
  ] as const) {
    statements.push({
      sql: "INSERT INTO budgets (id, organization_id, department_id, cost_center_id, account_id, fiscal_year, amount) VALUES (?, ?, ?, ?, ?, 2026, ?)",
      params: [`bud-${dept}`, ORG, dept, cc, acct, amt],
    })
  }

  for (let i = 1; i <= 25; i += 1) {
    statements.push({
      sql: `INSERT INTO expense_claims (id, organization_id, claim_no, employee_id, department_id, cost_center_id, amount, status, submitted_at, notes, created_by)
            VALUES (?, ?, ?, ?, 'dept-eng', 'cc-eng', ?, ?, ?, ?, 'employee')`,
      params: [
        `exp-${i}`,
        ORG,
        `EXP-${String(i).padStart(4, "0")}`,
        employeeIds[i + 30],
        1500 + i * 200,
        i % 5 === 0 ? "pending_approval" : i % 5 === 1 ? "approved" : i % 5 === 2 ? "reimbursed" : "draft",
        i % 5 === 0 ? "2026-10-10T08:00:00Z" : null,
        "Travel and meals",
      ],
    })
    statements.push({
      sql: "INSERT INTO expense_lines (id, claim_id, category, amount, expense_date, receipt_name) VALUES (?, ?, 'Travel', ?, '2026-10-09', ?)",
      params: [`expl-${i}`, `exp-${i}`, 1500 + i * 200, `receipt-${i}.pdf`],
    })
  }

  statements.push({
    sql: `INSERT INTO payroll_runs (id, organization_id, period_label, start_date, end_date, status, approved_by, approved_at, created_by)
          VALUES ('prun-1', ?, '2026-09', '2026-09-01', '2026-09-30', 'approved', 'hrmgr', '2026-10-02T09:00:00Z', 'hrexec')`,
    params: [ORG],
  })
  for (let i = 1; i <= 50; i += 1) {
    const gross = 45000 + (i % 20) * 2500
    const ded = 2000
    statements.push({
      sql: "INSERT INTO payslips (id, payroll_run_id, employee_id, gross, deductions, net) VALUES (?, 'prun-1', ?, ?, ?, ?)",
      params: [`ps-${i}`, employeeIds[i], gross, ded, gross - ded],
    })
  }

  statements.push({
    sql: `INSERT INTO job_requisitions (id, organization_id, title, department_id, status, openings, created_by)
          VALUES ('jr-1', ?, 'Backend Engineer', 'dept-eng', 'approved', 2, 'hrmgr')`,
    params: [ORG],
  })
  for (let i = 1; i <= 15; i += 1) {
    statements.push({
      sql: "INSERT INTO candidates (id, requisition_id, full_name, email, stage) VALUES (?, 'jr-1', ?, ?, ?)",
      params: [
        `cand-${i}`,
        faker.person.fullName(),
        faker.internet.email().toLowerCase(),
        ["applied", "interview", "offer", "hired", "rejected"][i % 5],
      ],
    })
  }
  statements.push({
    sql: "INSERT INTO interviews (id, candidate_id, scheduled_at, interviewer, feedback, rating, status) VALUES ('int-1', 'cand-2', '2026-10-15T05:30:00Z', 'emp-4', 'Strong fundamentals', 4, 'completed')",
  })
  statements.push({
    sql: "INSERT INTO offers (id, candidate_id, offered_ctc, status, accepted_at) VALUES ('off-1', 'cand-3', 1200000, 'accepted', '2026-10-12T10:00:00Z')",
  })

  for (let i = 1; i <= 30; i += 1) {
    statements.push({
      sql: `INSERT INTO fixed_assets (id, organization_id, asset_no, name, category, acquisition_date, acquisition_cost, residual_value, useful_life_months, status, assigned_to, location)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1000, 36, 'active', ?, ?)`,
      params: [
        `fa-${i}`,
        ORG,
        `FA-${String(i).padStart(4, "0")}`,
        faker.commerce.productName(),
        ["Laptop", "Furniture", "Vehicle", "Server"][i % 4],
        d("2024-01-01", i * 20),
        30000 + i * 5000,
        employeeIds[i],
        faker.location.city(),
      ],
    })
  }

  statements.push({
    sql: `INSERT INTO approval_policies (id, organization_id, transaction_type, min_amount, max_amount, steps_json)
          VALUES ('ap-po', ?, 'purchase_order', 0, NULL, ?)`,
    params: [ORG, JSON.stringify([{ step: 1, role: "deptmgr" }, { step: 2, role: "procmgr" }])],
  })
  statements.push({
    sql: `INSERT INTO approval_policies (id, organization_id, transaction_type, min_amount, max_amount, steps_json)
          VALUES ('ap-exp', ?, 'expense_claim', 0, NULL, ?)`,
    params: [ORG, JSON.stringify([{ step: 1, role: "deptmgr" }, { step: 2, role: "finmgr" }])],
  })

  for (let i = 1; i <= 15; i += 1) {
    const aid = `apv-${i}`
    statements.push({
      sql: `INSERT INTO approvals (id, organization_id, entity_type, entity_id, status, current_step, amount, requested_by)
            VALUES (?, ?, ?, ?, 'pending', 1, ?, ?)`,
      params: [aid, ORG, ["purchase_order", "expense_claim", "leave_request", "sales_order"][i % 4], `entity-${i}`, 10000 + i * 500, "employee"],
    })
    statements.push({
      sql: "INSERT INTO approval_steps (id, approval_id, step_no, approver_role, status) VALUES (?, ?, 1, ?, 'pending')",
      params: [`aps-${i}`, aid, ["deptmgr", "finmgr", "procmgr", "hrmgr"][i % 4]],
    })
  }

  for (const user of ["deptmgr", "finmgr", "procmgr", "hrmgr", "employee", "whmgr", "salesmgr"]) {
    statements.push({
      sql: "INSERT INTO notifications (id, username, title, body, link_path) VALUES (?, ?, ?, ?, ?)",
      params: [`n-${user}`, user, "Pending approval", "You have items waiting for review.", "approvals"],
    })
  }

  statements.push({
    sql: `INSERT INTO audit_logs (id, organization_id, actor, action, entity_type, entity_id, details, correlation_id)
          VALUES ('al-1', ?, 'sysadmin', 'seed', 'system', 'erp', 'Initial ERP seed loaded', 'seed-20261014')`,
    params: [ORG],
  })

  await db.batch(statements)
}

export async function prepareErp(db: AppDatabase) {
  await ensureErpSchema(db)
  if (!(await erpIsSeeded(db))) await seedErpDomain(db)
}
