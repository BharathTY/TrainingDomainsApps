export const AUDIENCES = ["all", "staff", "parents", "students"] as const
export type Audience = (typeof AUDIENCES)[number]

export type Announcement = {
  id: string
  title: string
  body: string
  audience: Audience
  className: string | null
  postedOn: string
  deletedAt: string | null
}

export type Homework = {
  id: string
  title: string
  subject: string
  className: string
  section: string
  dueDate: string
  details: string
  deletedAt: string | null
}
