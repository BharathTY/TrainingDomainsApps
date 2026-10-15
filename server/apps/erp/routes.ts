import type { Express } from "express"
import { appMeta } from "../../../src/apps/meta"
import { basicAuth } from "../../shared/basic-auth"
import type { AppDatabase } from "../../shared/db"
import { registerApp } from "../../shared/register-app"
import { registerErpApi } from "./domain-routes"
import { ensureErpSchema, seedErpDomain } from "./domain-seed"
import { DEMO_USERS, prepareErpApp } from "./seed"

export async function register(app: Express, db: AppDatabase) {
  const meta = appMeta("erp")

  app.get("/erp/secure/trial-balance", basicAuth(meta), async (_req, res, next) => {
    try {
      const rows = await db.query<{ code: string; name: string; debit: number; credit: number }>(
        `SELECT a.code, a.name,
                COALESCE(SUM(jl.debit),0)::float AS debit,
                COALESCE(SUM(jl.credit),0)::float AS credit
         FROM chart_of_accounts a
         LEFT JOIN journal_lines jl ON jl.account_id = a.id
         LEFT JOIN journals j ON j.id = jl.journal_id AND j.status = 'posted'
         GROUP BY a.id ORDER BY a.code`,
      )
      const body = rows
        .map((row) => `<tr><td>${row.code}</td><td>${row.name}</td><td>${row.debit.toFixed(2)}</td><td>${row.credit.toFixed(2)}</td></tr>`)
        .join("")
      res.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>Trial balance</title></head>
  <body>
    <h1>Trial balance</h1>
    <p>Posted journals only. Basic Auth required (admin / admin@123). Demo data — not a statutory filing.</p>
    <table>
      <caption>Trial balance</caption>
      <thead><tr><th scope="col">Code</th><th scope="col">Account</th><th scope="col">Debit</th><th scope="col">Credit</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body>
</html>`)
    } catch (error) {
      next(error)
    }
  })

  await registerApp(app, meta, db, DEMO_USERS, {
    onReady: () => prepareErpApp(db),
    onReset: async () => {
      await ensureErpSchema(db)
      await seedErpDomain(db)
    },
  })

  registerErpApi(app, db)
}
