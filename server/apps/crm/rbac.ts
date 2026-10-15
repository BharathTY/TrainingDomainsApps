export const CRM_ROLES = ["admin", "salesmgr", "salesrep", "readonly"] as const
export type CrmRole = (typeof CRM_ROLES)[number]
export type ModuleAction = "view" | "create" | "edit" | "delete" | "export" | "approve"

const ALL: ModuleAction[] = ["view", "create", "edit", "delete", "export", "approve"]
const VIEW: ModuleAction[] = ["view"]
const CRUD: ModuleAction[] = ["view", "create", "edit", "delete", "export"]
const EDIT: ModuleAction[] = ["view", "create", "edit", "export"]

const MODULES = [
  "dashboard",
  "leads",
  "contacts",
  "activities",
  "calendar",
  "pipeline",
  "reports",
  "practice",
  "settings",
] as const

export const ROLE_PERMISSIONS: Record<CrmRole, Record<string, ModuleAction[]>> = {
  admin: Object.fromEntries(MODULES.map((m) => [m, ALL])),
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

export function can(role: string, moduleId: string, action: ModuleAction) {
  if (!CRM_ROLES.includes(role as CrmRole)) return false
  return ROLE_PERMISSIONS[role as CrmRole][moduleId]?.includes(action) ?? false
}

export function isScopedRep(role: string) {
  return role === "salesrep"
}
