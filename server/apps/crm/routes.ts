import type { Express } from "express"
import { appMeta } from "../../../src/apps/meta"
import { basicAuth } from "../../shared/basic-auth"
import type { AppDatabase } from "../../shared/db"
import { registerApp } from "../../shared/register-app"
import { registerCrmApi } from "./domain-routes"
import { ensureCrmSchema, seedCrmDomain } from "./domain-seed"
import { DEMO_USERS, prepareCrmApp } from "./seed"

export async function register(app: Express, db: AppDatabase) {
  const meta = appMeta("crm")

  app.get("/crm/secure/account-vault", basicAuth(meta), (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>Protected account vault</title></head>
  <body>
    <h1>CRM account vault (training)</h1>
    <p>HTTP Basic Auth succeeded with admin / admin@123. Synthetic CRM data only.</p>
  </body>
</html>`)
  })

  app.get("/crm/secure/export-room", basicAuth(meta), (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>Protected export room</title></head>
  <body>
    <h1>CRM export room</h1>
    <p>Basic Auth required. Credentials: admin / admin@123</p>
  </body>
</html>`)
  })

  await registerApp(app, meta, db, DEMO_USERS, {
    onReady: () => prepareCrmApp(db),
    onReset: async () => {
      await ensureCrmSchema(db)
      await seedCrmDomain(db)
    },
  })

  registerCrmApi(app, db)
}
