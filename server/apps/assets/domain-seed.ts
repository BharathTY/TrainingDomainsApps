import { randomUUID } from "node:crypto"
import { faker } from "@faker-js/faker"
import type { AppDatabase } from "../../shared/db"
import { ASSET_CLEAR, ASSET_TABLES } from "./schema"

faker.seed(42)

const CATEGORIES = [
  { code: "IT", name: "IT equipment" },
  { code: "LAP", name: "Laptops and desktops", parent: "IT" },
  { code: "SRV", name: "Servers and networking", parent: "IT" },
  { code: "FUR", name: "Office furniture" },
  { code: "MFG", name: "Manufacturing machinery" },
  { code: "VEH", name: "Vehicles" },
  { code: "ELE", name: "Electrical equipment" },
  { code: "LAB", name: "Laboratory equipment" },
  { code: "BLD", name: "Building infrastructure" },
]

export async function ensureAssetsSchema(db: AppDatabase) {
  for (const sql of ASSET_TABLES) await db.exec(sql)
}

export async function assetsIsSeeded(db: AppDatabase) {
  const rows = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM assets")
  return Number(rows[0]?.n ?? 0) > 0
}

function pad(n: number, w = 5) {
  return String(n).padStart(w, "0")
}

export async function seedAssetsDomain(db: AppDatabase) {
  for (const table of ASSET_CLEAR) await db.exec(`DELETE FROM ${table}`)

  const deptIds: string[] = []
  const depts = ["Finance", "IT", "Operations", "HR", "Facilities", "R&D"]
  for (let i = 0; i < depts.length; i++) {
    const id = `dept-${i + 1}`
    deptIds.push(id)
    await db
      .prepare("INSERT INTO departments (id, code, name) VALUES (?, ?, ?)")
      .run(id, `D${pad(i + 1, 2)}`, depts[i])
  }

  const locIds: string[] = []
  const buildings = ["HQ Tower", "Plant A", "Warehouse B", "Lab Campus"]
  for (let i = 0; i < 8; i++) {
    const id = `loc-${i + 1}`
    locIds.push(id)
    await db
      .prepare("INSERT INTO locations (id, code, name, building) VALUES (?, ?, ?, ?)")
      .run(id, `L${pad(i + 1, 2)}`, `Floor ${i + 1}`, buildings[i % buildings.length])
  }

  const empIds: string[] = []
  for (let i = 0; i < 25; i++) {
    const id = `emp-${i + 1}`
    empIds.push(id)
    await db
      .prepare("INSERT INTO employees (id, emp_no, name, email, department_id, username) VALUES (?, ?, ?, ?, ?, ?)")
      .run(
        id,
        `E${pad(i + 1)}`,
        faker.person.fullName(),
        faker.internet.email({ provider: "qspiders.demo" }).toLowerCase(),
        deptIds[i % deptIds.length],
        i === 0 ? "employee" : null,
      )
  }

  const catByCode = new Map<string, string>()
  for (const cat of CATEGORIES) {
    const id = `cat-${cat.code.toLowerCase()}`
    catByCode.set(cat.code, id)
    const parentId = cat.parent ? catByCode.get(cat.parent) ?? null : null
    await db
      .prepare("INSERT INTO categories (id, code, name, parent_id, active) VALUES (?, ?, ?, ?, TRUE)")
      .run(id, cat.code, cat.name, parentId)
  }
  const categoryIds = [...catByCode.values()]

  const vendorIds: string[] = []
  for (let i = 0; i < 12; i++) {
    const id = `ven-${i + 1}`
    vendorIds.push(id)
    const start = faker.date.past({ years: 2 })
    const end = faker.date.future({ years: 1 })
    await db
      .prepare(
        `INSERT INTO vendors (id, vendor_no, name, contact_person, email, phone, address, tax_id, service_categories, contract_start, contract_end)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        `V${pad(i + 1)}`,
        faker.company.name(),
        faker.person.fullName(),
        faker.internet.email({ provider: "vendor.demo" }).toLowerCase(),
        `9${faker.string.numeric(9)}`,
        faker.location.streetAddress({ useFullAddress: true }),
        `GSTIN${faker.string.numeric(10)}`,
        faker.helpers.arrayElement(["IT", "Facilities", "Vehicles", "Lab"]),
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10),
      )
  }

  const statuses = ["active", "assigned", "under_maintenance", "retired"] as const
  const conditions = ["excellent", "good", "fair", "poor"] as const
  const assetIds: string[] = []

  for (let i = 0; i < 60; i++) {
    const id = `ast-${i + 1}`
    assetIds.push(id)
    const purchase = faker.date.past({ years: 4 })
    const cost = faker.number.int({ min: 8000, max: 450000 })
    const life = faker.helpers.arrayElement([24, 36, 48, 60])
    const monthsUsed = Math.min(life, Math.floor((Date.now() - purchase.getTime()) / (30 * 86400000)))
    const book = Math.max(0, Math.round(cost * (1 - monthsUsed / life)))
    const status = statuses[i % statuses.length]
    const nextMaint = faker.date.soon({ days: 45 })
    const lastMaint = faker.date.recent({ days: 90 })
    const wStart = purchase
    const wEnd = new Date(purchase)
    wEnd.setFullYear(wEnd.getFullYear() + 2)

    await db
      .prepare(
        `INSERT INTO assets (
          id, asset_no, name, asset_tag, category_id, manufacturer, model_number, serial_number, description,
          purchase_date, purchase_cost, vendor_id, warranty_start, warranty_end, useful_life_months,
          depreciation_method, book_value, department_id, assigned_employee_id, location_id,
          condition, status, maintenance_frequency_days, last_maintenance_date, next_maintenance_date,
          created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'straight_line', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', 'admin')`,
      )
      .run(
        id,
        `A${pad(i + 1)}`,
        `${faker.commerce.productName()} Unit`,
        `TAG-${pad(i + 1)}`,
        categoryIds[i % categoryIds.length],
        faker.company.name(),
        `MDL-${faker.string.alphanumeric(6).toUpperCase()}`,
        `SN-${faker.string.alphanumeric(10).toUpperCase()}`,
        faker.commerce.productDescription(),
        purchase.toISOString().slice(0, 10),
        cost,
        vendorIds[i % vendorIds.length],
        wStart.toISOString().slice(0, 10),
        wEnd.toISOString().slice(0, 10),
        life,
        book,
        deptIds[i % deptIds.length],
        status === "assigned" || status === "active" ? empIds[i % empIds.length] : null,
        locIds[i % locIds.length],
        conditions[i % conditions.length],
        status,
        faker.helpers.arrayElement([30, 60, 90, 180]),
        lastMaint.toISOString().slice(0, 10),
        nextMaint.toISOString().slice(0, 10),
      )

    if (status === "assigned" || i % 3 === 0) {
      await db
        .prepare(
          `INSERT INTO assignments (id, assignment_no, asset_id, employee_id, department_id, location_id, assigned_at, reason, approval_status, active, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', TRUE, 'admin')`,
        )
        .run(
          randomUUID(),
          `ASG${pad(i + 1)}`,
          id,
          empIds[i % empIds.length],
          deptIds[i % deptIds.length],
          locIds[i % locIds.length],
          faker.date.recent({ days: 120 }).toISOString().slice(0, 10),
          "Operational assignment",
        )
    }
  }

  const woStatuses = ["open", "scheduled", "in_progress", "on_hold", "completed", "closed"] as const
  for (let i = 0; i < 18; i++) {
    const id = `wo-${i + 1}`
    const status = woStatuses[i % woStatuses.length]
    const reported = faker.date.recent({ days: 40 })
    const scheduled = faker.date.soon({ days: 20 })
    await db
      .prepare(
        `INSERT INTO work_orders (
          id, work_order_no, asset_id, maintenance_type, issue_description, priority, reported_at, scheduled_at,
          assigned_technician, estimated_cost, actual_cost, status, completed_at, technician_notes, parts_replaced, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin')`,
      )
      .run(
        id,
        `WO${pad(i + 1)}`,
        assetIds[i % assetIds.length],
        faker.helpers.arrayElement(["preventive", "corrective"]),
        faker.lorem.sentence(),
        faker.helpers.arrayElement(["low", "medium", "high", "critical"]),
        reported.toISOString(),
        scheduled.toISOString(),
        "tech",
        faker.number.int({ min: 500, max: 25000 }),
        status === "completed" || status === "closed" ? faker.number.int({ min: 500, max: 30000 }) : null,
        status,
        status === "completed" || status === "closed" ? faker.date.recent({ days: 5 }).toISOString() : null,
        status === "completed" || status === "closed" ? "Work finished (synthetic)" : "",
        status === "completed" || status === "closed" ? "Filter kit" : "",
      )
    await db
      .prepare(
        "INSERT INTO work_order_history (id, work_order_id, from_status, to_status, note, actor) VALUES (?, ?, NULL, ?, 'Created', 'admin')",
      )
      .run(randomUUID(), id, status)
  }

  await db
    .prepare("INSERT INTO activity_logs (id, entity_type, entity_id, action, details, actor) VALUES (?, 'system', 'seed', 'seed', 'Assets domain seeded', 'system')")
    .run(randomUUID())
}
