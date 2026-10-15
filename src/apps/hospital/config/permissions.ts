export const ROLES = ["admin", "doctor", "receptionist", "wardmgr", "billing", "student"] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  doctor: "Doctor",
  receptionist: "Receptionist",
  wardmgr: "Ward Manager",
  billing: "Billing Staff",
  student: "Training Student",
}

export type Action = "view" | "create" | "edit" | "delete" | "export" | "admit"

export const MODULES = [
  { id: "dashboard", label: "Dashboard", path: "dashboard", group: "Overview" },
  { id: "doctors", label: "Doctors", path: "doctors", group: "Clinical" },
  { id: "patients", label: "Patients", path: "patients", group: "Clinical" },
  { id: "wards", label: "Wards & beds", path: "wards", group: "Clinical" },
  { id: "appointments", label: "Appointments", path: "appointments", group: "Clinical" },
  { id: "calendar", label: "Calendar", path: "calendar", group: "Clinical" },
  { id: "admissions", label: "Admissions", path: "admissions", group: "Clinical" },
  { id: "staff", label: "Staff", path: "staff", group: "Admin" },
  { id: "billing", label: "Billing", path: "billing", group: "Admin" },
  { id: "reports", label: "Reports", path: "reports", group: "Admin" },
  { id: "practice", label: "Training Lab", path: "practice", group: "Training" },
  { id: "settings", label: "Settings", path: "settings", group: "System" },
] as const

export type ModuleId = (typeof MODULES)[number]["id"]

const ALL: Action[] = ["view", "create", "edit", "delete", "export", "admit"]
const VIEW: Action[] = ["view"]
const CRUD: Action[] = ["view", "create", "edit", "delete", "export"]

export const PERMISSIONS: Record<Role, Partial<Record<ModuleId, readonly Action[]>>> = {
  admin: Object.fromEntries(MODULES.map((m) => [m.id, ALL])) as Record<ModuleId, Action[]>,
  doctor: {
    dashboard: VIEW,
    doctors: VIEW,
    patients: VIEW,
    appointments: ["view", "edit", "export"],
    calendar: VIEW,
    admissions: VIEW,
    reports: VIEW,
    practice: VIEW,
  },
  receptionist: {
    dashboard: VIEW,
    doctors: VIEW,
    patients: CRUD,
    appointments: CRUD,
    calendar: ["view", "create", "edit"],
    admissions: VIEW,
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
    calendar: VIEW,
    reports: VIEW,
    practice: ALL,
  },
}

export function can(role: Role, moduleId: ModuleId, action: Action) {
  return PERMISSIONS[role][moduleId]?.includes(action) ?? false
}

export function visibleModules(role: Role) {
  return MODULES.filter((module) => can(role, module.id, "view"))
}
