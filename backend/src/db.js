import { createClient } from '@libsql/client'
import crypto from 'crypto'

if (!process.env.TURSO_URL) throw new Error('TURSO_URL env var missing')
if (!process.env.TURSO_TOKEN) throw new Error('TURSO_TOKEN env var missing')

export const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
})

export async function initDb() {
  await db.execute(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'staff', created TEXT DEFAULT (datetime('now')))`)
  await db.execute(`CREATE TABLE IF NOT EXISTS storage (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL, value TEXT NOT NULL, shared INTEGER NOT NULL DEFAULT 0, user_id INTEGER, updated TEXT DEFAULT (datetime('now')))`)
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_storage ON storage (key, shared, user_id)`)
  await db.execute(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT NOT NULL, direction TEXT NOT NULL, contact TEXT NOT NULL, phone TEXT, text TEXT NOT NULL, raw TEXT, sent_at TEXT DEFAULT (datetime('now')))`)

  const { rows } = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: ['admin'] })
  if (rows.length === 0) {
    const hash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || 'admin123').digest('hex')
    await db.execute({ sql: 'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', args: ['admin', hash, 'Admin', 'admin'] })
    console.log('✓ Admin seeded')
  }
  console.log('✓ DB ready')
}
