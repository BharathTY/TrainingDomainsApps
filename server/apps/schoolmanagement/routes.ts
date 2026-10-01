import type { Express } from "express"
import { registerApp } from "../../shared/register-app"
import { appMeta } from "../../../src/apps/meta"
import type { AppDatabase } from "../../shared/db"
import { DEMO_USERS } from "./seed"

export async function register(app: Express, db: AppDatabase) {
  await registerApp(app, appMeta("schoolmanagement"), db, DEMO_USERS)
}
