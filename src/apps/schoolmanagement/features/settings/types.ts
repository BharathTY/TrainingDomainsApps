import type { Action, ModuleId, Role } from "@/apps/schoolmanagement/config/permissions"

export type SchoolProfile = {
  name: string
  address: string
  phone: string
  email: string
  board: string
  principal: string
}

export type AcademicYear = {
  id: string
  label: string
  startDate: string
  endDate: string
  current: boolean
}

export type PermissionMatrix = Record<Role, Partial<Record<ModuleId, Action[]>>>
