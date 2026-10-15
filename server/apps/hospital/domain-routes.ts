import type { Express } from "express"
import type { AppDatabase } from "../../shared/db"
import { okList, parsePaging, requirePerm, requireUser } from "./api-helpers"
import { registerHospitalCrud } from "./crud-routes"
import { ROLE_PERMISSIONS } from "./rbac"

export function registerHospitalApi(app: Express, db: AppDatabase) {
  app.get("/api/hospital/v1/openapi.json", (_req, res) => {
    res.json({
      openapi: "3.0.3",
      info: {
        title: "MediCare HMS Practice API",
        version: "1.0.0",
        description: "Synthetic hospital training data only — not for real clinical use.",
      },
      servers: [{ url: "/api/hospital" }],
      paths: {
        "/dashboard": { get: { summary: "Dashboard KPIs" } },
        "/doctors": { get: { summary: "List doctors" }, post: { summary: "Create doctor" } },
        "/patients": { get: { summary: "List patients" }, post: { summary: "Register patient" } },
        "/appointments": { get: { summary: "List appointments" }, post: { summary: "Schedule appointment" } },
        "/admissions": { get: { summary: "List admissions" }, post: { summary: "Admit patient" } },
      },
    })
  })

  app.get("/api/hospital/permissions/me", async (req, res, next) => {
    try {
      const user = await requireUser(db, req, res)
      if (!user) return
      res.json({ role: user.role, permissions: ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] ?? {} })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/hospital/dashboard", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "dashboard", "view"))) return
      const [doctors, patients, beds, todayAppt, upcoming, admissions, pendingDischarge, recent, statusDist, wards] =
        await Promise.all([
          db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM doctors WHERE deleted_at IS NULL AND employment_status = 'active'"),
          db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM patients WHERE deleted_at IS NULL"),
          db.query<{ available: number; occupied: number; maintenance: number }>(`
            SELECT COUNT(*) FILTER (WHERE status = 'available')::int AS available,
                   COUNT(*) FILTER (WHERE status = 'occupied')::int AS occupied,
                   COUNT(*) FILTER (WHERE status = 'maintenance')::int AS maintenance
            FROM beds`),
          db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM appointments WHERE appointment_date = CURRENT_DATE AND status NOT IN ('cancelled')"),
          db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM appointments WHERE appointment_date > CURRENT_DATE AND status IN ('scheduled','confirmed')"),
          db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM admissions WHERE status = 'admitted'"),
          db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM admissions WHERE status = 'admitted' AND admitted_at < NOW() - INTERVAL '3 days'"),
          db.query(
            `SELECT id, patient_no AS "patientNo", first_name AS "firstName", last_name AS "lastName", registered_at AS "registeredAt"
             FROM patients WHERE deleted_at IS NULL ORDER BY registered_at DESC LIMIT 8`,
          ),
          db.query<{ status: string; n: number }>(
            "SELECT status, COUNT(*)::int AS n FROM appointments GROUP BY status ORDER BY status",
          ),
          db.query<{ name: string; capacity: number; occupied: number }>(`
            SELECT w.name, w.bed_capacity AS capacity,
                   COUNT(b.id) FILTER (WHERE b.status = 'occupied')::int AS occupied
            FROM wards w LEFT JOIN beds b ON b.ward_id = w.id
            WHERE w.deleted_at IS NULL
            GROUP BY w.id ORDER BY w.ward_no`),
        ])
      const notifications = await db.query(
        `SELECT id, title, body, link_path AS "linkPath", created_at AS "createdAt"
         FROM notifications ORDER BY created_at DESC LIMIT 10`,
      )
      res.json({
        doctors: Number(doctors[0]?.n ?? 0),
        patients: Number(patients[0]?.n ?? 0),
        beds: beds[0] ?? { available: 0, occupied: 0, maintenance: 0 },
        todayAppointments: Number(todayAppt[0]?.n ?? 0),
        upcomingAppointments: Number(upcoming[0]?.n ?? 0),
        currentAdmissions: Number(admissions[0]?.n ?? 0),
        pendingDischarges: Number(pendingDischarge[0]?.n ?? 0),
        recentRegistrations: recent,
        appointmentStatus: statusDist,
        wardOccupancy: wards,
        notifications,
      })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/hospital/lookups", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "dashboard", "view"))) return
      const [departments, doctors, patients, wards, beds] = await Promise.all([
        db.query(`SELECT id, code, name FROM departments WHERE deleted_at IS NULL ORDER BY code`),
        db.query(
          `SELECT id, doctor_no AS code, first_name || ' ' || last_name AS name, department_id AS "departmentId"
           FROM doctors WHERE deleted_at IS NULL AND employment_status = 'active' ORDER BY doctor_no`,
        ),
        db.query(
          `SELECT id, patient_no AS code, first_name || ' ' || last_name AS name
           FROM patients WHERE deleted_at IS NULL ORDER BY patient_no LIMIT 300`,
        ),
        db.query(`SELECT id, ward_no AS code, name, ward_type AS "wardType" FROM wards WHERE deleted_at IS NULL ORDER BY ward_no`),
        db.query(
          `SELECT id, bed_no AS code, ward_id AS "wardId", status FROM beds WHERE status = 'available' ORDER BY ward_id, bed_no`,
        ),
      ])
      res.json({ departments, doctors, patients, wards, beds })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/hospital/doctors", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "doctors", "view"))) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const availability = String(req.query.availability ?? "")
      const status = String(req.query.status ?? "")
      const params: unknown[] = []
      let where = "d.deleted_at IS NULL"
      if (q) {
        where += " AND (LOWER(d.first_name) LIKE ? OR LOWER(d.last_name) LIKE ? OR LOWER(d.specialization) LIKE ? OR LOWER(dep.name) LIKE ? OR LOWER(d.doctor_no) LIKE ?)"
        const like = `%${q}%`
        params.push(like, like, like, like, like)
      }
      if (availability) {
        where += " AND d.availability = ?"
        params.push(availability)
      }
      if (status) {
        where += " AND d.employment_status = ?"
        params.push(status)
      }
      const total = await db.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM doctors d JOIN departments dep ON dep.id = d.department_id WHERE ${where}`,
        params,
      )
      const rows = await db.query(
        `SELECT d.id, d.doctor_no AS "doctorNo", d.first_name AS "firstName", d.last_name AS "lastName",
                d.specialization, d.department_id AS "departmentId", dep.name AS department,
                d.qualification, d.email, d.phone, d.joining_date AS "joiningDate",
                d.consultation_fee::float AS "consultationFee",
                d.shift_start AS "shiftStart", d.shift_end AS "shiftEnd",
                d.availability, d.employment_status AS "employmentStatus", d.ward_id AS "wardId",
                d.profile_image AS "profileImage"
         FROM doctors d JOIN departments dep ON dep.id = d.department_id
         WHERE ${where}
         ORDER BY d.doctor_no LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/hospital/doctors/:id", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "doctors", "view"))) return
      const id = String(req.params.id)
      const doctor = await db.query(
        `SELECT d.id, d.doctor_no AS "doctorNo", d.first_name AS "firstName", d.last_name AS "lastName",
                d.specialization, d.qualification, d.email, d.phone,
                d.joining_date AS "joiningDate", d.consultation_fee::float AS "consultationFee",
                d.shift_start AS "shiftStart", d.shift_end AS "shiftEnd",
                d.availability, d.employment_status AS "employmentStatus",
                d.department_id AS "departmentId", dep.name AS department
         FROM doctors d
         JOIN departments dep ON dep.id = d.department_id WHERE d.id = ? AND d.deleted_at IS NULL`,
        [id],
      )
      if (!doctor[0]) {
        res.status(404).json({ message: "Doctor not found" })
        return
      }
      const appointments = await db.query(
        `SELECT a.id, a.appointment_no AS "appointmentNo", a.appointment_date AS "appointmentDate",
                a.start_time AS "startTime", a.status, p.first_name || ' ' || p.last_name AS patient
         FROM appointments a JOIN patients p ON p.id = a.patient_id
         WHERE a.doctor_id = ? ORDER BY a.appointment_date DESC LIMIT 30`,
        [id],
      )
      const activity = await db.query(
        "SELECT action, details, created_at AS \"createdAt\" FROM activity_logs WHERE entity_type = 'doctor' AND entity_id = ? ORDER BY created_at DESC LIMIT 20",
        [id],
      )
      res.json({ doctor: doctor[0], appointments, activity })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/hospital/patients", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "patients", "view"))) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const params: unknown[] = []
      let where = "p.deleted_at IS NULL"
      if (q) {
        where += " AND (LOWER(p.first_name) LIKE ? OR LOWER(p.last_name) LIKE ? OR LOWER(p.patient_no) LIKE ? OR p.phone LIKE ?)"
        const like = `%${q}%`
        params.push(like, like, like, like)
      }
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM patients p WHERE ${where}`, params)
      const rows = await db.query(
        `SELECT p.id, p.patient_no AS "patientNo", p.first_name AS "firstName", p.last_name AS "lastName",
                p.date_of_birth AS "dateOfBirth", p.gender, p.email, p.phone, p.address,
                p.emergency_contact AS "emergencyContact", p.blood_group AS "bloodGroup",
                p.registration_status AS "registrationStatus", p.admission_status AS "admissionStatus",
                p.assigned_doctor_id AS "assignedDoctorId",
                d.first_name || ' ' || d.last_name AS "assignedDoctor",
                p.registered_at AS "registeredAt"
         FROM patients p
         LEFT JOIN doctors d ON d.id = p.assigned_doctor_id
         WHERE ${where}
         ORDER BY p.patient_no LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/hospital/patients/:id", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "patients", "view"))) return
      const id = String(req.params.id)
      const patient = await db.query(
        `SELECT id, patient_no AS "patientNo", first_name AS "firstName", last_name AS "lastName",
                date_of_birth AS "dateOfBirth", gender, email, phone, address,
                emergency_contact AS "emergencyContact", blood_group AS "bloodGroup",
                registration_status AS "registrationStatus", admission_status AS "admissionStatus",
                assigned_doctor_id AS "assignedDoctorId", registered_at AS "registeredAt"
         FROM patients WHERE id = ? AND deleted_at IS NULL`,
        [id],
      )
      if (!patient[0]) {
        res.status(404).json({ message: "Patient not found" })
        return
      }
      const [appointments, admissions, invoices, activity] = await Promise.all([
        db.query(
          `SELECT a.id, a.appointment_no AS "appointmentNo", a.appointment_date AS "appointmentDate", a.status,
                  doc.first_name || ' ' || doc.last_name AS doctor
           FROM appointments a JOIN doctors doc ON doc.id = a.doctor_id
           WHERE a.patient_id = ? ORDER BY a.appointment_date DESC LIMIT 30`,
          [id],
        ),
        db.query(
          `SELECT ad.id, ad.admission_no AS "admissionNo", ad.status, ad.admitted_at AS "admittedAt",
                  ad.discharged_at AS "dischargedAt", w.name AS ward, b.bed_no AS "bedNo"
           FROM admissions ad
           JOIN wards w ON w.id = ad.ward_id
           JOIN beds b ON b.id = ad.bed_id
           WHERE ad.patient_id = ? ORDER BY ad.admitted_at DESC`,
          [id],
        ),
        db.query(
          `SELECT id, invoice_no AS "invoiceNo", amount::float AS amount, status, issued_on AS "issuedOn"
           FROM invoices WHERE patient_id = ? ORDER BY issued_on DESC`,
          [id],
        ),
        db.query(
          "SELECT action, details, created_at AS \"createdAt\" FROM activity_logs WHERE entity_type = 'patient' AND entity_id = ? ORDER BY created_at DESC LIMIT 20",
          [id],
        ),
      ])
      res.json({ patient: patient[0], appointments, admissions, invoices, activity })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/hospital/wards", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "wards", "view"))) return
      const rows = await db.query(
        `SELECT w.id, w.ward_no AS "wardNo", w.name, w.ward_type AS "wardType", w.floor_number AS "floorNumber",
                w.bed_capacity AS "bedCapacity", w.operational_status AS "operationalStatus",
                w.supervisor_id AS "supervisorId",
                COUNT(b.id) FILTER (WHERE b.status = 'available')::int AS "availableBeds",
                COUNT(b.id) FILTER (WHERE b.status = 'occupied')::int AS "occupiedBeds"
         FROM wards w LEFT JOIN beds b ON b.ward_id = w.id
         WHERE w.deleted_at IS NULL
         GROUP BY w.id ORDER BY w.ward_no`,
      )
      res.json({ data: rows, total: rows.length, page: 1, pageSize: rows.length })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/hospital/wards/:id/beds", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "wards", "view"))) return
      const rows = await db.query(
        `SELECT b.id, b.bed_no AS "bedNo", b.bed_type AS "bedType", b.status,
                b.assigned_patient_id AS "assignedPatientId",
                p.patient_no AS "patientNo", p.first_name || ' ' || p.last_name AS "patientName",
                b.last_status_at AS "lastStatusAt"
         FROM beds b LEFT JOIN patients p ON p.id = b.assigned_patient_id
         WHERE b.ward_id = ? ORDER BY b.bed_no`,
        [String(req.params.id)],
      )
      res.json(rows)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/hospital/appointments", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "appointments", "view"))) return
      const { page, pageSize, offset, q } = parsePaging(req)
      const date = String(req.query.date ?? "")
      const status = String(req.query.status ?? "")
      const doctorId = String(req.query.doctorId ?? "")
      const params: unknown[] = []
      let where = "1=1"
      if (date) {
        where += " AND a.appointment_date = ?"
        params.push(date)
      }
      if (status) {
        where += " AND a.status = ?"
        params.push(status)
      }
      if (doctorId) {
        where += " AND a.doctor_id = ?"
        params.push(doctorId)
      }
      if (q) {
        where += " AND (LOWER(p.first_name) LIKE ? OR LOWER(p.last_name) LIKE ? OR LOWER(a.appointment_no) LIKE ?)"
        const like = `%${q}%`
        params.push(like, like, like)
      }
      const total = await db.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE ${where}`,
        params,
      )
      const rows = await db.query(
        `SELECT a.id, a.appointment_no AS "appointmentNo", a.patient_id AS "patientId", a.doctor_id AS "doctorId",
                a.department_id AS "departmentId", a.appointment_date AS "appointmentDate",
                a.start_time AS "startTime", a.end_time AS "endTime", a.appointment_type AS "appointmentType",
                a.reason, a.status, a.notes,
                p.first_name || ' ' || p.last_name AS patient,
                d.first_name || ' ' || d.last_name AS doctor
         FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         JOIN doctors d ON d.id = a.doctor_id
         WHERE ${where}
         ORDER BY a.appointment_date, a.start_time
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/hospital/admissions", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "admissions", "view"))) return
      const { page, pageSize, offset } = parsePaging(req)
      const status = String(req.query.status ?? "admitted")
      const params: unknown[] = []
      let where = "1=1"
      if (status) {
        where += " AND ad.status = ?"
        params.push(status)
      }
      const total = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM admissions ad WHERE ${where}`, params)
      const rows = await db.query(
        `SELECT ad.id, ad.admission_no AS "admissionNo", ad.patient_id AS "patientId", ad.ward_id AS "wardId",
                ad.bed_id AS "bedId", ad.doctor_id AS "doctorId", ad.status,
                ad.admitted_at AS "admittedAt", ad.discharged_at AS "dischargedAt",
                p.patient_no AS "patientNo", p.first_name || ' ' || p.last_name AS patient,
                w.name AS ward, b.bed_no AS "bedNo"
         FROM admissions ad
         JOIN patients p ON p.id = ad.patient_id
         JOIN wards w ON w.id = ad.ward_id
         JOIN beds b ON b.id = ad.bed_id
         WHERE ${where}
         ORDER BY ad.admitted_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/hospital/staff", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "staff", "view"))) return
      const rows = await db.query(
        `SELECT id, staff_no AS "staffNo", first_name AS "firstName", last_name AS "lastName",
                role, email, phone, status, joining_date AS "joiningDate", username
         FROM staff WHERE deleted_at IS NULL ORDER BY staff_no`,
      )
      res.json({ data: rows, total: rows.length, page: 1, pageSize: rows.length })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/hospital/billing", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "billing", "view"))) return
      const { page, pageSize, offset } = parsePaging(req)
      const total = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM invoices")
      const rows = await db.query(
        `SELECT i.id, i.invoice_no AS "invoiceNo", i.patient_id AS "patientId",
                p.first_name || ' ' || p.last_name AS patient, i.amount::float AS amount,
                i.tax_amount::float AS "taxAmount", i.status, i.issued_on AS "issuedOn", i.paid_on AS "paidOn"
         FROM invoices i JOIN patients p ON p.id = i.patient_id
         ORDER BY i.issued_on DESC LIMIT ? OFFSET ?`,
        [pageSize, offset],
      )
      okList(res, rows, Number(total[0]?.n ?? 0), page, pageSize)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/hospital/reports/:name", async (req, res, next) => {
    try {
      if (!(await requirePerm(db, req, res, "reports", "view"))) return
      const name = String(req.params.name)
      if (name === "appointments-today") {
        res.json({
          name,
          rows: await db.query(
            `SELECT a.appointment_no AS "appointmentNo", a.appointment_date AS "appointmentDate", a.start_time AS "startTime",
                    a.status, p.first_name || ' ' || p.last_name AS patient, d.first_name || ' ' || d.last_name AS doctor
             FROM appointments a
             JOIN patients p ON p.id = a.patient_id
             JOIN doctors d ON d.id = a.doctor_id
             WHERE a.appointment_date = CURRENT_DATE
             ORDER BY a.start_time`,
          ),
        })
        return
      }
      if (name === "ward-occupancy") {
        res.json({
          name,
          rows: await db.query(
            `SELECT w.ward_no AS "wardNo", w.name, w.ward_type AS "wardType", w.bed_capacity AS capacity,
                    COUNT(b.id) FILTER (WHERE b.status = 'occupied')::int AS occupied,
                    COUNT(b.id) FILTER (WHERE b.status = 'available')::int AS available
             FROM wards w LEFT JOIN beds b ON b.ward_id = w.id
             WHERE w.deleted_at IS NULL GROUP BY w.id ORDER BY w.ward_no`,
          ),
        })
        return
      }
      if (name === "billing-summary") {
        res.json({
          name,
          rows: await db.query(
            `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount + tax_amount),0)::float AS total
             FROM invoices GROUP BY status ORDER BY status`,
          ),
        })
        return
      }
      res.status(404).json({ message: "Unknown report" })
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/hospital/notifications", async (req, res, next) => {
    try {
      const user = await requireUser(db, req, res)
      if (!user) return
      res.json(
        await db.query(
          `SELECT id, title, body, link_path AS "linkPath", read_at AS "readAt", created_at AS "createdAt"
           FROM notifications WHERE username = ? ORDER BY created_at DESC LIMIT 30`,
          [user.username],
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  registerHospitalCrud(app, db)
}
