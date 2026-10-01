import { activeAppId } from "@/shared/lib/active-app"

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

function resolvePath(path: string) {
  const id = activeAppId()
  if (path.startsWith(`/api/${id}/`)) return path
  if (path.startsWith("/api/")) return `/api/${id}${path.slice(4)}`
  return path
}

let healing: Promise<void> | null = null

async function healMocks() {
  if (!healing) {
    healing = (async () => {
      const { worker } = await import("@/apps/schoolmanagement/mocks/browser")
      if (worker.readyState === 1) await worker.stop()
      await worker.start({ quiet: true })
    })().finally(() => {
      healing = null
    })
  }
  return healing
}

export async function api<T>(path: string, init?: RequestInit, healed = false): Promise<T> {
  const response = await fetch(resolvePath(path), {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let message = response.statusText || "Request failed"
    try {
      const body = (await response.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      /* non-json error body */
    }
    if (response.status === 404 && message === "Not found" && !healed) {
      try {
        await healMocks()
        return api(path, init, true)
      } catch {
        /* keep the original error */
      }
    }
    throw new ApiError(response.status, message)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
