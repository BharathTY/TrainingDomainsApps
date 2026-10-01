import { http, HttpResponse } from "msw"
import { ACTIONS, MODULES, ROLES, type Action, type ModuleId } from "@/apps/schoolmanagement/config/permissions"
import type { ProfileValues, YearValues } from "@/apps/schoolmanagement/features/settings/schemas"
import type { AcademicYear, PermissionMatrix } from "@/apps/schoolmanagement/features/settings/types"
import { db } from "@/apps/schoolmanagement/mocks/seed"

function readMatrix(body: unknown): PermissionMatrix | null {
  if (!body || typeof body !== "object") return null
  const source = body as Record<string, Record<string, unknown>>
  const next = {} as PermissionMatrix
  for (const role of ROLES) {
    const incoming = source[role]
    if (!incoming || typeof incoming !== "object") return null
    next[role] = {}
    for (const module of MODULES) {
      const raw = incoming[module.id]
      const actions = Array.isArray(raw) ? raw.filter((action): action is Action => ACTIONS.includes(action as Action)) : []
      if (actions.some((action) => action !== "view") && !actions.includes("view")) actions.unshift("view")
      next[role][module.id as ModuleId] = ACTIONS.filter((action) => actions.includes(action))
    }
  }
  const settings = next.admin.settings ?? []
  if (!settings.includes("view") || !settings.includes("edit")) return null
  return next
}

export const settingsHandlers = [
  http.get("/api/schoolmanagement/settings/profile", () => HttpResponse.json(db.profile)),
  http.put("/api/schoolmanagement/settings/profile", async ({ request }) => {
    const body = (await request.json()) as ProfileValues
    db.profile = {
      name: body.name.trim(),
      address: body.address.trim(),
      phone: body.phone,
      email: body.email.trim(),
      board: body.board.trim(),
      principal: body.principal.trim(),
    }
    return HttpResponse.json(db.profile)
  }),
  http.get("/api/schoolmanagement/settings/years", () => HttpResponse.json(db.years)),
  http.post("/api/schoolmanagement/settings/years", async ({ request }) => {
    const body = (await request.json()) as YearValues
    if (body.endDate <= body.startDate) return HttpResponse.json({ message: "End date is before the start" }, { status: 400 })
    const year: AcademicYear = { id: crypto.randomUUID(), label: body.label.trim(), startDate: body.startDate, endDate: body.endDate, current: db.years.length === 0 }
    db.years.push(year)
    return HttpResponse.json(year)
  }),
  http.patch("/api/schoolmanagement/settings/years/:id", async ({ params, request }) => {
    const year = db.years.find((item) => item.id === params.id)
    if (!year) return HttpResponse.json({ message: "Year not found" }, { status: 404 })
    const body = (await request.json()) as YearValues
    if (body.endDate <= body.startDate) return HttpResponse.json({ message: "End date is before the start" }, { status: 400 })
    year.label = body.label.trim()
    year.startDate = body.startDate
    year.endDate = body.endDate
    return HttpResponse.json(year)
  }),
  http.post("/api/schoolmanagement/settings/years/:id/current", ({ params }) => {
    const year = db.years.find((item) => item.id === params.id)
    if (!year) return HttpResponse.json({ message: "Year not found" }, { status: 404 })
    for (const item of db.years) item.current = item.id === year.id
    return HttpResponse.json(db.years)
  }),
  http.get("/api/schoolmanagement/settings/permissions", () => HttpResponse.json(db.permissions)),
  http.put("/api/schoolmanagement/settings/permissions", async ({ request }) => {
    const matrix = readMatrix(await request.json())
    if (!matrix) return HttpResponse.json({ message: "Admin must keep settings access" }, { status: 400 })
    db.permissions = matrix
    return HttpResponse.json(db.permissions)
  }),
]
