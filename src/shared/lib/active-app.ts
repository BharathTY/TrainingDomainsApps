import type { AppMeta } from "@/apps/meta"

let current: AppMeta | null = null

export function bindActiveApp(app: AppMeta) {
  current = app
}

export function activeApp() {
  if (!current) throw new Error("No active app")
  return current
}

export function activeAppId() {
  return activeApp().id
}

export function appPath(segment = "") {
  const base = activeApp().basePath
  const clean = segment.replace(/^\//, "")
  return clean ? `${base}/${clean}` : base
}
