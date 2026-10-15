export const ASSET_ROLES = ["admin", "assetmgr", "technician", "deptmgr", "employee"] as const
export type AssetRole = (typeof ASSET_ROLES)[number]
export type ModuleAction = "view" | "create" | "edit" | "delete" | "export" | "approve"

const ALL: ModuleAction[] = ["view", "create", "edit", "delete", "export", "approve"]
const VIEW: ModuleAction[] = ["view"]
const CRUD: ModuleAction[] = ["view", "create", "edit", "delete", "export"]

export const ROLE_PERMISSIONS: Record<AssetRole, Record<string, ModuleAction[]>> = {
  admin: Object.fromEntries(
    ["dashboard", "assets", "categories", "assignments", "maintenance", "calendar", "vendors", "reports", "practice", "settings"].map((m) => [
      m,
      ALL,
    ]),
  ),
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

export function can(role: string, moduleId: string, action: ModuleAction) {
  if (!ASSET_ROLES.includes(role as AssetRole)) return false
  return ROLE_PERMISSIONS[role as AssetRole][moduleId]?.includes(action) ?? false
}
