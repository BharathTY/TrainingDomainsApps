import type { Express } from "express"
import { appMeta } from "../../../src/apps/meta"
import { basicAuth } from "../../shared/basic-auth"
import type { AppDatabase } from "../../shared/db"
import { registerApp } from "../../shared/register-app"
import { registerAssetsApi } from "./domain-routes"
import { ensureAssetsSchema, seedAssetsDomain } from "./domain-seed"
import { DEMO_USERS, prepareAssetsApp } from "./seed"

export async function register(app: Express, db: AppDatabase) {
  const meta = appMeta("assets")

  app.get("/assets/secure/asset-register", basicAuth(meta), (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>Protected asset register</title></head>
  <body>
    <h1>Protected asset register (training)</h1>
    <p>HTTP Basic Auth succeeded with admin / admin@123. Synthetic data only.</p>
    <table>
      <caption>Restricted asset snapshot</caption>
      <thead><tr><th scope="col">Asset</th><th scope="col">Status</th></tr></thead>
      <tbody><tr><td>A00001</td><td>active</td></tr></tbody>
    </table>
  </body>
</html>`)
  })

  app.get("/assets/secure/maintenance-docs", basicAuth(meta), (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>Protected maintenance docs</title></head>
  <body>
    <h1>Maintenance documentation vault</h1>
    <p>Basic Auth required. Credentials: admin / admin@123</p>
  </body>
</html>`)
  })

  app.get("/assets/secure/audit-vault", basicAuth(meta), (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>Protected audit vault</title></head>
  <body>
    <h1>Audit vault (training)</h1>
    <p>Basic Auth required. Credentials: admin / admin@123</p>
  </body>
</html>`)
  })

  await registerApp(app, meta, db, DEMO_USERS, {
    onReady: () => prepareAssetsApp(db),
    onReset: async () => {
      await ensureAssetsSchema(db)
      await seedAssetsDomain(db)
    },
  })

  registerAssetsApi(app, db)
}
