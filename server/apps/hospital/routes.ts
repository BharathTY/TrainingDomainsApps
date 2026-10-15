import type { Express } from "express"
import { appMeta } from "../../../src/apps/meta"
import { basicAuth } from "../../shared/basic-auth"
import type { AppDatabase } from "../../shared/db"
import { registerApp } from "../../shared/register-app"
import { registerHospitalApi } from "./domain-routes"
import { ensureHospitalSchema, seedHospitalDomain } from "./domain-seed"
import { DEMO_USERS, prepareHospitalApp } from "./seed"

export async function register(app: Express, db: AppDatabase) {
  const meta = appMeta("hospital")

  app.get("/hospital/secure/medical-records", basicAuth(meta), (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>Protected medical records</title></head>
  <body>
    <h1>Protected medical records (training)</h1>
    <p>HTTP Basic Auth succeeded with admin / admin@123. Synthetic data only.</p>
    <table>
      <caption>Demo chart summary</caption>
      <thead><tr><th scope="col">Patient</th><th scope="col">Note</th></tr></thead>
      <tbody><tr><td>P00001</td><td>Training record — not clinical data</td></tr></tbody>
    </table>
  </body>
</html>`)
  })

  app.get("/hospital/secure/billing-vault", basicAuth(meta), (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>Protected billing vault</title></head>
  <body>
    <h1>Billing vault (training)</h1>
    <p>Basic Auth required. Credentials: admin / admin@123</p>
  </body>
</html>`)
  })

  app.get("/hospital/secure/reports-vault", basicAuth(meta), (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>Protected reports</title></head>
  <body>
    <h1>Reports vault (training)</h1>
    <p>Basic Auth required. Credentials: admin / admin@123</p>
  </body>
</html>`)
  })

  await registerApp(app, meta, db, DEMO_USERS, {
    onReady: () => prepareHospitalApp(db),
    onReset: async () => {
      await ensureHospitalSchema(db)
      await seedHospitalDomain(db)
    },
  })

  registerHospitalApi(app, db)
}
