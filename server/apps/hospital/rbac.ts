export const HOSPITAL_ROLES = ["admin", "doctor", "receptionist", "wardmgr", "billing", "student"] as const
export type HospitalRole = (typeof HOSPITAL_ROLES)[number]
export type ModuleAction = "view" | "create" | "edit" | "delete" | "export" | "admit"

const ALL: ModuleAction[] = ["view", "create", "edit", "delete", "export", "admit"]
const VIEW: ModuleAction[] = ["view"]
const CRUD: ModuleAction[] = ["view", "create", "edit", "delete", "export"]

export const ROLE_PERMISSIONS: Record<HospitalRole, Record<string, ModuleAction[]>> = {
  admin: Object.fromEntries(
    ["dashboard", "doctors", "patients", "wards", "appointments", "admissions", "staff", "billing", "reports", "practice", "settings", "calendar"].map(
      (m) => [m, ALL],
    ),
  ),
  doctor: {
    dashboard: VIEW,
    doctors: VIEW,
    patients: VIEW,
    appointments: ["view", "edit", "export"],
    admissions: VIEW,
    calendar: VIEW,
    reports: VIEW,
    practice: VIEW,
  },
  receptionist: {
    dashboard: VIEW,
    doctors: VIEW,
    patients: CRUD,
    appointments: CRUD,
    admissions: VIEW,
    calendar: ["view", "create", "edit"],
    billing: VIEW,
    reports: VIEW,
    practice: VIEW,
  },
  wardmgr: {
    dashboard: VIEW,
    patients: VIEW,
    wards: CRUD,
    admissions: ["view", "create", "edit", "admit", "export"],
    appointments: VIEW,
    calendar: VIEW,
    reports: VIEW,
    practice: VIEW,
  },
  billing: {
    dashboard: VIEW,
    patients: VIEW,
    billing: CRUD,
    admissions: VIEW,
    appointments: VIEW,
    reports: ["view", "export"],
    practice: VIEW,
  },
  student: {
    dashboard: VIEW,
    doctors: VIEW,
    patients: VIEW,
    wards: VIEW,
    appointments: VIEW,
    admissions: VIEW,
    practice: ALL,
    reports: VIEW,
    calendar: VIEW,
  },
}

export function can(role: string, moduleId: string, action: ModuleAction) {
  if (!HOSPITAL_ROLES.includes(role as HospitalRole)) return false
  return ROLE_PERMISSIONS[role as HospitalRole][moduleId]?.includes(action) ?? false
}
