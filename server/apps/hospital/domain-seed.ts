import { fakerEN_IN as faker } from "@faker-js/faker"
import type { AppDatabase } from "../../shared/db"
import { HOSPITAL_CLEAR, HOSPITAL_TABLES } from "./schema"

type Statement = { sql: string; params?: unknown[] }

const SPECIALIZATIONS = ["General Medicine", "Cardiology", "Orthopedics", "Pediatrics", "Neurology", "Gynecology", "Dermatology", "ENT"]
const BLOOD = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
const WARD_TYPES = ["General", "ICU", "Emergency", "Maternity", "Pediatric", "Private"] as const

function d(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export async function ensureHospitalSchema(db: AppDatabase) {
  for (const sql of HOSPITAL_TABLES) await db.exec(sql)
}

export async function hospitalIsSeeded(db: AppDatabase) {
  const rows = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM departments")
  return Number(rows[0]?.n ?? 0) > 0
}

export async function seedHospitalDomain(db: AppDatabase) {
  for (const table of HOSPITAL_CLEAR) await db.exec(`DELETE FROM ${table}`)
  faker.seed(20261014)
  const statements: Statement[] = []

  const depts = [
    ["dept-gm", "GM", "General Medicine"],
    ["dept-card", "CARD", "Cardiology"],
    ["dept-ortho", "ORTHO", "Orthopedics"],
    ["dept-ped", "PED", "Pediatrics"],
    ["dept-neuro", "NEURO", "Neurology"],
    ["dept-gyn", "GYN", "Gynecology"],
    ["dept-er", "ER", "Emergency"],
  ] as const
  for (const [id, code, name] of depts) {
    statements.push({ sql: "INSERT INTO departments (id, code, name) VALUES (?, ?, ?)", params: [id, code, name] })
  }

  const staffRoles = [
    ["staff-1", "S0001", "Admin", "User", "admin", "admin"],
    ["staff-2", "S0002", "Priya", "Nair", "doctor", "doctor"],
    ["staff-3", "S0003", "Asha", "Rao", "receptionist", "receptionist"],
    ["staff-4", "S0004", "Vikram", "Singh", "wardmgr", "wardmgr"],
    ["staff-5", "S0005", "Meera", "Shah", "billing", "billing"],
    ["staff-6", "S0006", "Training", "Student", "student", "student"],
  ] as const
  for (const [id, no, first, last, role, username] of staffRoles) {
    statements.push({
      sql: `INSERT INTO staff (id, staff_no, first_name, last_name, role, email, phone, department_id, status, joining_date, username)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'dept-gm', 'active', '2022-01-15', ?)`,
      params: [id, no, first, last, role, `${username}@medicare.demo`, `9${faker.string.numeric(9)}`, username],
    })
  }

  const doctorIds: string[] = []
  for (let i = 1; i <= 40; i += 1) {
    const id = `doc-${i}`
    doctorIds.push(id)
    const first = faker.person.firstName()
    const last = faker.person.lastName()
    const dept = depts[i % depts.length]
    statements.push({
      sql: `INSERT INTO doctors (id, doctor_no, first_name, last_name, specialization, department_id, qualification, email, phone, joining_date, consultation_fee, shift_start, shift_end, availability, employment_status, profile_image, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '09:00', '17:00', ?, 'active', ?, 'admin')`,
      params: [
        id,
        `D${String(i).padStart(4, "0")}`,
        first,
        last,
        SPECIALIZATIONS[i % SPECIALIZATIONS.length],
        dept[0],
        i % 2 === 0 ? "MD" : "MS",
        faker.internet.email({ firstName: first, lastName: last }).toLowerCase(),
        `9${faker.string.numeric(9)}`,
        d("2018-01-01", i * 40),
        400 + (i % 8) * 100,
        i % 9 === 0 ? "on_leave" : "available",
        `https://api.dicebear.com/7.x/initials/svg?seed=${first}${last}`,
      ],
    })
  }

  const wardIds: string[] = []
  for (let i = 1; i <= 8; i += 1) {
    const id = `ward-${i}`
    wardIds.push(id)
    const type = WARD_TYPES[(i - 1) % WARD_TYPES.length]
    const capacity = type === "ICU" ? 8 : type === "Private" ? 6 : 12
    statements.push({
      sql: `INSERT INTO wards (id, ward_no, name, ward_type, floor_number, bed_capacity, supervisor_id, operational_status)
            VALUES (?, ?, ?, ?, ?, ?, 'staff-4', 'open')`,
      params: [id, `W${String(i).padStart(2, "0")}`, `${type} Ward ${i}`, type, 1 + (i % 4), capacity],
    })
    for (let b = 1; b <= capacity; b += 1) {
      statements.push({
        sql: "INSERT INTO beds (id, bed_no, ward_id, bed_type, status) VALUES (?, ?, ?, ?, 'available')",
        params: [`bed-${i}-${b}`, `${String(b).padStart(2, "0")}`, id, type === "ICU" ? "icu" : "standard"],
      })
    }
  }

  const patientIds: string[] = []
  for (let i = 1; i <= 220; i += 1) {
    const id = `pat-${i}`
    patientIds.push(id)
    const first = faker.person.firstName()
    const last = faker.person.lastName()
    statements.push({
      sql: `INSERT INTO patients (id, patient_no, first_name, last_name, date_of_birth, gender, email, phone, address, emergency_contact, blood_group, registration_status, assigned_doctor_id, admission_status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 'outpatient', 'receptionist')`,
      params: [
        id,
        `P${String(i).padStart(5, "0")}`,
        first,
        last,
        d("1970-01-01", i * 50),
        i % 2 === 0 ? "female" : "male",
        faker.internet.email({ firstName: first, lastName: last }).toLowerCase(),
        `9${faker.string.numeric(9)}`,
        `${faker.location.streetAddress()}, ${faker.location.city()}`,
        `${faker.person.fullName()} / 9${faker.string.numeric(9)}`,
        BLOOD[i % BLOOD.length],
        doctorIds[i % doctorIds.length],
      ],
    })
  }

  // Occupied beds + admissions (unique bed per admission)
  for (let i = 1; i <= 24; i += 1) {
    const wardIndex = ((i - 1) % 8) + 1
    const bedNum = Math.floor((i - 1) / 8) + 1
    const bedId = `bed-${wardIndex}-${bedNum}`
    const patientId = patientIds[i]
    const admissionId = `adm-${i}`
    statements.push({
      sql: "UPDATE beds SET status = 'occupied', assigned_patient_id = ?, last_status_at = NOW() WHERE id = ?",
      params: [patientId, bedId],
    })
    statements.push({
      sql: "UPDATE patients SET admission_status = 'admitted' WHERE id = ?",
      params: [patientId],
    })
    statements.push({
      sql: `INSERT INTO admissions (id, admission_no, patient_id, ward_id, bed_id, doctor_id, admitted_at, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'admitted', 'wardmgr')`,
      params: [
        admissionId,
        `A${String(i).padStart(4, "0")}`,
        patientId,
        `ward-${wardIndex}`,
        bedId,
        doctorIds[i % doctorIds.length],
        `${d("2026-10-10", i % 4)}T04:00:00.000Z`,
      ],
    })
  }

  // Maintenance beds (ward 3 has capacity 12)
  for (let i = 8; i <= 12; i += 1) {
    statements.push({
      sql: "UPDATE beds SET status = 'maintenance', assigned_patient_id = NULL, last_status_at = NOW() WHERE id = ?",
      params: [`bed-3-${i}`],
    })
  }

  const statuses = ["scheduled", "confirmed", "checked_in", "completed", "cancelled", "no_show"] as const
  for (let i = 1; i <= 120; i += 1) {
    const dayOffset = (i % 14) - 3
    const hour = 9 + (i % 7)
    const start = `${String(hour).padStart(2, "0")}:00`
    const end = `${String(hour).padStart(2, "0")}:30`
    statements.push({
      sql: `INSERT INTO appointments (id, appointment_no, patient_id, doctor_id, department_id, appointment_date, start_time, end_time, appointment_type, reason, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'consultation', ?, ?, 'receptionist')`,
      params: [
        `appt-${i}`,
        `APT${String(i).padStart(5, "0")}`,
        patientIds[(i + 30) % patientIds.length],
        doctorIds[i % doctorIds.length],
        depts[i % depts.length][0],
        d("2026-10-14", dayOffset),
        start,
        end,
        "Follow-up consultation (training)",
        statuses[i % statuses.length],
      ],
    })
  }

  for (let i = 1; i <= 40; i += 1) {
    const invId = `inv-${i}`
    const amount = 800 + i * 150
    statements.push({
      sql: `INSERT INTO invoices (id, invoice_no, patient_id, amount, tax_amount, status, issued_on, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'billing')`,
      params: [invId, `INV${String(i).padStart(4, "0")}`, patientIds[i], amount, amount * 0.05, i % 3 === 0 ? "paid" : "open", d("2026-10-01", i % 10)],
    })
    if (i % 3 === 0) {
      statements.push({
        sql: `INSERT INTO payments (id, payment_no, invoice_id, amount, method, paid_on, created_by)
              VALUES (?, ?, ?, ?, 'upi', CURRENT_DATE, 'billing')`,
        params: [`pay-${i}`, `PAY${String(i).padStart(4, "0")}`, invId, amount * 1.05],
      })
      statements.push({ sql: "UPDATE invoices SET paid_on = CURRENT_DATE WHERE id = ?", params: [invId] })
    }
  }

  for (const user of ["admin", "receptionist", "wardmgr", "billing", "doctor"]) {
    statements.push({
      sql: "INSERT INTO notifications (id, username, title, body, link_path) VALUES (?, ?, ?, ?, ?)",
      params: [`n-${user}`, user, "Pending hospital task", "Review today's appointments and admissions.", "dashboard"],
    })
  }

  statements.push({
    sql: "INSERT INTO activity_logs (id, entity_type, entity_id, action, details, actor) VALUES ('al-1', 'system', 'hospital', 'seed', 'MediCare HMS seed loaded', 'admin')",
  })

  await db.batch(statements)
}

export async function prepareHospital(db: AppDatabase) {
  await ensureHospitalSchema(db)
  if (!(await hospitalIsSeeded(db))) await seedHospitalDomain(db)
}
