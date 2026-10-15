export const RETAIL_ROLES = ["admin", "storemgr", "cashier", "inventory", "purchaser"] as const
export type RetailRole = (typeof RETAIL_ROLES)[number]
export type ModuleAction = "view" | "create" | "edit" | "delete" | "export" | "approve"

const ALL: ModuleAction[] = ["view", "create", "edit", "delete", "export", "approve"]
const VIEW: ModuleAction[] = ["view"]
const CRUD: ModuleAction[] = ["view", "create", "edit", "delete", "export"]

export const ROLE_PERMISSIONS: Record<RetailRole, Record<string, ModuleAction[]>> = {
  admin: Object.fromEntries(
    ["dashboard", "pos", "products", "inventory", "suppliers", "purchases", "sales", "promotions", "customers", "reports", "practice", "settings"].map(
      (m) => [m, ALL],
    ),
  ),
  storemgr: {
    dashboard: VIEW,
    pos: CRUD,
    products: CRUD,
    inventory: CRUD,
    suppliers: VIEW,
    purchases: ["view", "create", "edit", "approve", "export"],
    sales: CRUD,
    promotions: CRUD,
    customers: CRUD,
    reports: ["view", "export"],
    practice: VIEW,
  },
  cashier: {
    dashboard: VIEW,
    pos: ["view", "create", "edit"],
    products: VIEW,
    sales: ["view", "create"],
    customers: ["view", "create"],
    promotions: VIEW,
    practice: VIEW,
  },
  inventory: {
    dashboard: VIEW,
    products: VIEW,
    inventory: CRUD,
    purchases: ["view", "edit"],
    reports: VIEW,
    practice: VIEW,
  },
  purchaser: {
    dashboard: VIEW,
    products: VIEW,
    suppliers: CRUD,
    purchases: CRUD,
    inventory: VIEW,
    reports: VIEW,
    practice: VIEW,
  },
}

export function can(role: string, moduleId: string, action: ModuleAction) {
  if (!RETAIL_ROLES.includes(role as RetailRole)) return false
  return ROLE_PERMISSIONS[role as RetailRole][moduleId]?.includes(action) ?? false
}
