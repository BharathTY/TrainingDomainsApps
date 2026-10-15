export const ROLES = ["admin", "salesmgr", "salesrep", "readonly"] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  salesmgr: "Sales Manager",
  salesrep: "Sales Representative",
  readonly: "Read-Only User",
}

export type Action = "view" | "create" | "edit" | "delete" | "export" | "approve"

export const MODULES = [
  { id: "dashboard", label: "Dashboard", path: "dashboard", group: "Overview" },
  { id: "leads", label: "Leads", path: "leads", group: "Sales" },
  { id: "contacts", label: "Contacts", path: "contacts", group: "Sales" },
  { id: "activities", label: "Follow-ups", path: "activities", group: "Activities" },
  { id: "calendar", label: "Calendar", path: "calendar", group: "Activities" },
  { id: "pipeline", label: "Pipeline", path: "pipeline", group: "Sales" },
  { id: "reports", label: "Reports", path: "reports", group: "Insights" },
  { id: "practice", label: "Practice Lab", path: "practice", group: "Training" },
  { id: "settings", label: "Settings", path: "settings", group: "System" },
] as const

export type ModuleId = (typeof MODULES)[number]["id"]

const ALL: Action[] = ["view", "create", "edit", "delete", "export", "approve"]
const VIEW: Action[] = ["view"]
const CRUD: Action[] = ["view", "create", "edit", "delete", "export"]
const EDIT: Action[] = ["view", "create", "edit", "export"]

export const PERMISSIONS: Record<Role, Partial<Record<ModuleId, readonly Action[]>>> = {
  admin: Object.fromEntries(MODULES.map((m) => [m.id, ALL])) as Record<ModuleId, Action[]>,
  salesmgr: {
    dashboard: VIEW,
    leads: CRUD,
    contacts: CRUD,
    activities: CRUD,
    calendar: CRUD,
    pipeline: ["view", "create", "edit", "approve", "export"],
    reports: ["view", "export"],
    practice: VIEW,
    settings: VIEW,
  },
  salesrep: {
    dashboard: VIEW,
    leads: EDIT,
    contacts: EDIT,
    activities: EDIT,
    calendar: EDIT,
    pipeline: EDIT,
    reports: VIEW,
    practice: VIEW,
  },
  readonly: {
    dashboard: VIEW,
    leads: VIEW,
    contacts: VIEW,
    activities: VIEW,
    calendar: VIEW,
    pipeline: VIEW,
    reports: VIEW,
    practice: VIEW,
  },
}

export function can(role: Role, moduleId: ModuleId, action: Action) {
  return PERMISSIONS[role][moduleId]?.includes(action) ?? false
}

export function visibleModules(role: Role) {
  return MODULES.filter((module) => can(role, module.id, "view"))
}
