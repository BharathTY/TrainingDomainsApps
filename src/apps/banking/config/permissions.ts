export const ROLES = ["admin", "customer", "teller", "manager"] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  customer: "Customer",
  teller: "Teller",
  manager: "Branch Manager",
}

export type Action = "view" | "create" | "edit" | "delete" | "export" | "approve"

export const MODULES = [
  { id: "dashboard", label: "Dashboard", path: "dashboard", group: "Overview" },
  { id: "accounts", label: "Accounts", path: "accounts", group: "Banking" },
  { id: "transfers", label: "Transfers", path: "transfers", group: "Banking" },
  { id: "statements", label: "Statements", path: "statements", group: "Banking" },
  { id: "beneficiaries", label: "Beneficiaries", path: "beneficiaries", group: "Payments" },
  { id: "scheduled", label: "Scheduled payments", path: "scheduled", group: "Payments" },
  { id: "profile", label: "Profile", path: "profile", group: "Settings" },
  { id: "practice", label: "Practice Lab", path: "practice", group: "Training" },
  { id: "settings", label: "Settings", path: "settings", group: "System" },
] as const

export type ModuleId = (typeof MODULES)[number]["id"]

const ALL: Action[] = ["view", "create", "edit", "delete", "export", "approve"]
const VIEW: Action[] = ["view"]
const CRUD: Action[] = ["view", "create", "edit", "delete", "export"]

export const PERMISSIONS: Record<Role, Partial<Record<ModuleId, readonly Action[]>>> = {
  admin: Object.fromEntries(MODULES.map((m) => [m.id, ALL])) as Record<ModuleId, Action[]>,
  customer: {
    dashboard: VIEW,
    accounts: VIEW,
    transfers: ["view", "create", "edit"],
    statements: ["view", "export"],
    beneficiaries: CRUD,
    scheduled: CRUD,
    profile: ["view", "edit"],
    practice: VIEW,
  },
  teller: {
    dashboard: VIEW,
    accounts: VIEW,
    transfers: ["view", "create", "edit"],
    statements: ["view", "export"],
    beneficiaries: VIEW,
    scheduled: VIEW,
    practice: VIEW,
  },
  manager: {
    dashboard: VIEW,
    accounts: VIEW,
    transfers: ["view", "create", "edit", "approve", "export"],
    statements: ["view", "export"],
    beneficiaries: VIEW,
    scheduled: ["view", "edit", "approve"],
    profile: VIEW,
    practice: VIEW,
    settings: VIEW,
  },
}

export function can(role: Role, moduleId: ModuleId, action: Action) {
  return PERMISSIONS[role][moduleId]?.includes(action) ?? false
}

export function visibleModules(role: Role) {
  return MODULES.filter((module) => can(role, module.id, "view"))
}
