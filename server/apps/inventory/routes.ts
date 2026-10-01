import type { Express } from "express"
import { appMeta } from "../../../src/apps/meta"
import type { AppDatabase } from "../../shared/db"
import { registerApp } from "../../shared/register-app"
import { DEMO_USERS } from "./seed"

export async function register(app: Express, db: AppDatabase) {
  await registerApp(app, appMeta("inventory"), db, DEMO_USERS)
}
