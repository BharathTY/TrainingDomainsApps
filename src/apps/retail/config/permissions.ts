export const ROLES = ["admin", "storemgr", "cashier", "inventory", "purchaser"] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  storemgr: "Store Manager",
  cashier: "Cashier",
  inventory: "Inventory Clerk",
  purchaser: "Purchaser",
}

export type Action = "view" | "create" | "edit" | "delete" | "export" | "approve"

export const MODULES = [
  { id: "dashboard", label: "Dashboard", path: "dashboard", group: "Overview" },
  { id: "pos", label: "Point of Sale", path: "pos", group: "Sales" },
  { id: "products", label: "Products", path: "products", group: "Catalog" },
  { id: "inventory", label: "Inventory", path: "inventory", group: "Catalog" },
  { id: "suppliers", label: "Suppliers", path: "suppliers", group: "Procurement" },
  { id: "purchases", label: "Purchase orders", path: "purchases", group: "Procurement" },
  { id: "sales", label: "Sales & returns", path: "sales", group: "Sales" },
  { id: "promotions", label: "Promotions", path: "promotions", group: "Sales" },
  { id: "customers", label: "Customers", path: "customers", group: "Sales" },
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

export function can(role: Role, moduleId: ModuleId, action: Action) {
  return PERMISSIONS[role][moduleId]?.includes(action) ?? false
}

export function visibleModules(role: Role) {
  return MODULES.filter((module) => can(role, module.id, "view"))
}
