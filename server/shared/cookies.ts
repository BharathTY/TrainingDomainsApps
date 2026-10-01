export function readCookie(header: string | undefined, name: string) {
  if (!header) return ""
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return decodeURIComponent(rest.join("="))
  }
  return ""
}

export function sessionCookie(name: string, value: string, cookiePath: string, maxAge?: number) {
  const parts = [`${name}=${encodeURIComponent(value)}`, "HttpOnly", `Path=${cookiePath}`, "SameSite=Lax"]
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`)
  return parts.join("; ")
}
