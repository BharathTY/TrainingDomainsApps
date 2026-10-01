import { activeAppId } from "@/shared/lib/active-app"
import { api } from "@/shared/lib/api-client"

export type SessionUser = {
  username: string
  name: string
  role: string
}

export type LoginValues = {
  username: string
  password: string
}

export const sessionKeys = {
  get current() {
    return ["session", activeAppId()] as const
  },
}

export function fetchSession() {
  return api<SessionUser>("/api/session")
}

export function login(values: LoginValues) {
  return api<SessionUser>("/api/login", { method: "POST", body: JSON.stringify(values) })
}

export function logout() {
  return api<{ ok: true }>("/api/logout", { method: "POST" })
}
