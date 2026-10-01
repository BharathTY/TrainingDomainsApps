import path from "node:path"
import express, { type Express } from "express"
import type { AppMeta } from "../../src/apps/meta"
import { registerAuth } from "./auth"
import { registerSecure } from "./basic-auth"
import type { AppDatabase } from "./db"
import type { DemoAccount } from "./users"

export async function registerApp(app: Express, meta: AppMeta, db: AppDatabase, users: DemoAccount[]) {
  await registerAuth(app, meta, db, users)
  registerSecure(app, meta)
  app.use(`${meta.basePath}/frames`, express.static(path.resolve("public/frames", meta.id)))
}
