import type { Express } from "express"
import { appMeta } from "../../../src/apps/meta"
import { basicAuth } from "../../shared/basic-auth"
import type { AppDatabase } from "../../shared/db"
import { registerApp } from "../../shared/register-app"
import { registerRetailApi } from "./domain-routes"
import { ensureRetailSchema, seedRetailDomain } from "./domain-seed"
import { DEMO_USERS, prepareRetailApp } from "./seed"

export async function register(app: Express, db: AppDatabase) {
  const meta = appMeta("retail")

  app.get("/retail/secure/cash-drawer", basicAuth(meta), (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>Protected cash drawer</title></head>
  <body>
    <h1>Cash drawer vault (training)</h1>
    <p>HTTP Basic Auth succeeded with admin / admin@123. Synthetic data only.</p>
  </body>
</html>`)
  })

  app.get("/retail/secure/supplier-contracts", basicAuth(meta), (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>Protected supplier contracts</title></head>
  <body>
    <h1>Supplier contracts vault</h1>
    <p>Basic Auth required. Credentials: admin / admin@123</p>
  </body>
</html>`)
  })

  await registerApp(app, meta, db, DEMO_USERS, {
    onReady: () => prepareRetailApp(db),
    onReset: async () => {
      await ensureRetailSchema(db)
      await seedRetailDomain(db)
    },
  })

  registerRetailApi(app, db)
}
