import { createClient } from '@libsql/client'
import crypto from 'crypto'

if (!process.env.TURSO_URL) throw new Error('TURSO_URL env var required')
if (!process.env.TURSO_TOKEN) throw new Error('TURSO_TOKEN env var required')

export const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
})

export async function initDb() {
  // Create tables one at a time (executeMultiple has issues with some Turso versions)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      username  TEXT UNIQUE NOT NULL,
      password  TEXT NOT NULL,
      name      TEXT NOT NULL,
      role      TEXT NOT NULL DEFAULT 'staff',
      created   TEXT DEFAULT (datetime('now'))
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS storage (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      key       TEXT NOT NULL,
      value     TEXT NOT NULL,
      shared    INTEGER NOT NULL DEFAULT 0,
      user_id   INTEGER,
      updated   TEXT DEFAULT (datetime('now'))
    )
  `)

  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_storage_key
    ON storage (key, shared, user_id)
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      channel   TEXT NOT NULL,
      direction TEXT NOT NULL,
      contact   TEXT NOT NULL,
      phone     TEXT,
      text      TEXT NOT NULL,
      raw       TEXT,
      sent_at   TEXT DEFAULT (datetime('now'))
    )
  `)

  // Seed admin user if not exists
  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE username = ?',
    args: ['admin']
  })

  if (existing.rows.length === 0) {
    const hash = crypto.createHash('sha256')
      .update(process.env.ADMIN_PASSWORD || 'admin123')
      .digest('hex')
    await db.execute({
      sql: 'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
      args: ['admin', hash, 'Admin', 'admin']
    })
    console.log('✓ Admin user seeded')
  }

  console.log('✓ Turso DB ready')
}
