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

export type RetailLookups = {
  stores: { id: string; code: string; name: string }[]
  categories: { id: string; code: string; name: string }[]
  suppliers: { id: string; code: string; name: string }[]
  products: { id: string; code: string; name: string }[]
  customers: { id: string; code: string; name: string }[]
}

export function loadLookups() {
  return api<RetailLookups>("/api/lookups")
}

export function loadDashboard(storeId?: string) {
  const q = storeId ? `?storeId=${storeId}` : ""
  return api<{
    todaySales: number
    todayTransactions: number
    averageOrderValue: number
    lowStock: { id: string; sku: string; name: string; quantity: number; reorderLevel: number; store: string }[]
    outOfStock: number
    pendingPurchaseOrders: number
    recentSales: { id: string; saleNo: string; total: number; paymentMethod: string; createdAt: string }[]
    recentReturns: { id: string; returnNo: string; refundAmount: number; createdAt: string }[]
    salesChart: { day: string; revenue: number }[]
  }>(`/api/dashboard${q}`)
}
