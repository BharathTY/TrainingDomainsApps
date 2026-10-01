import type { Role } from "@/apps/schoolmanagement/config/permissions"
import type { LoanValues } from "@/apps/schoolmanagement/features/library/schemas"
import type { Book, Loan } from "@/apps/schoolmanagement/features/library/types"
import { api } from "@/shared/lib/api-client"

export const libraryKeys = { all: ["library"] as const }

export function listBooks() {
  return api<Book[]>("/api/library/books")
}

export function listLoans(role: Role) {
  return api<Loan[]>(`/api/library/loans?role=${role}`)
}

export function issueBook(values: LoanValues) {
  return api<Loan>("/api/library/loans", { method: "POST", body: JSON.stringify(values) })
}

export function returnBook(id: string) {
  return api<Loan>(`/api/library/loans/${id}/return`, { method: "POST" })
}
