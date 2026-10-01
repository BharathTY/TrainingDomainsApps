import { appPath } from "@/shared/lib/active-app"

export type PopupOptions = {
  name?: string
  width?: number
  height?: number
}

export function openPopup(url: string, options: PopupOptions = {}) {
  const name = options.name ?? "practice-popup"
  const width = options.width ?? 480
  const height = options.height ?? 640
  return window.open(url, name, `popup=yes,width=${width},height=${height}`)
}

export function openAppPopup(segment: string, options: PopupOptions = {}) {
  return openPopup(appPath(segment), options)
}
