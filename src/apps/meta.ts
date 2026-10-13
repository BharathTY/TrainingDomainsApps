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
    name: "CRM",
    description: "Leads, contacts, and follow-ups.",
    themeColor: "#0f766e",
    enabled: false,
    basicAuth,
  },
  {
    id: "erp",
    basePath: "/erp",
    name: "ERP",
    description: "Finance, HR, and operations.",
    themeColor: "#1e3a8a",
    enabled: false,
    basicAuth,
  },
  {
    id: "retail",
    basePath: "/retail",
    name: "Retail",
    description: "Point of sale and store stock.",
    themeColor: "#c2410c",
    enabled: false,
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
    name: "Assets",
    description: "Asset register and maintenance.",
    themeColor: "#0e7490",
    enabled: false,
    basicAuth,
  },
  {
    id: "hospital",
    basePath: "/hospital",
    name: "Hospital",
    description: "Patients, wards, and appointments.",
    themeColor: "#be123c",
    enabled: false,
    basicAuth,
  },
  {
    id: "banking",
    basePath: "/banking",
    name: "Banking",
    description: "Accounts, transfers, and statements.",
    themeColor: "#14532d",
    enabled: false,
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
