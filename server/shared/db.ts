import fs from "node:fs"
import path from "node:path"
import { Pool, type PoolClient, type QueryResultRow } from "pg"

const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/trainingDomainApps"

function databaseUrl() {
  if (!process.env.DATABASE_URL) loadEnvFile()
  return process.env.DATABASE_URL || DEFAULT_DATABASE_URL
}

function loadEnvFile() {
  const file = path.resolve(".env")
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const separator = trimmed.indexOf("=")
    if (separator === -1) continue
    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "")
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

function schemaName(id: string) {
  if (!/^[a-z][a-z0-9_]*$/.test(id)) throw new Error(`Unsafe schema name: ${id}`)
  return id
}

function toPg(sql: string) {
  let index = 0
  return sql.replace(/\?/g, () => `$${++index}`)
}

const pool = new Pool({ connectionString: databaseUrl() })

async function withSchema<T>(schema: string, fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query(`SET LOCAL search_path TO ${schema}`)
    const result = await fn(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export type Prepared = {
  get: (...params: unknown[]) => Promise<QueryResultRow | undefined>
  run: (...params: unknown[]) => Promise<void>
}

export type AppDatabase = {
  exec: (sql: string) => Promise<void>
  prepare: (sql: string) => Prepared
  query: <T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]) => Promise<T[]>
  batch: (statements: { sql: string; params?: unknown[] }[]) => Promise<void>
}

export async function openAppDb(id: string): Promise<AppDatabase> {
  const schema = schemaName(id)
  const client = await pool.connect()
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
    await client.query(`SET search_path TO ${schema}`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `)
  } finally {
    await client.query("RESET search_path")
    client.release()
  }

  return {
    exec(sql) {
      return withSchema(schema, async (connection) => {
        await connection.query(toPg(sql))
      })
    },
    prepare(sql) {
      const text = toPg(sql)
      return {
        async get(...params) {
          return withSchema(schema, async (connection) => {
            const result = await connection.query(text, params)
            return result.rows[0]
          })
        },
        async run(...params) {
          await withSchema(schema, async (connection) => {
            await connection.query(text, params)
          })
        },
      }
    },
    query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
      return withSchema(schema, async (connection) => {
        const result = await connection.query<T>(toPg(sql), params)
        return result.rows
      })
    },
    batch(statements) {
      return withSchema(schema, async (connection) => {
        for (const statement of statements) {
          await connection.query(toPg(statement.sql), statement.params ?? [])
        }
      })
    },
  }
}
