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

export async function loadDashboard() {
  return api<{
    role: string
    finance: {
      revenue: number
      expenses: number
      cashBank: number
      arBalance: number
      arAging: number
      apBalance: number
      apAging: number
      pendingApprovals: number
      budgetVsActual: { budget: number; actual: number }[]
    }
    hr: { totalEmployees: number; newJoiners: number; exits: number; pendingLeaves: number }
    operations: { openPurchaseOrders: number; pendingGoodsReceipts: number; lowStock: number; openSalesOrders: number }
  }>("/api/dashboard")
}
