import type { Express } from "express"
import { appMeta } from "../../../src/apps/meta"
import { basicAuth } from "../../shared/basic-auth"
import type { AppDatabase } from "../../shared/db"
import { registerApp } from "../../shared/register-app"
import { registerBankingApi } from "./domain-routes"
import { ensureBankingSchema, seedBankingDomain } from "./domain-seed"
import { DEMO_USERS, prepareBankingApp } from "./seed"

export async function register(app: Express, db: AppDatabase) {
  const meta = appMeta("banking")

  app.get("/banking/secure/vault-statements", basicAuth(meta), (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>Protected statement vault</title></head>
  <body>
    <h1>Statement vault (training)</h1>
    <p>HTTP Basic Auth succeeded with admin / admin@123. Synthetic banking data only.</p>
  </body>
</html>`)
  })

  app.get("/banking/secure/wire-room", basicAuth(meta), (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>Protected wire room</title></head>
  <body>
    <h1>Wire transfer room</h1>
    <p>Basic Auth required. Credentials: admin / admin@123</p>
  </body>
</html>`)
  })

  await registerApp(app, meta, db, DEMO_USERS, {
    onReady: () => prepareBankingApp(db),
    onReset: async () => {
      await ensureBankingSchema(db)
      await seedBankingDomain(db)
    },
  })

  registerBankingApi(app, db)
}
