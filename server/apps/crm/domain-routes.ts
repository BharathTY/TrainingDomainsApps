import { randomUUID } from "node:crypto"
import type { Express } from "express"
import type { AppDatabase } from "../../shared/db"
import { logActivity, okList, ownerFilter, pad, parsePaging, requirePerm, requireUser } from "./api-helpers"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[6-9]\d{9}$/

function leadSort(sort: string) {
  if (sort === "name") return "first_name ASC, last_name ASC"
  if (sort === "company") return "company ASC"
  if (sort === "status") return "status ASC"
  if (sort === "created_asc") return "created_at ASC"
  return "created_at DESC"
}

export function registerCrmApi(app: Express, db: AppDatabase) {
  app.get("/api/crm/v1/openapi.json", (_req, res) => {
    res.json({
      openapi: "3.0.3",
      info: { title: "Pulse CRM API", version: "1.0.0", description: "Synthetic CRM training API" },
      paths: {
        "/api/crm/dashboard": { get: { summary: "Dashboard KPIs" } },
        "/api/crm/leads": { get: { summary: "List leads" }, post: { summary: "Create lead" } },
        "/api/crm/contacts": { get: { summary: "List contacts" } },
        "/api/crm/activities": { get: { summary: "List activities" } },
        "/api/crm/opportunities": { get: { summary: "Pipeline opportunities" } },
      },
    })
  })

  app.get("/api/crm/notifications", async (req, res, next) => {
    try {
      const user = await requireUser(db, req, res)
      if (!user) return
      const rows = await db.query(
        `SELECT id, title, body, read, created_at AS "createdAt" FROM notifications
         WHERE username = ? ORDER BY created_at DESC LIMIT 20`,
        [user.username],
      )
      res.json(rows)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/crm/lookups", async (req, res, next) => {
    try {
      const user = await requireUser(db, req, res)
      if (!user) return
      const owners = await db.query<{ username: string; name: string; role: string }>(
        "SELECT username, name, role FROM users WHERE role IN ('salesrep','salesmgr','admin') ORDER BY name",
      )
      res.json({
        owners,
        sources: ["website", "referral", "cold_call", "trade_show", "linkedin", "partner"],
        industries: ["IT Services", "Manufacturing", "Healthcare", "Retail", "FinTech", "Education", "Logistics"],
        leadStatuses: ["new", "contacted", "qualified", "unqualified", "converted"],
        ratings: ["hot", "warm", "cold"],
        stages: ["new", "qualification", "needs_analysis", "proposal", "negotiation", "won", "lost"],
        activityTypes: ["call", "email", "meeting", "demo", "task", "visit"],
        activityStatuses: ["planned", "in_progress", "completed", "cancelled"],
      })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/crm/dashboard", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "dashboard", "view")
      if (!user) return
      const scope = ownerFilter(user)
      const leadScope = ownerFilter(user)
      const actScope = ownerFilter(user)
      const oppScope = ownerFilter(user)

      const [leadStats, contactCount, oppCount, todayFollowUps, overdueFollowUps, upcoming, pipeline, recent, recentNotes] =
        await Promise.all([
          db.query<{ status: string; n: number }>(
            `SELECT status, COUNT(*)::int AS n FROM leads WHERE deleted_at IS NULL ${leadScope.sql} GROUP BY status`,
            leadScope.params,
          ),
          db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM contacts WHERE deleted_at IS NULL ${scope.sql}`, scope.params),
          db.query<{ n: number }>(
            `SELECT COUNT(*)::int AS n FROM opportunities WHERE deleted_at IS NULL AND stage NOT IN ('won','lost') ${oppScope.sql}`,
            oppScope.params,
          ),
          db.query<{ n: number }>(
            `SELECT COUNT(*)::int AS n FROM activities
             WHERE deleted_at IS NULL AND status IN ('planned','in_progress')
               AND start_at::date = CURRENT_DATE ${actScope.sql}`,
            actScope.params,
          ),
          db.query<{ n: number }>(
            `SELECT COUNT(*)::int AS n FROM activities
             WHERE deleted_at IS NULL AND status IN ('planned','in_progress')
               AND start_at < NOW() AND start_at::date < CURRENT_DATE ${actScope.sql}`,
            actScope.params,
          ),
          db.query(
            `SELECT id, activity_no AS "activityNo", title, activity_type AS "activityType", start_at AS "startAt", status, priority
             FROM activities WHERE deleted_at IS NULL AND status IN ('planned','in_progress')
               AND start_at >= NOW() ${actScope.sql}
             ORDER BY start_at ASC LIMIT 6`,
            actScope.params,
          ),
          db.query<{ stage: string; n: number; value: number }>(
            `SELECT stage, COUNT(*)::int AS n, COALESCE(SUM(amount),0)::float AS value
             FROM opportunities WHERE deleted_at IS NULL ${oppScope.sql} GROUP BY stage`,
            oppScope.params,
          ),
          db.query(
            `SELECT id, entity_type AS "entityType", entity_id AS "entityId", action, details, actor, created_at AS "createdAt"
             FROM activity_logs ORDER BY created_at DESC LIMIT 8`,
          ),
          db.query(
            `SELECT id, entity_type AS "entityType", entity_id AS "entityId", body, actor, created_at AS "createdAt"
             FROM interaction_notes ORDER BY created_at DESC LIMIT 6`,
          ),
        ])

      const byStatus = Object.fromEntries(leadStats.map((r) => [r.status, r.n]))
      const totalLeads = leadStats.reduce((s, r) => s + r.n, 0)
      const converted = Number(byStatus.converted ?? 0)
      const conversionRate = totalLeads ? Math.round((converted / totalLeads) * 1000) / 10 : 0

      res.json({
        totalLeads,
        newLeads: Number(byStatus.new ?? 0),
        qualifiedLeads: Number(byStatus.qualified ?? 0),
        convertedLeads: converted,
        totalContacts: Number(contactCount[0]?.n ?? 0),
        openOpportunities: Number(oppCount[0]?.n ?? 0),
        followUpsToday: Number(todayFollowUps[0]?.n ?? 0),
        overdueFollowUps: Number(overdueFollowUps[0]?.n ?? 0),
        conversionRate,
        pipeline,
        upcomingMeetings: upcoming,
        recentActivities: recent,
        recentNotes,
      })
    } catch (error) {
      next(error)
    }
  })

  // —— Leads ——
  app.get("/api/crm/leads", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "leads", "view")
      if (!user) return
      const { page, pageSize, offset, q, sort } = parsePaging(req)
      const status = String(req.query.status ?? "").trim()
      const source = String(req.query.source ?? "").trim()
      const rating = String(req.query.rating ?? "").trim()
      const owner = String(req.query.owner ?? "").trim()
      const scope = ownerFilter(user)
      const where = ["deleted_at IS NULL"]
      const params: unknown[] = []
      if (scope.sql) {
        where.push("owner_username = ?")
        params.push(...scope.params)
      }
      if (status) {
        where.push("status = ?")
        params.push(status)
      }
      if (source) {
        where.push("source = ?")
        params.push(source)
      }
      if (rating) {
        where.push("rating = ?")
        params.push(rating)
      }
      if (owner && user.role !== "salesrep") {
        where.push("owner_username = ?")
        params.push(owner)
      }
      if (q) {
        where.push(
          "(LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(company) LIKE ? OR LOWER(email) LIKE ? OR LOWER(lead_no) LIKE ? OR LOWER(phone) LIKE ?)",
        )
        const like = `%${q}%`
        params.push(like, like, like, like, like, like)
      }
      const whereSql = where.join(" AND ")
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM leads WHERE ${whereSql}`, params)
      const rows = await db.query(
        `SELECT id, lead_no AS "leadNo", first_name AS "firstName", last_name AS "lastName", company, email, phone,
                job_title AS "jobTitle", source, industry, company_size AS "companySize", status, rating,
                owner_username AS "ownerUsername", tags, last_contacted_at AS "lastContactedAt",
                next_follow_up_at AS "nextFollowUpAt", created_at AS "createdAt"
         FROM leads WHERE ${whereSql}
         ORDER BY ${leadSort(sort)}
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/crm/leads/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "leads", "view")
      if (!user) return
      const row = await getLead(db, String(req.params.id), user)
      if (!row) {
        res.status(404).json({ message: "Lead not found" })
        return
      }
      const [interactionNotes, activities, history] = await Promise.all([
        db.query(
          `SELECT id, body, actor, created_at AS "createdAt" FROM interaction_notes
           WHERE entity_type = 'lead' AND entity_id = ? ORDER BY created_at DESC LIMIT 20`,
          [req.params.id],
        ),
        db.query(
          `SELECT id, activity_no AS "activityNo", title, activity_type AS "activityType", status, start_at AS "startAt", end_at AS "endAt"
           FROM activities WHERE deleted_at IS NULL AND related_type = 'lead' AND related_id = ?
           ORDER BY start_at DESC LIMIT 20`,
          [req.params.id],
        ),
        db.query(
          `SELECT id, action, details, actor, created_at AS "createdAt" FROM activity_logs
           WHERE entity_type = 'lead' AND entity_id = ? ORDER BY created_at DESC LIMIT 20`,
          [req.params.id],
        ),
      ])
      res.json({ ...row, interactionNotes, activities, history })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/crm/leads", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "leads", "create")
      if (!user) return
      const body = req.body ?? {}
      const errors = validateLeadBody(body)
      if (errors.length) {
        res.status(400).json({ message: errors[0], errors })
        return
      }
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM leads")
      const id = randomUUID()
      const leadNo = `LD${pad(Number(count[0]?.n ?? 0) + 1)}`
      const owner = user.role === "salesrep" ? user.username : String(body.ownerUsername ?? user.username)
      await db
        .prepare(
          `INSERT INTO leads (
             id, lead_no, first_name, last_name, company, email, phone, job_title, source, industry, company_size,
             status, rating, owner_username, notes, tags, next_follow_up_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          leadNo,
          String(body.firstName).trim(),
          String(body.lastName).trim(),
          String(body.company ?? "").trim(),
          String(body.email).trim().toLowerCase(),
          String(body.phone ?? "").trim(),
          String(body.jobTitle ?? "").trim(),
          String(body.source ?? "website"),
          String(body.industry ?? ""),
          String(body.companySize ?? ""),
          String(body.status ?? "new"),
          String(body.rating ?? "warm"),
          owner,
          String(body.notes ?? ""),
          String(body.tags ?? ""),
          body.nextFollowUpAt ? String(body.nextFollowUpAt) : null,
        )
      await logActivity(db, { entityType: "lead", entityId: id, action: "create", details: leadNo, actor: user.username })
      res.status(201).json({ id, leadNo })
    } catch (error) {
      next(error)
    }
  })

  app.patch("/api/crm/leads/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "leads", "edit")
      if (!user) return
      const existing = await getLead(db, String(req.params.id), user)
      if (!existing) {
        res.status(404).json({ message: "Lead not found" })
        return
      }
      const body = { ...existing, ...flattenLeadPatch(req.body ?? {}) }
      const errors = validateLeadBody(body)
      if (errors.length) {
        res.status(400).json({ message: errors[0], errors })
        return
      }
      const owner =
        user.role === "salesrep" ? existing.ownerUsername : String(req.body?.ownerUsername ?? existing.ownerUsername)
      await db
        .prepare(
          `UPDATE leads SET first_name=?, last_name=?, company=?, email=?, phone=?, job_title=?, source=?, industry=?,
             company_size=?, status=?, rating=?, owner_username=?, notes=?, tags=?, next_follow_up_at=?,
             last_contacted_at=COALESCE(?, last_contacted_at), updated_at=NOW()
           WHERE id=?`,
        )
        .run(
          String(body.firstName).trim(),
          String(body.lastName).trim(),
          String(body.company ?? "").trim(),
          String(body.email).trim().toLowerCase(),
          String(body.phone ?? "").trim(),
          String(body.jobTitle ?? "").trim(),
          String(body.source ?? "website"),
          String(body.industry ?? ""),
          String(body.companySize ?? ""),
          String(body.status ?? existing.status),
          String(body.rating ?? existing.rating),
          owner,
          String(body.notes ?? ""),
          String(body.tags ?? ""),
          body.nextFollowUpAt ? String(body.nextFollowUpAt) : null,
          req.body?.lastContactedAt ? String(req.body.lastContactedAt) : null,
          req.params.id,
        )
      await logActivity(db, { entityType: "lead", entityId: String(req.params.id), action: "update", actor: user.username })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.delete("/api/crm/leads/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "leads", "delete")
      if (!user) return
      const existing = await getLead(db, String(req.params.id), user)
      if (!existing) {
        res.status(404).json({ message: "Lead not found" })
        return
      }
      await db.prepare("UPDATE leads SET deleted_at = NOW() WHERE id = ?").run(req.params.id)
      await logActivity(db, { entityType: "lead", entityId: String(req.params.id), action: "delete", actor: user.username })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/crm/leads/bulk-delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "leads", "delete")
      if (!user) return
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : []
      if (!ids.length) {
        res.status(400).json({ message: "Select at least one lead" })
        return
      }
      for (const id of ids) {
        const existing = await getLead(db, id, user)
        if (existing) await db.prepare("UPDATE leads SET deleted_at = NOW() WHERE id = ?").run(id)
      }
      res.json({ ok: true, count: ids.length })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/crm/leads/:id/convert", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "leads", "edit")
      if (!user) return
      const lead = await getLead(db, String(req.params.id), user)
      if (!lead) {
        res.status(404).json({ message: "Lead not found" })
        return
      }
      if (lead.status === "converted") {
        res.status(400).json({ message: "Lead already converted" })
        return
      }
      if (lead.status !== "qualified" && !req.body?.force) {
        res.status(400).json({ message: "Only qualified leads can be converted (or pass force=true)" })
        return
      }

      const contactCount = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM contacts")
      const contactId = randomUUID()
      const contactNo = `CT${pad(Number(contactCount[0]?.n ?? 0) + 1)}`
      const fullName = `${lead.firstName} ${lead.lastName}`
      await db
        .prepare(
          `INSERT INTO contacts (
             id, contact_no, full_name, job_title, company, email, phone, department, location, address,
             owner_username, status, preferred_channel, notes, source_lead_id
           ) VALUES (?, ?, ?, ?, ?, ?, ?, '', '', '', ?, 'active', 'email', ?, ?)`,
        )
        .run(
          contactId,
          contactNo,
          fullName,
          lead.jobTitle,
          lead.company,
          lead.email,
          lead.phone,
          lead.ownerUsername,
          lead.notes,
          lead.id,
        )

      const oppCount = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM opportunities")
      const oppId = randomUUID()
      const oppNo = `OP${pad(Number(oppCount[0]?.n ?? 0) + 1)}`
      const amount = Number(req.body?.amount ?? 100000)
      await db
        .prepare(
          `INSERT INTO opportunities (
             id, opportunity_no, name, contact_id, company, stage, amount, probability, expected_close,
             owner_username, notes, source_lead_id
           ) VALUES (?, ?, ?, ?, ?, 'qualification', ?, 30, ?, ?, ?, ?)`,
        )
        .run(
          oppId,
          oppNo,
          String(req.body?.opportunityName ?? `${lead.company || fullName} opportunity`),
          contactId,
          lead.company,
          amount,
          req.body?.expectedClose ? String(req.body.expectedClose) : null,
          lead.ownerUsername,
          "Created from lead conversion",
          lead.id,
        )

      await db
        .prepare(
          `UPDATE leads SET status='converted', converted_contact_id=?, converted_opportunity_id=?, updated_at=NOW() WHERE id=?`,
        )
        .run(contactId, oppId, lead.id)
      await logActivity(db, {
        entityType: "lead",
        entityId: lead.id,
        action: "convert",
        details: `contact=${contactNo} opp=${oppNo}`,
        actor: user.username,
      })
      res.status(201).json({ contactId, contactNo, opportunityId: oppId, opportunityNo: oppNo })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/crm/leads/:id/notes", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "leads", "edit")
      if (!user) return
      const lead = await getLead(db, String(req.params.id), user)
      if (!lead) {
        res.status(404).json({ message: "Lead not found" })
        return
      }
      const body = String(req.body?.body ?? "").trim()
      if (!body) {
        res.status(400).json({ message: "Note body is required" })
        return
      }
      const id = randomUUID()
      await db
        .prepare("INSERT INTO interaction_notes (id, entity_type, entity_id, body, actor) VALUES (?, 'lead', ?, ?, ?)")
        .run(id, req.params.id, body, user.username)
      res.status(201).json({ id })
    } catch (error) {
      next(error)
    }
  })

  // —— Contacts ——
  app.get("/api/crm/contacts", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "contacts", "view")
      if (!user) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const company = String(req.query.company ?? "").trim().toLowerCase()
      const owner = String(req.query.owner ?? "").trim()
      const status = String(req.query.status ?? "").trim()
      const scope = ownerFilter(user)
      const where = ["deleted_at IS NULL"]
      const params: unknown[] = []
      if (scope.sql) {
        where.push("owner_username = ?")
        params.push(...scope.params)
      }
      if (company) {
        where.push("LOWER(company) LIKE ?")
        params.push(`%${company}%`)
      }
      if (owner && user.role !== "salesrep") {
        where.push("owner_username = ?")
        params.push(owner)
      }
      if (status) {
        where.push("status = ?")
        params.push(status)
      }
      if (q) {
        where.push("(LOWER(full_name) LIKE ? OR LOWER(company) LIKE ? OR LOWER(email) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(contact_no) LIKE ?)")
        const like = `%${q}%`
        params.push(like, like, like, like, like)
      }
      const whereSql = where.join(" AND ")
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM contacts WHERE ${whereSql}`, params)
      const rows = await db.query(
        `SELECT id, contact_no AS "contactNo", full_name AS "fullName", job_title AS "jobTitle", company, email, phone,
                department, location, owner_username AS "ownerUsername", status, preferred_channel AS "preferredChannel",
                created_at AS "createdAt"
         FROM contacts WHERE ${whereSql}
         ORDER BY full_name ASC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/crm/contacts/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "contacts", "view")
      if (!user) return
      const row = await getContact(db, String(req.params.id), user)
      if (!row) {
        res.status(404).json({ message: "Contact not found" })
        return
      }
      const [opportunities, activities, interactionNotes] = await Promise.all([
        db.query(
          `SELECT id, opportunity_no AS "opportunityNo", name, stage, amount::float AS amount, probability, expected_close AS "expectedClose"
           FROM opportunities WHERE deleted_at IS NULL AND contact_id = ? ORDER BY updated_at DESC`,
          [req.params.id],
        ),
        db.query(
          `SELECT id, activity_no AS "activityNo", title, activity_type AS "activityType", status, start_at AS "startAt"
           FROM activities WHERE deleted_at IS NULL AND related_type = 'contact' AND related_id = ?
           ORDER BY start_at DESC LIMIT 20`,
          [req.params.id],
        ),
        db.query(
          `SELECT id, body, actor, created_at AS "createdAt" FROM interaction_notes
           WHERE entity_type = 'contact' AND entity_id = ? ORDER BY created_at DESC LIMIT 20`,
          [req.params.id],
        ),
      ])
      res.json({ ...row, opportunities, activities, interactionNotes })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/crm/contacts", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "contacts", "create")
      if (!user) return
      const body = req.body ?? {}
      const fullName = String(body.fullName ?? "").trim()
      const email = String(body.email ?? "").trim().toLowerCase()
      if (fullName.length < 2) {
        res.status(400).json({ message: "Full name is required", field: "fullName" })
        return
      }
      if (!EMAIL_RE.test(email)) {
        res.status(400).json({ message: "Valid email is required", field: "email" })
        return
      }
      const dup = await db.query<{ id: string }>(
        "SELECT id FROM contacts WHERE deleted_at IS NULL AND LOWER(email) = ? LIMIT 1",
        [email],
      )
      if (dup[0] && !body.allowDuplicate) {
        res.status(409).json({ message: "A contact with this email already exists", code: "DUPLICATE_CONTACT", id: dup[0].id })
        return
      }
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM contacts")
      const id = randomUUID()
      const contactNo = `CT${pad(Number(count[0]?.n ?? 0) + 1)}`
      const owner = user.role === "salesrep" ? user.username : String(body.ownerUsername ?? user.username)
      await db
        .prepare(
          `INSERT INTO contacts (
             id, contact_no, full_name, job_title, company, email, phone, alt_phone, department, location, address,
             owner_username, status, preferred_channel, notes
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          contactNo,
          fullName,
          String(body.jobTitle ?? ""),
          String(body.company ?? ""),
          email,
          String(body.phone ?? ""),
          String(body.altPhone ?? ""),
          String(body.department ?? ""),
          String(body.location ?? ""),
          String(body.address ?? ""),
          owner,
          String(body.status ?? "active"),
          String(body.preferredChannel ?? "email"),
          String(body.notes ?? ""),
        )
      await logActivity(db, { entityType: "contact", entityId: id, action: "create", details: contactNo, actor: user.username })
      res.status(201).json({ id, contactNo })
    } catch (error) {
      next(error)
    }
  })

  app.patch("/api/crm/contacts/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "contacts", "edit")
      if (!user) return
      const existing = await getContact(db, String(req.params.id), user)
      if (!existing) {
        res.status(404).json({ message: "Contact not found" })
        return
      }
      const b = req.body ?? {}
      await db
        .prepare(
          `UPDATE contacts SET full_name=COALESCE(NULLIF(?, ''), full_name), job_title=COALESCE(?, job_title),
             company=COALESCE(?, company), email=COALESCE(NULLIF(?, ''), email), phone=COALESCE(?, phone),
             alt_phone=COALESCE(?, alt_phone), department=COALESCE(?, department), location=COALESCE(?, location),
             address=COALESCE(?, address), status=COALESCE(NULLIF(?, ''), status),
             preferred_channel=COALESCE(NULLIF(?, ''), preferred_channel), notes=COALESCE(?, notes),
             owner_username=COALESCE(NULLIF(?, ''), owner_username), updated_at=NOW()
           WHERE id=?`,
        )
        .run(
          b.fullName != null ? String(b.fullName) : "",
          b.jobTitle != null ? String(b.jobTitle) : null,
          b.company != null ? String(b.company) : null,
          b.email != null ? String(b.email).toLowerCase() : "",
          b.phone != null ? String(b.phone) : null,
          b.altPhone != null ? String(b.altPhone) : null,
          b.department != null ? String(b.department) : null,
          b.location != null ? String(b.location) : null,
          b.address != null ? String(b.address) : null,
          b.status != null ? String(b.status) : "",
          b.preferredChannel != null ? String(b.preferredChannel) : "",
          b.notes != null ? String(b.notes) : null,
          user.role === "salesrep" ? existing.ownerUsername : b.ownerUsername != null ? String(b.ownerUsername) : "",
          req.params.id,
        )
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.delete("/api/crm/contacts/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "contacts", "delete")
      if (!user) return
      const existing = await getContact(db, String(req.params.id), user)
      if (!existing) {
        res.status(404).json({ message: "Contact not found" })
        return
      }
      await db.prepare("UPDATE contacts SET deleted_at = NOW() WHERE id = ?").run(req.params.id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  // —— Activities ——
  app.get("/api/crm/activities", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "activities", "view")
      if (!user) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const status = String(req.query.status ?? "").trim()
      const type = String(req.query.type ?? "").trim()
      const from = String(req.query.from ?? "").trim()
      const to = String(req.query.to ?? "").trim()
      const overdue = String(req.query.overdue ?? "") === "true"
      const scope = ownerFilter(user)
      const where = ["deleted_at IS NULL"]
      const params: unknown[] = []
      if (scope.sql) {
        where.push("owner_username = ?")
        params.push(...scope.params)
      }
      if (status) {
        where.push("status = ?")
        params.push(status)
      }
      if (type) {
        where.push("activity_type = ?")
        params.push(type)
      }
      if (from) {
        where.push("start_at >= ?")
        params.push(new Date(from).toISOString())
      }
      if (to) {
        where.push("start_at <= ?")
        params.push(new Date(to).toISOString())
      }
      if (overdue) {
        where.push("status IN ('planned','in_progress') AND start_at < NOW()")
      }
      if (q) {
        where.push("(LOWER(title) LIKE ? OR LOWER(activity_no) LIKE ? OR LOWER(description) LIKE ?)")
        const like = `%${q}%`
        params.push(like, like, like)
      }
      const whereSql = where.join(" AND ")
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM activities WHERE ${whereSql}`, params)
      const rows = await db.query(
        `SELECT id, activity_no AS "activityNo", title, description, activity_type AS "activityType",
                related_type AS "relatedType", related_id AS "relatedId", owner_username AS "ownerUsername",
                priority, status, start_at AS "startAt", end_at AS "endAt", all_day AS "allDay",
                reminder_minutes AS "reminderMinutes", recurrence
         FROM activities WHERE ${whereSql}
         ORDER BY start_at ASC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/crm/activities", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "activities", "create")
      if (!user) return
      const body = req.body ?? {}
      const title = String(body.title ?? "").trim()
      const startAt = new Date(String(body.startAt ?? ""))
      const endAt = new Date(String(body.endAt ?? body.startAt ?? ""))
      if (!title) {
        res.status(400).json({ message: "Title is required" })
        return
      }
      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        res.status(400).json({ message: "Valid start and end date/time are required" })
        return
      }
      if (endAt <= startAt && !body.allDay) {
        res.status(400).json({ message: "End must be after start" })
        return
      }
      const owner = user.role === "salesrep" ? user.username : String(body.ownerUsername ?? user.username)
      const conflicts = await db.query<{ id: string; title: string }>(
        `SELECT id, title FROM activities
         WHERE deleted_at IS NULL AND owner_username = ? AND status IN ('planned','in_progress')
           AND start_at < ? AND end_at > ?
         LIMIT 3`,
        [owner, endAt.toISOString(), startAt.toISOString()],
      )
      if (conflicts.length && !body.ignoreConflict) {
        res.status(409).json({
          message: "Scheduling conflict with an existing activity",
          code: "SCHEDULE_CONFLICT",
          conflicts,
        })
        return
      }
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM activities")
      const id = randomUUID()
      const activityNo = `AC${pad(Number(count[0]?.n ?? 0) + 1)}`
      await db
        .prepare(
          `INSERT INTO activities (
             id, activity_no, title, description, activity_type, related_type, related_id, owner_username,
             priority, status, start_at, end_at, all_day, reminder_minutes, recurrence
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          activityNo,
          title,
          String(body.description ?? ""),
          String(body.activityType ?? "call"),
          body.relatedType ? String(body.relatedType) : null,
          body.relatedId ? String(body.relatedId) : null,
          owner,
          String(body.priority ?? "medium"),
          String(body.status ?? "planned"),
          startAt.toISOString(),
          endAt.toISOString(),
          Boolean(body.allDay),
          body.reminderMinutes != null ? Number(body.reminderMinutes) : null,
          String(body.recurrence ?? "none"),
        )
      await logActivity(db, { entityType: "activity", entityId: id, action: "create", details: activityNo, actor: user.username })
      res.status(201).json({ id, activityNo, conflicts: conflicts.length ? conflicts : undefined })
    } catch (error) {
      next(error)
    }
  })

  app.patch("/api/crm/activities/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "activities", "edit")
      if (!user) return
      const rows = await db.query<{ id: string; owner_username: string }>(
        "SELECT id, owner_username FROM activities WHERE id = ? AND deleted_at IS NULL",
        [req.params.id],
      )
      if (!rows[0] || (user.role === "salesrep" && rows[0].owner_username !== user.username)) {
        res.status(404).json({ message: "Activity not found" })
        return
      }
      const b = req.body ?? {}
      await db
        .prepare(
          `UPDATE activities SET
             title = COALESCE(NULLIF(?, ''), title),
             description = COALESCE(?, description),
             activity_type = COALESCE(NULLIF(?, ''), activity_type),
             priority = COALESCE(NULLIF(?, ''), priority),
             status = COALESCE(NULLIF(?, ''), status),
             start_at = COALESCE(?, start_at),
             end_at = COALESCE(?, end_at),
             all_day = COALESCE(?, all_day),
             reminder_minutes = COALESCE(?, reminder_minutes),
             recurrence = COALESCE(NULLIF(?, ''), recurrence),
             updated_at = NOW()
           WHERE id = ?`,
        )
        .run(
          b.title != null ? String(b.title) : "",
          b.description != null ? String(b.description) : null,
          b.activityType != null ? String(b.activityType) : "",
          b.priority != null ? String(b.priority) : "",
          b.status != null ? String(b.status) : "",
          b.startAt ? new Date(String(b.startAt)).toISOString() : null,
          b.endAt ? new Date(String(b.endAt)).toISOString() : null,
          b.allDay != null ? Boolean(b.allDay) : null,
          b.reminderMinutes != null ? Number(b.reminderMinutes) : null,
          b.recurrence != null ? String(b.recurrence) : "",
          req.params.id,
        )
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/crm/activities/:id/complete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "activities", "edit")
      if (!user) return
      await db.prepare("UPDATE activities SET status='completed', updated_at=NOW() WHERE id=? AND deleted_at IS NULL").run(req.params.id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/crm/activities/:id/cancel", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "activities", "edit")
      if (!user) return
      await db.prepare("UPDATE activities SET status='cancelled', updated_at=NOW() WHERE id=? AND deleted_at IS NULL").run(req.params.id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  // —— Opportunities / pipeline ——
  app.get("/api/crm/opportunities", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "pipeline", "view")
      if (!user) return
      const scope = ownerFilter(user)
      const stage = String(req.query.stage ?? "").trim()
      const where = ["o.deleted_at IS NULL"]
      const params: unknown[] = []
      if (scope.sql) {
        where.push("o.owner_username = ?")
        params.push(...scope.params)
      }
      if (stage) {
        where.push("o.stage = ?")
        params.push(stage)
      }
      const rows = await db.query(
        `SELECT o.id, o.opportunity_no AS "opportunityNo", o.name, o.company, o.stage, o.amount::float AS amount,
                o.probability, o.expected_close AS "expectedClose", o.owner_username AS "ownerUsername",
                o.close_reason AS "closeReason", o.notes, c.full_name AS "contactName", c.id AS "contactId"
         FROM opportunities o
         LEFT JOIN contacts c ON c.id = o.contact_id
         WHERE ${where.join(" AND ")}
         ORDER BY o.expected_close ASC NULLS LAST, o.amount DESC`,
        params,
      )
      const summary = await db.query<{ stage: string; n: number; value: number }>(
        `SELECT stage, COUNT(*)::int AS n, COALESCE(SUM(amount),0)::float AS value
         FROM opportunities o WHERE ${where.join(" AND ")} GROUP BY stage`,
        params,
      )
      res.json({ data: rows, summary })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/crm/opportunities", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "pipeline", "create")
      if (!user) return
      const body = req.body ?? {}
      const name = String(body.name ?? "").trim()
      if (!name) {
        res.status(400).json({ message: "Opportunity name is required" })
        return
      }
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM opportunities")
      const id = randomUUID()
      const opportunityNo = `OP${pad(Number(count[0]?.n ?? 0) + 1)}`
      await db
        .prepare(
          `INSERT INTO opportunities (
             id, opportunity_no, name, contact_id, company, stage, amount, probability, expected_close, owner_username, notes
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          opportunityNo,
          name,
          body.contactId ? String(body.contactId) : null,
          String(body.company ?? ""),
          String(body.stage ?? "new"),
          Number(body.amount ?? 0),
          Number(body.probability ?? 10),
          body.expectedClose ? String(body.expectedClose) : null,
          user.role === "salesrep" ? user.username : String(body.ownerUsername ?? user.username),
          String(body.notes ?? ""),
        )
      res.status(201).json({ id, opportunityNo })
    } catch (error) {
      next(error)
    }
  })

  app.patch("/api/crm/opportunities/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "pipeline", "edit")
      if (!user) return
      const b = req.body ?? {}
      if ((b.stage === "won" || b.stage === "lost") && !String(b.closeReason ?? "").trim()) {
        res.status(400).json({ message: "Close reason is required for Won/Lost", field: "closeReason" })
        return
      }
      await db
        .prepare(
          `UPDATE opportunities SET
             name = COALESCE(NULLIF(?, ''), name),
             stage = COALESCE(NULLIF(?, ''), stage),
             amount = COALESCE(?, amount),
             probability = COALESCE(?, probability),
             expected_close = COALESCE(?, expected_close),
             notes = COALESCE(?, notes),
             close_reason = COALESCE(?, close_reason),
             updated_at = NOW()
           WHERE id = ? AND deleted_at IS NULL`,
        )
        .run(
          b.name != null ? String(b.name) : "",
          b.stage != null ? String(b.stage) : "",
          b.amount != null ? Number(b.amount) : null,
          b.probability != null ? Number(b.probability) : null,
          b.expectedClose != null ? String(b.expectedClose) : null,
          b.notes != null ? String(b.notes) : null,
          b.closeReason != null ? String(b.closeReason) : null,
          req.params.id,
        )
      await logActivity(db, {
        entityType: "opportunity",
        entityId: String(req.params.id),
        action: "update",
        details: b.stage ? `stage=${b.stage}` : undefined,
        actor: user.username,
      })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/crm/reports", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "reports", "view")
      if (!user) return
      const scope = ownerFilter(user)
      const [byStatus, bySource, byOwner, byStage, activityStats] = await Promise.all([
        db.query<{ status: string; n: number }>(
          `SELECT status, COUNT(*)::int AS n FROM leads WHERE deleted_at IS NULL ${scope.sql} GROUP BY status`,
          scope.params,
        ),
        db.query<{ source: string; n: number }>(
          `SELECT source, COUNT(*)::int AS n FROM leads WHERE deleted_at IS NULL ${scope.sql} GROUP BY source ORDER BY n DESC`,
          scope.params,
        ),
        db.query<{ owner: string; n: number }>(
          `SELECT owner_username AS owner, COUNT(*)::int AS n FROM activities
           WHERE deleted_at IS NULL ${scope.sql} GROUP BY owner_username`,
          scope.params,
        ),
        db.query<{ stage: string; n: number; value: number }>(
          `SELECT stage, COUNT(*)::int AS n, COALESCE(SUM(amount),0)::float AS value
           FROM opportunities WHERE deleted_at IS NULL ${scope.sql} GROUP BY stage`,
          scope.params,
        ),
        db.query<{ completed: number; overdue: number; planned: number }>(
          `SELECT
             COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
             COUNT(*) FILTER (WHERE status IN ('planned','in_progress') AND start_at < NOW())::int AS overdue,
             COUNT(*) FILTER (WHERE status = 'planned')::int AS planned
           FROM activities WHERE deleted_at IS NULL ${scope.sql}`,
          scope.params,
        ),
      ])
      const totalLeads = byStatus.reduce((s, r) => s + r.n, 0)
      const converted = byStatus.find((r) => r.status === "converted")?.n ?? 0
      res.json({
        leadsByStatus: byStatus,
        leadsBySource: bySource,
        activitiesByOwner: byOwner,
        opportunitiesByStage: byStage,
        activityStats: activityStats[0] ?? { completed: 0, overdue: 0, planned: 0 },
        conversionRate: totalLeads ? Math.round((converted / totalLeads) * 1000) / 10 : 0,
        closedValue: byStage.filter((s) => s.stage === "won").reduce((s, r) => s + r.value, 0),
        pipelineValue: byStage.filter((s) => !["won", "lost"].includes(s.stage)).reduce((s, r) => s + r.value, 0),
      })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/crm/search", async (req, res, next) => {
    try {
      const user = await requireUser(db, req, res)
      if (!user) return
      const q = String(req.query.q ?? "").trim().toLowerCase()
      if (q.length < 2) {
        res.json({ leads: [], contacts: [], opportunities: [] })
        return
      }
      const like = `%${q}%`
      const scope = ownerFilter(user)
      const [leads, contacts, opportunities] = await Promise.all([
        db.query(
          `SELECT id, lead_no AS "leadNo", first_name AS "firstName", last_name AS "lastName", company
           FROM leads WHERE deleted_at IS NULL ${scope.sql}
             AND (LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(company) LIKE ? OR LOWER(email) LIKE ?)
           LIMIT 8`,
          [...scope.params, like, like, like, like],
        ),
        db.query(
          `SELECT id, contact_no AS "contactNo", full_name AS "fullName", company
           FROM contacts WHERE deleted_at IS NULL ${scope.sql}
             AND (LOWER(full_name) LIKE ? OR LOWER(company) LIKE ? OR LOWER(email) LIKE ?)
           LIMIT 8`,
          [...scope.params, like, like, like],
        ),
        db.query(
          `SELECT id, opportunity_no AS "opportunityNo", name, stage
           FROM opportunities WHERE deleted_at IS NULL ${scope.sql}
             AND (LOWER(name) LIKE ? OR LOWER(company) LIKE ?)
           LIMIT 8`,
          [...scope.params, like, like],
        ),
      ])
      res.json({ leads, contacts, opportunities })
    } catch (error) {
      next(error)
    }
  })
}

type LeadRow = {
  id: string
  leadNo: string
  firstName: string
  lastName: string
  company: string
  email: string
  phone: string
  jobTitle: string
  source: string
  industry: string
  companySize: string
  status: string
  rating: string
  ownerUsername: string
  notes: string
  tags: string
  nextFollowUpAt: string | null
  lastContactedAt: string | null
}

async function getLead(db: AppDatabase, id: string, user: { username: string; role: string }) {
  const rows = await db.query<LeadRow>(
    `SELECT id, lead_no AS "leadNo", first_name AS "firstName", last_name AS "lastName", company, email, phone,
            job_title AS "jobTitle", source, industry, company_size AS "companySize", status, rating,
            owner_username AS "ownerUsername", notes, tags, next_follow_up_at AS "nextFollowUpAt",
            last_contacted_at AS "lastContactedAt", created_at AS "createdAt",
            converted_contact_id AS "convertedContactId", converted_opportunity_id AS "convertedOpportunityId"
     FROM leads WHERE id = ? AND deleted_at IS NULL`,
    [id],
  )
  const row = rows[0]
  if (!row) return undefined
  if (user.role === "salesrep" && row.ownerUsername !== user.username) return undefined
  return row
}

async function getContact(db: AppDatabase, id: string, user: { username: string; role: string }) {
  const rows = await db.query(
    `SELECT id, contact_no AS "contactNo", full_name AS "fullName", job_title AS "jobTitle", company, email, phone,
            alt_phone AS "altPhone", department, location, address, owner_username AS "ownerUsername", status,
            preferred_channel AS "preferredChannel", notes, source_lead_id AS "sourceLeadId", created_at AS "createdAt"
     FROM contacts WHERE id = ? AND deleted_at IS NULL`,
    [id],
  )
  const row = rows[0] as { ownerUsername: string } | undefined
  if (!row) return undefined
  if (user.role === "salesrep" && row.ownerUsername !== user.username) return undefined
  return rows[0]
}

function validateLeadBody(body: Record<string, unknown>) {
  const errors: string[] = []
  if (!String(body.firstName ?? "").trim()) errors.push("First name is required")
  if (!String(body.lastName ?? "").trim()) errors.push("Last name is required")
  if (!EMAIL_RE.test(String(body.email ?? "").trim())) errors.push("Valid email is required")
  const phone = String(body.phone ?? "").trim()
  if (phone && !PHONE_RE.test(phone)) errors.push("Phone must be a 10-digit Indian mobile number")
  return errors
}

function flattenLeadPatch(body: Record<string, unknown>) {
  return {
    firstName: body.firstName,
    lastName: body.lastName,
    company: body.company,
    email: body.email,
    phone: body.phone,
    jobTitle: body.jobTitle,
    source: body.source,
    industry: body.industry,
    companySize: body.companySize,
    status: body.status,
    rating: body.rating,
    notes: body.notes,
    tags: body.tags,
    nextFollowUpAt: body.nextFollowUpAt,
  }
}
