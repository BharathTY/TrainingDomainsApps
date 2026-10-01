import type { Role } from "@/apps/schoolmanagement/config/permissions"

export type DemoUser = {
  username: string
  password: string
  name: string
  role: Role
}

export const DEMO_USERS: DemoUser[] = [
  { username: "admin", password: "admin123", name: "Asha Menon", role: "admin" },
  { username: "teacher", password: "teacher123", name: "Vidya Menon", role: "teacher" },
  { username: "parent", password: "parent123", name: "Ravi Banerjee", role: "parent" },
  { username: "student", password: "student123", name: "Tanya Banerjee", role: "student" },
]

export type SessionUser = Omit<DemoUser, "password">
