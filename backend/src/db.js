/**
 * Turso database client (libSQL over HTTP — works on any host, no native bindings)
 * Docs: https://docs.turso.tech/sdk/ts/reference
 */
import { createClient } from '@libsql/client'
import crypto from 'crypto'

if (!process.env.TURSO_URL) throw new Error('TURSO_URL env var required')
if (!process.env.TURSO_TOKEN) throw new Error('TURSO_TOKEN env var required')

export const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
})

// ── Schema (idempotent) ───────────────────────────────────────────────────────
export async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      username  TEXT UNIQUE NOT NULL,
      password  TEXT NOT NULL,
      name      TEXT NOT NULL,
      role      TEXT NOT NULL DEFAULT 'staff',
      created   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS storage (
      key       TEXT NOT NULL,
      value     TEXT NOT NULL,
      shared    INTEGER NOT NULL DEFAULT 0,
      user_id   INTEGER,
      updated   TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (key, shared, COALESCE(user_id, 0))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      channel   TEXT NOT NULL,
      direction TEXT NOT NULL,
      contact   TEXT NOT NULL,
      phone     TEXT,
      text      TEXT NOT NULL,
      raw       TEXT,
      sent_at   TEXT DEFAULT (datetime('now'))
    );
  `)

  // Seed admin
  const existing = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: ['admin'] })
  if (existing.rows.length === 0) {
    const hash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || 'admin123').digest('hex')
    await db.execute({
      sql: 'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
      args: ['admin', hash, 'Admin', 'admin']
    })
    console.log('✓ Admin seeded — change password via app settings')
  }

  console.log('✓ Turso DB ready')
}
