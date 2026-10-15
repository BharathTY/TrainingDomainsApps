import { randomUUID } from "node:crypto"
import { faker } from "@faker-js/faker"
import type { AppDatabase } from "../../shared/db"
import { CRM_CLEAR, CRM_TABLES } from "./schema"

faker.seed(91)

const OWNERS = ["rep1", "rep2", "salesmgr"] as const
const SOURCES = ["website", "referral", "cold_call", "trade_show", "linkedin", "partner"] as const
const INDUSTRIES = ["IT Services", "Manufacturing", "Healthcare", "Retail", "FinTech", "Education", "Logistics"] as const
const STATUSES = ["new", "contacted", "qualified", "unqualified", "converted"] as const
const RATINGS = ["hot", "warm", "cold"] as const
const STAGES = ["new", "qualification", "needs_analysis", "proposal", "negotiation", "won", "lost"] as const
const ACT_TYPES = ["call", "email", "meeting", "demo", "task", "visit"] as const
const ACT_STATUSES = ["planned", "in_progress", "completed", "cancelled"] as const

export async function ensureCrmSchema(db: AppDatabase) {
  for (const sql of CRM_TABLES) await db.exec(sql)
}

export async function crmIsSeeded(db: AppDatabase) {
  const rows = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM leads")
  return Number(rows[0]?.n ?? 0) > 0
}

function daysFromNow(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(faker.number.int({ min: 9, max: 17 }), faker.helpers.arrayElement([0, 15, 30, 45]), 0, 0)
  return d
}

function pad(n: number, w = 4) {
  return String(n).padStart(w, "0")
}

