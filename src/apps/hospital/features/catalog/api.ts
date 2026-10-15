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
    doctors: number
    patients: number
    beds: { available: number; occupied: number; maintenance: number }
    todayAppointments: number
    upcomingAppointments: number
    currentAdmissions: number
    pendingDischarges: number
    recentRegistrations: { id: string; patientNo: string; firstName: string; lastName: string; registeredAt: string }[]
    appointmentStatus: { status: string; n: number }[]
    wardOccupancy: { name: string; capacity: number; occupied: number }[]
    notifications: { id: string; title: string; body: string }[]
  }>("/api/dashboard")
}

export type HospitalLookups = {
  departments: { id: string; code: string; name: string }[]
  doctors: { id: string; code: string; name: string; departmentId: string }[]
  patients: { id: string; code: string; name: string }[]
  wards: { id: string; code: string; name: string; wardType: string }[]
  beds: { id: string; code: string; wardId: string; status: string }[]
}

export function loadLookups() {
  return api<HospitalLookups>("/api/lookups")
}
