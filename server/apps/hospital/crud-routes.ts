import { randomUUID } from "node:crypto"
import type { Express } from "express"
import { z } from "zod"
import type { AppDatabase } from "../../shared/db"
import { logActivity, requirePerm } from "./api-helpers"

export function registerHospitalCrud(app: Express, db: AppDatabase) {
  const doctorBody = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    specialization: z.string().min(1),
    departmentId: z.string().min(1),
    qualification: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(8),
    joiningDate: z.string().min(1),
    consultationFee: z.coerce.number().positive(),
    shiftStart: z.string().min(1),
    shiftEnd: z.string().min(1),
    availability: z.enum(["available", "busy", "on_leave"]).default("available"),
    employmentStatus: z.enum(["active", "inactive"]).default("active"),
    wardId: z.string().optional().nullable(),
  })

  app.post("/api/hospital/doctors", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "doctors", "create")
      if (!user) return
      const body = doctorBody.parse(req.body)
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM doctors")
      const id = randomUUID()
      const doctorNo = `D${String(Number(count[0]?.n ?? 0) + 1).padStart(4, "0")}`
      await db
        .prepare(
          `INSERT INTO doctors (id, doctor_no, first_name, last_name, specialization, department_id, qualification, email, phone, joining_date, consultation_fee, shift_start, shift_end, availability, employment_status, ward_id, profile_image, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          doctorNo,
          body.firstName,
          body.lastName,
          body.specialization,
          body.departmentId,
          body.qualification,
          body.email,
          body.phone,
          body.joiningDate,
          body.consultationFee,
          body.shiftStart,
          body.shiftEnd,
          body.availability,
          body.employmentStatus,
          body.wardId || null,
          `https://api.dicebear.com/7.x/initials/svg?seed=${body.firstName}${body.lastName}`,
          user.username,
        )
      await logActivity(db, { entityType: "doctor", entityId: id, action: "create", actor: user.username })
      res.status(201).json({ id, doctorNo })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/hospital/doctors/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "doctors", "edit")
      if (!user) return
      const body = doctorBody.parse(req.body)
      const id = String(req.params.id)
      await db
        .prepare(
          `UPDATE doctors SET first_name=?, last_name=?, specialization=?, department_id=?, qualification=?, email=?, phone=?, joining_date=?, consultation_fee=?, shift_start=?, shift_end=?, availability=?, employment_status=?, ward_id=?, updated_by=?, updated_at=NOW()
           WHERE id=? AND deleted_at IS NULL`,
        )
        .run(
          body.firstName,
          body.lastName,
          body.specialization,
          body.departmentId,
          body.qualification,
          body.email,
          body.phone,
          body.joiningDate,
          body.consultationFee,
          body.shiftStart,
          body.shiftEnd,
          body.availability,
          body.employmentStatus,
          body.wardId || null,
          user.username,
          id,
        )
      await logActivity(db, { entityType: "doctor", entityId: id, action: "update", actor: user.username })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/hospital/doctors/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "doctors", "delete")
      if (!user) return
      const id = String(req.params.id)
      await db
        .prepare("UPDATE doctors SET deleted_at = NOW(), employment_status = 'inactive', updated_by = ? WHERE id = ?")
        .run(user.username, id)
      await logActivity(db, { entityType: "doctor", entityId: id, action: "deactivate", actor: user.username })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  const patientBody = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.string().min(1),
    gender: z.enum(["male", "female", "other"]),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().min(8),
    address: z.string().optional(),
    emergencyContact: z.string().optional(),
    bloodGroup: z.string().optional(),
    assignedDoctorId: z.string().optional().nullable(),
    registrationStatus: z.enum(["active", "inactive"]).default("active"),
  })

  app.post("/api/hospital/patients", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "patients", "create")
      if (!user) return
      const body = patientBody.parse(req.body)
      const dup = await db.query<{ id: string }>(
        "SELECT id FROM patients WHERE phone = ? AND deleted_at IS NULL LIMIT 1",
        [body.phone],
      )
      if (dup[0]) {
        res.status(409).json({ message: "A patient with this phone number is already registered", code: "DUPLICATE_PATIENT" })
        return
      }
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM patients")
      const id = randomUUID()
      const patientNo = `P${String(Number(count[0]?.n ?? 0) + 1).padStart(5, "0")}`
      await db
        .prepare(
          `INSERT INTO patients (id, patient_no, first_name, last_name, date_of_birth, gender, email, phone, address, emergency_contact, blood_group, registration_status, assigned_doctor_id, admission_status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'outpatient', ?)`,
        )
        .run(
          id,
          patientNo,
          body.firstName,
          body.lastName,
          body.dateOfBirth,
          body.gender,
          body.email || null,
          body.phone,
          body.address ?? null,
          body.emergencyContact ?? null,
          body.bloodGroup ?? null,
          body.registrationStatus,
          body.assignedDoctorId || null,
          user.username,
        )
      await logActivity(db, { entityType: "patient", entityId: id, action: "register", actor: user.username })
      res.status(201).json({ id, patientNo })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/hospital/patients/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "patients", "edit")
      if (!user) return
      const body = patientBody.parse(req.body)
      const id = String(req.params.id)
      await db
        .prepare(
          `UPDATE patients SET first_name=?, last_name=?, date_of_birth=?, gender=?, email=?, phone=?, address=?, emergency_contact=?, blood_group=?, registration_status=?, assigned_doctor_id=?, updated_by=?, updated_at=NOW()
           WHERE id=? AND deleted_at IS NULL`,
        )
        .run(
          body.firstName,
          body.lastName,
          body.dateOfBirth,
          body.gender,
          body.email || null,
          body.phone,
          body.address ?? null,
          body.emergencyContact ?? null,
          body.bloodGroup ?? null,
          body.registrationStatus,
          body.assignedDoctorId || null,
          user.username,
          id,
        )
      await logActivity(db, { entityType: "patient", entityId: id, action: "update", actor: user.username })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/hospital/patients/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "patients", "delete")
      if (!user) return
      const id = String(req.params.id)
      const admitted = await db.query<{ n: number }>(
        "SELECT COUNT(*)::int AS n FROM admissions WHERE patient_id = ? AND status = 'admitted'",
        [id],
      )
      if (Number(admitted[0]?.n ?? 0) > 0) {
        res.status(400).json({ message: "Discharge the patient before deleting the registration" })
        return
      }
      await db.prepare("UPDATE patients SET deleted_at = NOW(), registration_status = 'inactive' WHERE id = ?").run(id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  const wardBody = z.object({
    name: z.string().min(1),
    wardType: z.enum(["General", "ICU", "Emergency", "Maternity", "Pediatric", "Private"]),
    floorNumber: z.coerce.number().int().min(0),
    bedCapacity: z.coerce.number().int().positive(),
    operationalStatus: z.enum(["open", "closed"]).default("open"),
  })

  app.post("/api/hospital/wards", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "wards", "create")
      if (!user) return
      const body = wardBody.parse(req.body)
      const count = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM wards")
      const id = randomUUID()
      const wardNo = `W${String(Number(count[0]?.n ?? 0) + 1).padStart(2, "0")}`
      await db
        .prepare(
          "INSERT INTO wards (id, ward_no, name, ward_type, floor_number, bed_capacity, operational_status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(id, wardNo, body.name, body.wardType, body.floorNumber, body.bedCapacity, body.operationalStatus)
      for (let b = 1; b <= body.bedCapacity; b += 1) {
        await db
          .prepare("INSERT INTO beds (id, bed_no, ward_id, bed_type, status) VALUES (?, ?, ?, 'standard', 'available')")
          .run(randomUUID(), String(b).padStart(2, "0"), id)
      }
      res.status(201).json({ id, wardNo })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/hospital/wards/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "wards", "edit")
      if (!user) return
      const body = wardBody.parse(req.body)
      await db
        .prepare("UPDATE wards SET name=?, ward_type=?, floor_number=?, bed_capacity=?, operational_status=? WHERE id=?")
        .run(body.name, body.wardType, body.floorNumber, body.bedCapacity, body.operationalStatus, String(req.params.id))
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/hospital/wards/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "wards", "delete")
      if (!user) return
      const id = String(req.params.id)
      const occupied = await db.query<{ n: number }>(
        "SELECT COUNT(*)::int AS n FROM beds WHERE ward_id = ? AND status = 'occupied'",
        [id],
      )
      if (Number(occupied[0]?.n ?? 0) > 0) {
        res.status(400).json({ message: "Ward has occupied beds" })
        return
      }
      await db.prepare("UPDATE wards SET deleted_at = NOW() WHERE id = ?").run(id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/hospital/beds/:id/status", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "wards", "edit")
      if (!user) return
      const body = z.object({ status: z.enum(["available", "occupied", "reserved", "maintenance"]) }).parse(req.body)
      const id = String(req.params.id)
      const bed = await db.query<{ status: string; assigned_patient_id: string | null }>(
        "SELECT status, assigned_patient_id FROM beds WHERE id = ?",
        [id],
      )
      if (!bed[0]) {
        res.status(404).json({ message: "Bed not found" })
        return
      }
      if (body.status === "available" && bed[0].assigned_patient_id) {
        res.status(400).json({ message: "Discharge or transfer the patient before marking the bed available" })
        return
      }
      await db.prepare("UPDATE beds SET status = ?, last_status_at = NOW() WHERE id = ?").run(body.status, id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  const appointmentBody = z.object({
    patientId: z.string().min(1),
    doctorId: z.string().min(1),
    departmentId: z.string().optional(),
    appointmentDate: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    appointmentType: z.string().default("consultation"),
    reason: z.string().optional(),
    notes: z.string().optional(),
    status: z
      .enum(["scheduled", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"])
      .default("scheduled"),
  })

  async function hasConflict(doctorId: string, date: string, start: string, end: string, excludeId?: string) {
    const rows = await db.query<{ id: string }>(
      `SELECT id FROM appointments
       WHERE doctor_id = ? AND appointment_date = ?
         AND status NOT IN ('cancelled', 'no_show')
         AND start_time < ? AND end_time > ?
         ${excludeId ? "AND id <> ?" : ""}
       LIMIT 1`,
      excludeId ? [doctorId, date, end, start, excludeId] : [doctorId, date, end, start],
    )
    return Boolean(rows[0])
  }

  app.post("/api/hospital/appointments", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "appointments", "create")
      if (!user) return
      const body = appointmentBody.parse(req.body)
      if (body.appointmentDate < new Date().toISOString().slice(0, 10) && body.status === "scheduled") {
        res.status(400).json({ message: "Cannot schedule an appointment in the past" })
        return
      }
      if (await hasConflict(body.doctorId, body.appointmentDate, body.startTime, body.endTime)) {
        res.status(409).json({ message: "Doctor already has an overlapping appointment", code: "APPOINTMENT_CONFLICT" })
        return
      }
      const doctor = await db.query<{ department_id: string }>("SELECT department_id FROM doctors WHERE id = ?", [
        body.doctorId,
      ])
      const id = randomUUID()
      const appointmentNo = `APT${Date.now().toString().slice(-6)}`
      await db
        .prepare(
          `INSERT INTO appointments (id, appointment_no, patient_id, doctor_id, department_id, appointment_date, start_time, end_time, appointment_type, reason, status, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          appointmentNo,
          body.patientId,
          body.doctorId,
          body.departmentId || doctor[0]?.department_id || null,
          body.appointmentDate,
          body.startTime,
          body.endTime,
          body.appointmentType,
          body.reason ?? null,
          body.status,
          body.notes ?? null,
          user.username,
        )
      await logActivity(db, { entityType: "appointment", entityId: id, action: "create", actor: user.username })
      res.status(201).json({ id, appointmentNo })
    } catch (error) {
      next(error)
    }
  })

  app.put("/api/hospital/appointments/:id", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "appointments", "edit")
      if (!user) return
      const body = appointmentBody.parse(req.body)
      const id = String(req.params.id)
      if (await hasConflict(body.doctorId, body.appointmentDate, body.startTime, body.endTime, id)) {
        res.status(409).json({ message: "Doctor already has an overlapping appointment", code: "APPOINTMENT_CONFLICT" })
        return
      }
      await db
        .prepare(
          `UPDATE appointments SET patient_id=?, doctor_id=?, department_id=?, appointment_date=?, start_time=?, end_time=?, appointment_type=?, reason=?, status=?, notes=?, updated_by=?, updated_at=NOW()
           WHERE id=?`,
        )
        .run(
          body.patientId,
          body.doctorId,
          body.departmentId || null,
          body.appointmentDate,
          body.startTime,
          body.endTime,
          body.appointmentType,
          body.reason ?? null,
          body.status,
          body.notes ?? null,
          user.username,
          id,
        )
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/hospital/appointments/:id/status", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "appointments", "edit")
      if (!user) return
      const body = z
        .object({
          status: z.enum(["scheduled", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"]),
          cancelReason: z.string().optional(),
        })
        .parse(req.body)
      const id = String(req.params.id)
      await db
        .prepare("UPDATE appointments SET status = ?, cancel_reason = COALESCE(?, cancel_reason), updated_by = ?, updated_at = NOW() WHERE id = ?")
        .run(body.status, body.cancelReason ?? null, user.username, id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/hospital/appointments/:id/delete", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "appointments", "delete")
      if (!user) return
      const id = String(req.params.id)
      const row = await db.query<{ status: string }>("SELECT status FROM appointments WHERE id = ?", [id])
      if (!row[0] || !["scheduled", "cancelled"].includes(row[0].status)) {
        res.status(400).json({ message: "Only scheduled or cancelled appointments can be deleted" })
        return
      }
      await db.prepare("DELETE FROM appointments WHERE id = ?").run(id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  const admitBody = z.object({
    patientId: z.string().min(1),
    wardId: z.string().min(1),
    bedId: z.string().min(1),
    doctorId: z.string().optional(),
    notes: z.string().optional(),
  })

  app.post("/api/hospital/admissions", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "admissions", "admit")
      if (!user) return
      const body = admitBody.parse(req.body)
      const existing = await db.query<{ id: string }>(
        "SELECT id FROM admissions WHERE patient_id = ? AND status = 'admitted' LIMIT 1",
        [body.patientId],
      )
      if (existing[0]) {
        res.status(409).json({ message: "Patient already has an active admission" })
        return
      }
      const bed = await db.query<{ status: string; ward_id: string; assigned_patient_id: string | null }>(
        "SELECT status, ward_id, assigned_patient_id FROM beds WHERE id = ?",
        [body.bedId],
      )
      if (!bed[0] || bed[0].ward_id !== body.wardId) {
        res.status(400).json({ message: "Bed does not belong to the selected ward" })
        return
      }
      if (bed[0].status !== "available" || bed[0].assigned_patient_id) {
        res.status(409).json({ message: "Bed is not available" })
        return
      }
      const id = randomUUID()
      const admissionNo = `A${Date.now().toString().slice(-5)}`
      await db
        .prepare(
          `INSERT INTO admissions (id, admission_no, patient_id, ward_id, bed_id, doctor_id, status, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?, 'admitted', ?, ?)`,
        )
        .run(id, admissionNo, body.patientId, body.wardId, body.bedId, body.doctorId || null, body.notes ?? null, user.username)
      await db
        .prepare("UPDATE beds SET status = 'occupied', assigned_patient_id = ?, last_status_at = NOW() WHERE id = ?")
        .run(body.patientId, body.bedId)
      await db.prepare("UPDATE patients SET admission_status = 'admitted' WHERE id = ?").run(body.patientId)
      await logActivity(db, { entityType: "admission", entityId: id, action: "admit", actor: user.username })
      res.status(201).json({ id, admissionNo })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/hospital/admissions/:id/discharge", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "admissions", "admit")
      if (!user) return
      const id = String(req.params.id)
      const adm = await db.query<{ patient_id: string; bed_id: string; status: string }>(
        "SELECT patient_id, bed_id, status FROM admissions WHERE id = ?",
        [id],
      )
      if (!adm[0] || adm[0].status !== "admitted") {
        res.status(400).json({ message: "Admission is not active" })
        return
      }
      await db.prepare("UPDATE admissions SET status = 'discharged', discharged_at = NOW() WHERE id = ?").run(id)
      await db
        .prepare("UPDATE beds SET status = 'available', assigned_patient_id = NULL, last_status_at = NOW() WHERE id = ?")
        .run(adm[0].bed_id)
      await db.prepare("UPDATE patients SET admission_status = 'outpatient' WHERE id = ?").run(adm[0].patient_id)
      await logActivity(db, { entityType: "admission", entityId: id, action: "discharge", actor: user.username })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/hospital/admissions/:id/transfer", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "admissions", "admit")
      if (!user) return
      const body = z.object({ wardId: z.string(), bedId: z.string() }).parse(req.body)
      const id = String(req.params.id)
      const adm = await db.query<{ patient_id: string; bed_id: string; status: string }>(
        "SELECT patient_id, bed_id, status FROM admissions WHERE id = ?",
        [id],
      )
      if (!adm[0] || adm[0].status !== "admitted") {
        res.status(400).json({ message: "Admission is not active" })
        return
      }
      const bed = await db.query<{ status: string; ward_id: string }>("SELECT status, ward_id FROM beds WHERE id = ?", [
        body.bedId,
      ])
      if (!bed[0] || bed[0].status !== "available" || bed[0].ward_id !== body.wardId) {
        res.status(409).json({ message: "Target bed is not available" })
        return
      }
      await db
        .prepare("UPDATE beds SET status = 'available', assigned_patient_id = NULL, last_status_at = NOW() WHERE id = ?")
        .run(adm[0].bed_id)
      await db
        .prepare("UPDATE beds SET status = 'occupied', assigned_patient_id = ?, last_status_at = NOW() WHERE id = ?")
        .run(adm[0].patient_id, body.bedId)
      await db.prepare("UPDATE admissions SET ward_id = ?, bed_id = ? WHERE id = ?").run(body.wardId, body.bedId, id)
      await logActivity(db, {
        entityType: "admission",
        entityId: id,
        action: "transfer",
        details: `${adm[0].bed_id} -> ${body.bedId}`,
        actor: user.username,
      })
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/hospital/billing/:id/pay", async (req, res, next) => {
    try {
      const user = await requirePerm(db, req, res, "billing", "edit")
      if (!user) return
      const body = z.object({ method: z.enum(["cash", "card", "upi"]).default("cash") }).parse(req.body ?? {})
      const id = String(req.params.id)
      const inv = await db.query<{ amount: number; tax_amount: number; status: string }>(
        "SELECT amount::float AS amount, tax_amount::float AS tax_amount, status FROM invoices WHERE id = ?",
        [id],
      )
      if (!inv[0] || inv[0].status === "paid") {
        res.status(400).json({ message: "Invoice not payable" })
        return
      }
      const total = inv[0].amount + inv[0].tax_amount
      await db
        .prepare("INSERT INTO payments (id, payment_no, invoice_id, amount, method, paid_on, created_by) VALUES (?, ?, ?, ?, ?, CURRENT_DATE, ?)")
        .run(randomUUID(), `PAY${Date.now().toString().slice(-6)}`, id, total, body.method, user.username)
      await db.prepare("UPDATE invoices SET status = 'paid', paid_on = CURRENT_DATE WHERE id = ?").run(id)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })
}
