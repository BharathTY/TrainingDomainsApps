import type { RequestHandler } from "express"
import type { AppMeta } from "../../src/apps/meta"

export function basicAuth(meta: AppMeta): RequestHandler {
  return (req, res, next) => {
    const header = req.headers.authorization
    const expected = `Basic ${Buffer.from(`${meta.basicAuth.username}:${meta.basicAuth.password}`).toString("base64")}`
    if (header !== expected) {
      res.set("WWW-Authenticate", `Basic realm="${meta.name}"`)
      res.status(401).send("Authentication required")
      return
    }
    next()
  }
}

export function registerSecure(app: import("express").Express, meta: AppMeta) {
  const guard = basicAuth(meta)
  const page = (_req: import("express").Request, res: import("express").Response) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${meta.name} secure</title>
  </head>
  <body>
    <h1>Secure area</h1>
    <p>${meta.name}</p>
  </body>
</html>`)
  }
  app.get(`${meta.basePath}/secure`, guard, page)
  app.get(`${meta.basePath}/secure/*`, guard, page)
}
