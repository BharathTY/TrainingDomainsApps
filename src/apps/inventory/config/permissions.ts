export const ROLES = ["admin", "manager", "keeper", "purchase"] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  manager: "Warehouse Manager",
  keeper: "Store Keeper",
  purchase: "Purchase Officer",
}

export const MODULES = [
  { id: "dashboard", label: "Dashboard", path: "dashboard" },
  { id: "items", label: "Items", path: "items" },
  { id: "categories", label: "Categories", path: "categories" },
  { id: "suppliers", label: "Suppliers", path: "suppliers" },
  { id: "warehouses", label: "Warehouses", path: "warehouses" },
  { id: "grn", label: "Stock in", path: "grn" },
  { id: "issues", label: "Stock out", path: "issues" },
  { id: "transfers", label: "Transfers", path: "transfers" },
  { id: "adjustments", label: "Adjustments", path: "adjustments" },
  { id: "orders", label: "Purchase orders", path: "orders" },
  { id: "counts", label: "Cycle count", path: "counts" },
  { id: "calendar", label: "Calendar", path: "calendar" },
  { id: "reports", label: "Reports", path: "reports" },
  { id: "practice", label: "Practice", path: "practice" },
  { id: "settings", label: "Settings", path: "settings" },
] as const

export type ModuleId = (typeof MODULES)[number]["id"]
