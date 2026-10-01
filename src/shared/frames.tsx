import { useEffect, useState } from "react"
import { appPath } from "@/shared/lib/active-app"

export function frameUrl(src: string) {
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) return src
  return appPath(src)
}

export function AppFrame({
  title,
  src,
  name,
  id,
  srcdoc,
  delayMs = 0,
}: {
  title: string
  src?: string
  name?: string
  id?: string
  srcdoc?: string
  delayMs?: number
}) {
  const [ready, setReady] = useState(delayMs === 0)

  useEffect(() => {
    if (delayMs === 0) return
    const timer = window.setTimeout(() => setReady(true), delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs])

  if (!ready) return <p data-testid="frame-loading">Loading frame…</p>

  return (
    <iframe
      title={title}
      src={srcdoc ? undefined : frameUrl(src ?? "")}
      srcDoc={srcdoc}
      name={name}
      id={id}
      data-testid="app-frame"
      className="h-64 w-full rounded-md border border-border"
    />
  )
}
