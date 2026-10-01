import type { VaccineValues, VisitValues } from "@/apps/schoolmanagement/features/health/schemas"
import type { InfirmaryVisit, Vaccination } from "@/apps/schoolmanagement/features/health/types"
import { api } from "@/shared/lib/api-client"

export const healthKeys = { all: ["health"] as const }

export function listVisits() {
  return api<InfirmaryVisit[]>("/api/health/visits")
}

export function listVaccines() {
  return api<Vaccination[]>("/api/health/vaccines")
}

export function logVisit(values: VisitValues) {
  return api<InfirmaryVisit>("/api/health/visits", { method: "POST", body: JSON.stringify(values) })
}

export function logVaccine(values: VaccineValues) {
  return api<Vaccination>("/api/health/vaccines", { method: "POST", body: JSON.stringify(values) })
}
