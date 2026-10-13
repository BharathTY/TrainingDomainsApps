import { api } from "@/shared/lib/api-client"

export type InventoryDashboard = {
  items: number
  stockValue: number
  lowStock: number
  nearExpiry: number
  warehouses: { name: string; value: number }[]
  trend: { month: string; inward: number; outward: number }[]
}

export function loadDashboard() {
  return api<InventoryDashboard>("/api/dashboard")
}
