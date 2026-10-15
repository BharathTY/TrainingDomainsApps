import { api } from "@/shared/lib/api-client"

export type Account = {
  id: string
  accountNo: string
  accountType: string
  nickname: string
  balance: number
  availableBalance: number
  status: string
  isFavorite: boolean
  interestRate?: number
  openedAt?: string
  maturityDate?: string | null
  currency?: string
}

export type Beneficiary = {
  id: string
  name: string
  accountNo: string
  bankName: string
  ifsc: string
  bankType: string
  nickname: string
  isFavorite: boolean
  status: string
}

export function loadDashboard() {
  return api<{
    customer: { fullName: string; customerNo: string; branchName: string; branchCode: string } | null
    totalBalance: number
    accounts: Account[]
    recentTransactions: {
      id: string
      txnRef: string
      description: string
      txnType: string
      amount: number
      status: string
      createdAt: string
      account: string
    }[]
    upcomingTransfers: {
      id: string
      scheduleNo: string
      amount: number
      executeDate: string
      executeTime: string
      frequency: string
      status: string
    }[]
    announcements: { id: string; title: string; body: string; severity: string; publishedAt: string }[]
    activityChart: { day: string; credits: number; debits: number }[]
    lastLoginAt: string | null
    transferLimit: number
  }>("/api/dashboard")
}

export function loadAccounts(params?: Record<string, string | number | undefined>) {
  const q = new URLSearchParams()
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") q.set(k, String(v))
    }
  }
  const qs = q.toString()
  return api<{ data: Account[]; total: number; page: number; pageSize: number }>(`/api/accounts${qs ? `?${qs}` : ""}`)
}

export function loadAccount(id: string) {
  return api<Account & {
    customerName: string
    customerNo: string
    email: string
    phone: string
    address: string
    branchCode: string
    branchName: string
    kycStatus: string
  }>(`/api/accounts/${id}`)
}

export function loadLookups() {
  return api<{
    accounts: { id: string; accountNo: string; accountType: string; nickname: string; availableBalance: number; status: string }[]
    beneficiaries: { id: string; name: string; accountNo: string; bankName: string; nickname: string; bankType: string }[]
    ownAccounts: { id: string; accountNo: string; nickname: string; accountType: string }[]
  }>("/api/lookups")
}

export function loadBeneficiaries(params?: Record<string, string | number | undefined>) {
  const q = new URLSearchParams()
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") q.set(k, String(v))
    }
  }
  const qs = q.toString()
  return api<{ data: Beneficiary[]; total: number; page: number; pageSize: number }>(
    `/api/beneficiaries${qs ? `?${qs}` : ""}`,
  )
}

export function loadStatement(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v))
  }
  return api<{
    account: { id: string; accountNo: string; nickname: string; maskedAccountNo: string }
    period: { from: string; to: string; label: string }
    summary: { openingBalance: number; totalCredits: number; totalDebits: number; closingBalance: number }
    data: {
      id: string
      txnRef: string
      txnType: string
      category: string
      description: string
      amount: number
      balanceAfter: number
      status: string
      createdAt: string
    }[]
    total: number
    page: number
    pageSize: number
  }>(`/api/statements?${q}`)
}

export function maskAccountNo(accountNo: string, mask: boolean) {
  if (!mask || accountNo.length < 4) return accountNo
  return `${"•".repeat(Math.max(0, accountNo.length - 4))}${accountNo.slice(-4)}`
}
