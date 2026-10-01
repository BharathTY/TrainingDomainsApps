import type { ConcessionValues, HeadValues, InstallmentValues, PaymentValues } from "@/apps/schoolmanagement/features/fees/schemas"
import type { DefaulterRow, FeeAccount, FeeConcession, FeeHead, FeeInstallment, FeePayment, FeeStudentHit } from "@/apps/schoolmanagement/features/fees/types"
import { api } from "@/shared/lib/api-client"

export const feeKeys = {
  structure: ["fees", "structure"] as const,
  search: (query: string) => ["fees", "search", query] as const,
  account: (studentId: string) => ["fees", "account", studentId] as const,
  mine: ["fees", "mine"] as const,
  defaulters: ["fees", "defaulters"] as const,
}

export function fetchStructure() {
  return api<{ heads: FeeHead[]; installments: FeeInstallment[]; concessions: FeeConcession[] }>("/api/fees/structure")
}

export function createHead(values: HeadValues) {
  return api<FeeHead>("/api/fees/heads", { method: "POST", body: JSON.stringify(values) })
}

export function updateHead(id: string, values: HeadValues) {
  return api<FeeHead>(`/api/fees/heads/${id}`, { method: "PATCH", body: JSON.stringify(values) })
}

export function archiveHeads(ids: string[]) {
  return api<{ ids: string[] }>("/api/fees/heads/archive", { method: "POST", body: JSON.stringify({ ids }) })
}

export function restoreHeads(ids: string[]) {
  return api<{ ids: string[] }>("/api/fees/heads/restore", { method: "POST", body: JSON.stringify({ ids }) })
}

export function createInstallment(values: InstallmentValues) {
  return api<FeeInstallment>("/api/fees/installments", { method: "POST", body: JSON.stringify(values) })
}

export function updateInstallment(id: string, values: InstallmentValues) {
  return api<FeeInstallment>(`/api/fees/installments/${id}`, { method: "PATCH", body: JSON.stringify(values) })
}

export function archiveInstallments(ids: string[]) {
  return api<{ ids: string[] }>("/api/fees/installments/archive", { method: "POST", body: JSON.stringify({ ids }) })
}

export function restoreInstallments(ids: string[]) {
  return api<{ ids: string[] }>("/api/fees/installments/restore", { method: "POST", body: JSON.stringify({ ids }) })
}

export function createConcession(values: ConcessionValues) {
  return api<FeeConcession>("/api/fees/concessions", { method: "POST", body: JSON.stringify(values) })
}

export function updateConcession(id: string, values: ConcessionValues) {
  return api<FeeConcession>(`/api/fees/concessions/${id}`, { method: "PATCH", body: JSON.stringify(values) })
}

export function archiveConcessions(ids: string[]) {
  return api<{ ids: string[] }>("/api/fees/concessions/archive", { method: "POST", body: JSON.stringify({ ids }) })
}

export function restoreConcessions(ids: string[]) {
  return api<{ ids: string[] }>("/api/fees/concessions/restore", { method: "POST", body: JSON.stringify({ ids }) })
}

export function searchFeeStudents(query: string) {
  return api<FeeStudentHit[]>(`/api/fees/students?q=${encodeURIComponent(query)}`)
}

export function fetchAccount(studentId: string) {
  return api<FeeAccount>(`/api/fees/account?studentId=${encodeURIComponent(studentId)}`)
}

export function fetchOwnAccount() {
  return api<FeeAccount>("/api/fees/account?role=parent")
}

export function recordPayment(studentId: string, values: PaymentValues) {
  return api<FeePayment>(`/api/fees/payments`, { method: "POST", body: JSON.stringify({ studentId, ...values }) })
}

export function fetchDefaulters() {
  return api<DefaulterRow[]>("/api/fees/defaulters")
}

export function sendReminders(studentIds: string[]) {
  return api<{ count: number }>("/api/fees/reminders", { method: "POST", body: JSON.stringify({ studentIds }) })
}
