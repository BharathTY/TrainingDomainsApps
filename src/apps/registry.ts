import type { ComponentType } from "react"
import { APP_META, type AppMeta } from "@/apps/meta"

export type AppRoutesModule = { default: ComponentType }

export type AppDefinition = AppMeta & {
  loadRoutes: () => Promise<AppRoutesModule>
}

const loaders: Record<string, () => Promise<AppRoutesModule>> = {
  schoolmanagement: () => import("@/apps/schoolmanagement/routes"),
  crm: () => import("@/apps/crm/routes"),
  erp: () => import("@/apps/erp/routes"),
  retail: () => import("@/apps/retail/routes"),
  ecommerce: () => import("@/apps/ecommerce/routes"),
  assets: () => import("@/apps/assets/routes"),
  hospital: () => import("@/apps/hospital/routes"),
  banking: () => import("@/apps/banking/routes"),
  inventory: () => import("@/apps/inventory/routes"),
}

export const APPS: AppDefinition[] = APP_META.map((app) => {
  const loadRoutes = loaders[app.id]
  if (!loadRoutes) throw new Error(`Missing route loader for ${app.id}`)
  return { ...app, loadRoutes }
})
