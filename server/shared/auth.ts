import { randomUUID } from "node:crypto"
import type { Express, Request, Response } from "express"
import type { AppMeta } from "../../src/apps/meta"
import { readCookie, sessionCookie } from "./cookies"
import type { AppDatabase } from "./db"
import { loginBody } from "./validate"
import { seedUsers, userCount, type DemoAccount } from "./users"

type SessionRow = { username: string; name: string; role: string }

function cookieName(appId: string) {
  return `sid_${appId}`
}

function publicUser(row: SessionRow) {
  return { username: row.username, name: row.name, role: row.role }
}

async function readSession(db: AppDatabase, req: Request, appId: string) {
  const sid = readCookie(req.headers.cookie, cookieName(appId))
  if (!sid) return undefined
  return db
    .prepare(
      `SELECT users.username AS username, users.name AS name, users.role AS role
       FROM sessions JOIN users ON users.username = sessions.username
       WHERE sessions.id = ?`,
    )
    .get(sid) as Promise<SessionRow | undefined>
}

function setSessionCookies(res: Response, app: AppMeta, sid: string, maxAge?: number) {
  const name = cookieName(app.id)
  res.append("Set-Cookie", sessionCookie(name, sid, app.basePath, maxAge))
  res.append("Set-Cookie", sessionCookie(name, sid, `/api/${app.id}`, maxAge))
}

export type AuthHooks = {
  onReady?: () => Promise<void>
  onReset?: () => Promise<void>
}

export async function registerAuth(app: Express, meta: AppMeta, db: AppDatabase, users: DemoAccount[], hooks?: AuthHooks) {
  if ((await userCount(db)) === 0) await seedUsers(db, users)
  await hooks?.onReady?.()

  app.post(`/api/${meta.id}/login`, async (req, res, next) => {
    try {
      const body = loginBody.parse(req.body)
      const row = (await db.prepare("SELECT username, password, name, role FROM users WHERE username = ?").get(body.username)) as
        | (SessionRow & { password: string })
        | undefined
      if (!row || row.password !== body.password) {
        res.status(401).json({ message: "Unknown username or password" })
        return
      }
      const sid = randomUUID()
      await db.prepare("INSERT INTO sessions (id, username, created_at) VALUES (?, ?, ?)").run(sid, row.username, new Date().toISOString())
      setSessionCookies(res, meta, sid)
      res.json(publicUser(row))
    } catch (error) {
      next(error)
    }
  })

  app.get(`/api/${meta.id}/session`, async (req, res, next) => {
    try {
      const row = await readSession(db, req, meta.id)
      if (!row) {
        res.status(401).json({ message: "Sign in required" })
        return
      }
      res.json(publicUser(row))
    } catch (error) {
      next(error)
    }
  })

  app.post(`/api/${meta.id}/logout`, async (req, res, next) => {
    try {
      const sid = readCookie(req.headers.cookie, cookieName(meta.id))
      if (sid) await db.prepare("DELETE FROM sessions WHERE id = ?").run(sid)
      setSessionCookies(res, meta, "", 0)
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  app.post(`/api/${meta.id}/reset`, async (_req, res, next) => {
    try {
      await seedUsers(db, users)
      await hooks?.onReset?.()
      res.json({ ok: true })
    } catch (error) {
      next(error)
    }
  })
}
