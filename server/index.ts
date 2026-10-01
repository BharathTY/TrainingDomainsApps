import path from "node:path"
import express from "express"
import { register as registerAssets } from "./apps/assets/routes"
import { register as registerBanking } from "./apps/banking/routes"
import { register as registerCrm } from "./apps/crm/routes"
import { register as registerEcommerce } from "./apps/ecommerce/routes"
import { register as registerErp } from "./apps/erp/routes"
import { register as registerHospital } from "./apps/hospital/routes"
import { register as registerInventory } from "./apps/inventory/routes"
import { register as registerRetail } from "./apps/retail/routes"
import { register as registerSchool } from "./apps/schoolmanagement/routes"
import { openAppDb } from "./shared/db"
import { errorHandler } from "./shared/errors"

const app = express()
app.disable("x-powered-by")
app.use(express.json())

const apps = [
  ["schoolmanagement", registerSchool],
  ["crm", registerCrm],
  ["erp", registerErp],
  ["retail", registerRetail],
  ["ecommerce", registerEcommerce],
  ["assets", registerAssets],
  ["hospital", registerHospital],
  ["banking", registerBanking],
  ["inventory", registerInventory],
] as const

async function start() {
  for (const [id, register] of apps) {
    await register(app, await openAppDb(id))
  }

  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Not found" })
  })

  if (process.env.NODE_ENV === "production") {
    const dist = path.resolve("dist")
    app.use(express.static(dist))
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        next()
        return
      }
      res.sendFile(path.join(dist, "index.html"))
    })
  }

  app.use(errorHandler)

  const port = Number(process.env.PORT ?? 3000)
  app.listen(port, () => {
    console.log(`API listening on ${port}`)
  })
}

start().catch((error) => {
  console.error(error)
  process.exit(1)
})
