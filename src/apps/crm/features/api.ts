import { api } from "@/shared/lib/api-client"

export type Lead = {
  id: string
  leadNo: string
  firstName: string
  lastName: string
  company: string
  email: string
  phone: string
  jobTitle: string
  source: string
  industry: string
  companySize: string
  status: string
  rating: string
  ownerUsername: string
  tags?: string
  notes?: string
  lastContactedAt?: string | null
  nextFollowUpAt?: string | null
  createdAt?: string
}

export type Contact = {
  id: string
  contactNo: string
  fullName: string
  jobTitle: string
  company: string
  email: string
  phone: string
  ownerUsername: string
  status: string
  preferredChannel: string
  location?: string
  department?: string
}

export function qs(params?: Record<string, string | number | undefined>) {
  const q = new URLSearchParams()
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") q.set(k, String(v))
    }
  }
  const s = q.toString()
  return s ? `?${s}` : ""
}

export function loadDashboard() {
  return api<{
    totalLeads: number
    newLeads: number
    qualifiedLeads: number
    convertedLeads: number
    totalContacts: number
    openOpportunities: number
    followUpsToday: number
    overdueFollowUps: number
    conversionRate: number
    pipeline: { stage: string; n: number; value: number }[]
    upcomingMeetings: { id: string; activityNo: string; title: string; activityType: string; startAt: string; status: string }[]
    recentActivities: { id: string; entityType: string; action: string; details: string; actor: string; createdAt: string }[]
    recentNotes: { id: string; entityType: string; body: string; actor: string; createdAt: string }[]
  }>("/api/dashboard")
}

export function loadLeads(params?: Record<string, string | number | undefined>) {
  return api<{ data: Lead[]; total: number; page: number; pageSize: number }>(`/api/leads${qs(params)}`)
}

export function loadContacts(params?: Record<string, string | number | undefined>) {
  return api<{ data: Contact[]; total: number; page: number; pageSize: number }>(`/api/contacts${qs(params)}`)
}

export function loadLookups() {
  return api<{
    owners: { username: string; name: string; role: string }[]
    sources: string[]
    industries: string[]
    leadStatuses: string[]
    ratings: string[]
    stages: string[]
    activityTypes: string[]
    activityStatuses: string[]
  }>("/api/lookups")
}
