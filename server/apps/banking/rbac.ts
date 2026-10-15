export const BANKING_ROLES = ["admin", "customer", "teller", "manager"] as const
export type BankingRole = (typeof BANKING_ROLES)[number]
export type ModuleAction = "view" | "create" | "edit" | "delete" | "export" | "approve"

const ALL: ModuleAction[] = ["view", "create", "edit", "delete", "export", "approve"]
const VIEW: ModuleAction[] = ["view"]
const CRUD: ModuleAction[] = ["view", "create", "edit", "delete", "export"]

const MODULES = [
  "dashboard",
  "accounts",
  "transfers",
  "statements",
  "beneficiaries",
  "scheduled",
  "profile",
  "practice",
  "settings",
] as const

export const ROLE_PERMISSIONS: Record<BankingRole, Record<string, ModuleAction[]>> = {
  admin: Object.fromEntries(MODULES.map((m) => [m, ALL])),
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

export function can(role: string, moduleId: string, action: ModuleAction) {
  if (!BANKING_ROLES.includes(role as BankingRole)) return false
  return ROLE_PERMISSIONS[role as BankingRole][moduleId]?.includes(action) ?? false
}