export async function seedCrmDomain(db: AppDatabase) {
  for (const table of CRM_CLEAR) await db.exec(`DELETE FROM ${table}`)

  const leadIds: string[] = []
  for (let i = 0; i < 36; i++) {
    const id = `lead-${i + 1}`
    leadIds.push(id)
    const status = i < 5 ? "converted" : i < 8 ? "unqualified" : faker.helpers.arrayElement(STATUSES.filter((s) => s !== "converted"))
    const owner = OWNERS[i % OWNERS.length]!
    const first = faker.person.firstName()
    const last = faker.person.lastName()
    const company = faker.company.name()
    await db
      .prepare(
        `INSERT INTO leads (
           id, lead_no, first_name, last_name, company, email, phone, job_title, source, industry, company_size,
           status, rating, owner_username, notes, tags, last_contacted_at, next_follow_up_at, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        `LD${pad(i + 1)}`,
        first,
        last,
        company,
        faker.internet.email({ firstName: first, lastName: last, provider: "lead.demo" }).toLowerCase(),
        `9${faker.string.numeric(9)}`,
        faker.person.jobTitle(),
        faker.helpers.arrayElement(SOURCES),
        faker.helpers.arrayElement(INDUSTRIES),
        faker.helpers.arrayElement(["1-10", "11-50", "51-200", "201-500", "500+"]),
        status,
        faker.helpers.arrayElement(RATINGS),
        owner,
        faker.lorem.sentence(),
        faker.helpers.arrayElements(["enterprise", "smb", "priority", "inbound", "partner"], { min: 0, max: 3 }).join(","),
        status === "new" ? null : daysFromNow(-faker.number.int({ min: 1, max: 20 })).toISOString(),
        status === "converted" || status === "unqualified" ? null : daysFromNow(faker.number.int({ min: -2, max: 14 })).toISOString(),
        daysFromNow(-faker.number.int({ min: 5, max: 60 })).toISOString(),
      )
  }

  const contactIds: string[] = []
  for (let i = 0; i < 24; i++) {
    const id = `contact-${i + 1}`
    contactIds.push(id)
    const fullName = faker.person.fullName()
    const company = faker.company.name()
    const sourceLead = i < 5 ? leadIds[i]! : null
    await db
      .prepare(
        `INSERT INTO contacts (
           id, contact_no, full_name, job_title, company, email, phone, alt_phone, department, location, address,
           owner_username, status, preferred_channel, notes, source_lead_id, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        `CT${pad(i + 1)}`,
        fullName,
        faker.person.jobTitle(),
        company,
        faker.internet.email({ provider: "contact.demo" }).toLowerCase(),
        `9${faker.string.numeric(9)}`,
        faker.datatype.boolean() ? `9${faker.string.numeric(9)}` : "",
        faker.commerce.department(),
        faker.helpers.arrayElement(["Bengaluru", "Mumbai", "Hyderabad", "Chennai", "Pune", "Delhi NCR"]),
        faker.location.streetAddress(),
        OWNERS[i % OWNERS.length]!,
        faker.helpers.arrayElement(["active", "active", "inactive"]),
        faker.helpers.arrayElement(["email", "phone", "whatsapp", "in_person"]),
        faker.lorem.sentence(),
        sourceLead,
        daysFromNow(-faker.number.int({ min: 3, max: 90 })).toISOString(),
      )
    if (sourceLead) {
      await db.prepare("UPDATE leads SET converted_contact_id = ?, status = 'converted' WHERE id = ?").run(id, sourceLead)
    }
  }

  const oppIds: string[] = []
  for (let i = 0; i < 14; i++) {
    const id = `opp-${i + 1}`
    oppIds.push(id)
    const stage = STAGES[i % STAGES.length]!
    const contactId = contactIds[i % contactIds.length]!
    const contact = await db.query<{ company: string; full_name: string }>("SELECT company, full_name FROM contacts WHERE id = ?", [
      contactId,
    ])
    const amount = faker.number.int({ min: 50_000, max: 2_500_000 })
    const probability =
      stage === "won" ? 100 : stage === "lost" ? 0 : faker.number.int({ min: 10, max: 90 })
    await db
      .prepare(
        `INSERT INTO opportunities (
           id, opportunity_no, name, contact_id, company, stage, amount, probability, expected_close,
           owner_username, notes, close_reason, source_lead_id, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        `OP${pad(i + 1)}`,
        `${contact[0]?.company ?? "Deal"} — ${faker.commerce.productName()}`,
        contactId,
        contact[0]?.company ?? "",
        stage,
        amount,
        probability,
        daysFromNow(faker.number.int({ min: -10, max: 45 })).toISOString().slice(0, 10),
        OWNERS[i % OWNERS.length]!,
        faker.lorem.sentence(),
        stage === "won" ? "Signed MSA" : stage === "lost" ? "Budget freeze" : "",
        i < 5 ? leadIds[i]! : null,
        daysFromNow(-faker.number.int({ min: 5, max: 40 })).toISOString(),
      )
    if (i < 5) {
      await db.prepare("UPDATE leads SET converted_opportunity_id = ? WHERE id = ?").run(id, leadIds[i]!)
    }
  }

  for (let i = 0; i < 28; i++) {
    const start = daysFromNow(faker.number.int({ min: -10, max: 20 }))
    const end = new Date(start)
    end.setMinutes(end.getMinutes() + faker.helpers.arrayElement([30, 45, 60, 90]))
    const relatedType = i % 3 === 0 ? "lead" : i % 3 === 1 ? "contact" : "opportunity"
    const relatedId =
      relatedType === "lead" ? leadIds[i % leadIds.length]! : relatedType === "contact" ? contactIds[i % contactIds.length]! : oppIds[i % oppIds.length]!
    let status = faker.helpers.arrayElement(ACT_STATUSES)
    if (start < new Date() && status === "planned") status = faker.helpers.arrayElement(["completed", "in_progress", "planned"])
    if (i < 4) {
      start.setDate(new Date().getDate())
      start.setHours(10 + i, 0, 0, 0)
      end.setTime(start.getTime() + 60 * 60 * 1000)
      status = "planned"
    }
    if (i >= 4 && i < 7) {
      start.setDate(new Date().getDate() - (i - 2))
      status = "planned"
    }
    await db
      .prepare(
        `INSERT INTO activities (
           id, activity_no, title, description, activity_type, related_type, related_id, owner_username,
           priority, status, start_at, end_at, all_day, reminder_minutes, recurrence
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        `AC${pad(i + 1)}`,
        faker.helpers.arrayElement([
          "Discovery call",
          "Product demo",
          "Proposal walkthrough",
          "Follow-up email",
          "Site visit",
          "Contract review",
          "Quarterly check-in",
        ]),
        faker.lorem.sentence(),
        faker.helpers.arrayElement(ACT_TYPES),
        relatedType,
        relatedId,
        OWNERS[i % OWNERS.length]!,
        faker.helpers.arrayElement(["low", "medium", "high"]),
        status,
        start.toISOString(),
        end.toISOString(),
        i % 11 === 0,
        faker.helpers.arrayElement([15, 30, 60, null]),
        faker.helpers.arrayElement(["none", "none", "none", "weekly", "monthly"]),
      )
  }

  for (const entityType of ["lead", "contact", "opportunity"] as const) {
    const pool = entityType === "lead" ? leadIds : entityType === "contact" ? contactIds : oppIds
    for (let i = 0; i < 12; i++) {
      await db
        .prepare("INSERT INTO interaction_notes (id, entity_type, entity_id, body, actor, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(randomUUID(), entityType, pool[i % pool.length]!, faker.lorem.sentences(2), OWNERS[i % OWNERS.length]!, daysFromNow(-i).toISOString())
    }
  }

  for (const username of ["admin", "salesmgr", "rep1", "rep2", "viewer"]) {
    for (let i = 0; i < 3; i++) {
      await db
        .prepare("INSERT INTO notifications (id, username, title, body, read, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(
          randomUUID(),
          username,
          faker.helpers.arrayElement(["Lead assigned", "Follow-up due", "Deal moved stage", "Meeting reminder"]),
          faker.lorem.sentence(),
          i > 0,
          daysFromNow(-i).toISOString(),
        )
    }
  }
}
