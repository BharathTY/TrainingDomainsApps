import { api } from "@/shared/lib/api-client"

export type Paged<T> = { data: T[]; total: number; page: number; pageSize: number }

export async function loadPaged<T>(path: string, params?: Record<string, string | number>) {
  const query = new URLSearchParams()
  if (params) {
    for (const [key, value] of Object.entries(params)) query.set(key, String(value))
  }
  const suffix = query.toString() ? `?${query}` : ""
  return api<Paged<T> | T[]>(`${path}${suffix}`)
}

export function asRows<T>(payload: Paged<T> | T[]): T[] {
  return Array.isArray(payload) ? payload : payload.data
}

export type AssetsLookups = {
  categories: { id: string; code: string; name: string }[]
  departments: { id: string; code: string; name: string }[]
  locations: { id: string; code: string; name: string; building: string }[]
  employees: { id: string; code: string; name: string }[]
  vendors: { id: string; code: string; name: string }[]
  assets: { id: string; code: string; name: string }[]
}

export function loadLookups() {
  return api<AssetsLookups>("/api/lookups")
}

export function loadDashboard() {
  return api<{
    totalAssets: number
    active: number
    assigned: number
    underMaintenance: number
    retired: number
    byCategory: { name: string; n: number }[]
    byLocation: { name: string; n: number }[]
    upcomingMaintenance: { id: string; workOrderNo: string; scheduledAt: string; priority: string; asset: string }[]
    overdueMaintenance: number
    warrantyAlerts: number
    purchaseValue: number
    bookValue: number
    recentAssets: { id: string; assetNo: string; name: string; status: string }[]
    recentTransactions: { id: string; action: string; details: string; actor: string; createdAt: string }[]
  }>("/api/dashboard")
}
