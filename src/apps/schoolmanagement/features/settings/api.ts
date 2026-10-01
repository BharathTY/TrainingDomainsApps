import type { PERMISSIONS } from "@/apps/schoolmanagement/config/permissions"
import type { ProfileValues, YearValues } from "@/apps/schoolmanagement/features/settings/schemas"
import type { AcademicYear, PermissionMatrix, SchoolProfile } from "@/apps/schoolmanagement/features/settings/types"
import { api } from "@/shared/lib/api-client"

export const settingsKeys = {
  profile: ["settings", "profile"] as const,
  years: ["settings", "years"] as const,
  permissions: ["settings", "permissions"] as const,
}

export function fetchProfile() {
  return api<SchoolProfile>("/api/settings/profile")
}

export function saveProfile(values: ProfileValues) {
  return api<SchoolProfile>("/api/settings/profile", { method: "PUT", body: JSON.stringify(values) })
}

export function fetchYears() {
  return api<AcademicYear[]>("/api/settings/years")
}

export function createYear(values: YearValues) {
  return api<AcademicYear>("/api/settings/years", { method: "POST", body: JSON.stringify(values) })
}

export function updateYear(id: string, values: YearValues) {
  return api<AcademicYear>(`/api/settings/years/${id}`, { method: "PATCH", body: JSON.stringify(values) })
}

export function setCurrentYear(id: string) {
  return api<AcademicYear[]>(`/api/settings/years/${id}/current`, { method: "POST" })
}

export function fetchPermissions() {
  return api<typeof PERMISSIONS>("/api/settings/permissions")
}

export function savePermissions(matrix: PermissionMatrix) {
  return api<typeof PERMISSIONS>("/api/settings/permissions", { method: "PUT", body: JSON.stringify(matrix) })
}
