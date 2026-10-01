import type { AssignmentValues, LeaveValues, OwnLeaveValues, StaffCreateValues } from "@/apps/schoolmanagement/features/staff/schemas"
import type { StaffMember } from "@/apps/schoolmanagement/features/staff/types"
import { api } from "@/shared/lib/api-client"

export const staffKeys = { all: ["staff"] as const }

export function listStaff() {
  return api<StaffMember[]>("/api/staff")
}

export function createStaffMember(input: StaffCreateValues) {
  return api<StaffMember>("/api/staff", { method: "POST", body: JSON.stringify(input) })
}

export function archiveStaff(ids: string[]) {
  return api<{ ids: string[] }>("/api/staff/archive", { method: "POST", body: JSON.stringify({ ids }) })
}

export function restoreStaff(ids: string[]) {
  return api<{ ids: string[] }>("/api/staff/restore", { method: "POST", body: JSON.stringify({ ids }) })
}

export function assignClass(staffId: string, input: AssignmentValues) {
  return api<StaffMember>("/api/staff/assignments", { method: "POST", body: JSON.stringify({ staffId, ...input }) })
}

export function removeAssignment(staffId: string, assignmentId: string) {
  return api<StaffMember>("/api/staff/assignments/remove", { method: "POST", body: JSON.stringify({ staffId, assignmentId }) })
}

export function requestLeave(input: LeaveValues) {
  return api<StaffMember>("/api/staff/leaves", { method: "POST", body: JSON.stringify(input) })
}

export function requestOwnLeave(staffId: string, input: OwnLeaveValues) {
  return requestLeave({ staffId, ...input })
}

export function decideLeave(leaveId: string, status: "approved" | "rejected") {
  return api<StaffMember>("/api/staff/leaves/decide", { method: "POST", body: JSON.stringify({ leaveId, status }) })
}
