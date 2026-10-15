export const ROLES = ["admin", "assetmgr", "technician", "deptmgr", "employee"] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  assetmgr: "Asset Manager",
  technician: "Maintenance Technician",
  deptmgr: "Department Manager",
  employee: "Employee",
}

export type Action = "view" | "create" | "edit" | "delete" | "export" | "approve"

export const MODULES = [
  { id: "dashboard", label: "Dashboard", path: "dashboard", group: "Overview" },
  { id: "assets", label: "Asset register", path: "assets", group: "Register" },
  { id: "categories", label: "Categories", path: "categories", group: "Register" },
  { id: "assignments", label: "Assignments", path: "assignments", group: "Register" },
  { id: "maintenance", label: "Maintenance", path: "maintenance", group: "Operations" },
  { id: "calendar", label: "Calendar", path: "calendar", group: "Operations" },
  { id: "vendors", label: "Vendors", path: "vendors", group: "Operations" },
  { id: "reports", label: "Reports", path: "reports", group: "Insights" },
  { id: "practice", label: "Practice Lab", path: "practice", group: "Training" },
  { id: "settings", label: "Settings", path: "settings", group: "System" },
] as const

export type ModuleId = (typeof MODULES)[number]["id"]

const ALL: Action[] = ["view", "create", "edit", "delete", "export", "approve"]
const VIEW: Action[] = ["view"]
const CRUD: Action[] = ["view", "create", "edit", "delete", "export"]

export const PERMISSIONS: Record<Role, Partial<Record<ModuleId, readonly Action[]>>> = {
  admin: Object.fromEntries(MODULES.map((m) => [m.id, ALL])) as Record<ModuleId, Action[]>,
  assetmgr: {
    dashboard: VIEW,
    assets: CRUD,
    categories: CRUD,
    assignments: CRUD,
    maintenance: ["view", "create", "edit", "export"],
    calendar: VIEW,
    vendors: CRUD,
    reports: ["view", "export"],
    practice: VIEW,
  },
  technician: {
    dashboard: VIEW,
    assets: VIEW,
    maintenance: ["view", "edit", "export"],
    calendar: VIEW,
    reports: VIEW,
    practice: VIEW,
  },
  deptmgr: {
    dashboard: VIEW,
    assets: VIEW,
    assignments: ["view", "approve", "export"],
    maintenance: ["view", "create"],
    reports: VIEW,
    practice: VIEW,
  },
  employee: {
    dashboard: VIEW,
    assets: VIEW,
    maintenance: ["view", "create"],
    practice: VIEW,
  },
}

export function can(role: Role, moduleId: ModuleId, action: Action) {
  return PERMISSIONS[role][moduleId]?.includes(action) ?? false
}

export function visibleModules(role: Role) {
  return MODULES.filter((module) => can(role, module.id, "view"))
}
