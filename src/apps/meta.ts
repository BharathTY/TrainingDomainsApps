export type BasicAuth = {
  username: string
  password: string
}

export type AppMeta = {
  id: string
  basePath: string
  name: string
  description: string
  themeColor: string
  enabled: boolean
  basicAuth: BasicAuth
}

const basicAuth: BasicAuth = { username: "admin", password: "admin@123" }

export const APP_META: AppMeta[] = [
  {
    id: "schoolmanagement",
    basePath: "/schoolmanagement",
    name: "School Management",
    description: "Students, attendance, exams, fees, and the rest of the school day.",
    themeColor: "#5E2A6B",
    enabled: true,
    basicAuth,
  },
  {
    id: "crm",
    basePath: "/crm",
    name: "Pulse CRM",
    description: "Leads, contacts, follow-ups, and sales pipeline.",
    themeColor: "#0f766e",
    enabled: true,
    basicAuth,
  },
  {
    id: "erp",
    basePath: "/erp",
    name: "ERP",
    description: "Finance, HR, and operations with procure-to-pay and order-to-cash.",
    themeColor: "#1e3a8a",
    enabled: true,
    basicAuth,
  },
  {
    id: "retail",
    basePath: "/retail",
    name: "Retail RMS",
    description: "POS, inventory, suppliers, promotions, and sales reports.",
    themeColor: "#c2410c",
    enabled: true,
    basicAuth,
  },
  {
    id: "ecommerce",
    basePath: "/ecommerce",
    name: "Ecommerce",
    description: "Catalogue, cart, and orders.",
    themeColor: "#7c3aed",
    enabled: false,
    basicAuth,
  },
  {
    id: "assets",
    basePath: "/assets",
    name: "Asset EAM",
    description: "Asset register, assignments, maintenance, and vendors.",
    themeColor: "#0e7490",
    enabled: true,
    basicAuth,
  },
  {
    id: "hospital",
    basePath: "/hospital",
    name: "MediCare HMS",
    description: "Hospital management with wards, appointments, and automation labs.",
    themeColor: "#be123c",
    enabled: true,
    basicAuth,
  },
  {
    id: "banking",
    basePath: "/banking",
    name: "Demo National Bank",
    description: "Accounts, transfers, statements, and beneficiary payments.",
    themeColor: "#14532d",
    enabled: true,
    basicAuth,
  },
  {
    id: "inventory",
    basePath: "/inventory",
    name: "StockWise IMS",
    description: "Multi-warehouse stock for a distributor.",
    themeColor: "#5E2A6B",
    enabled: true,
    basicAuth,
  },
]

export function appMeta(id: string) {
  const app = APP_META.find((item) => item.id === id)
  if (!app) throw new Error(`Unknown app: ${id}`)
  return app
}
