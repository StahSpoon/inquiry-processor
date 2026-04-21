// ─── AUTORRA BACKEND — PRODUCTION ─────────────────────────────────────────────
// Turso (libSQL) database, JWT auth, Vonage webhooks, Anthropic AI proxy, KV storage
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import Anthropic from '@anthropic-ai/sdk'
import { db, initDb } from './db.js'
import storageRouter from './storage.js'

const app = express()
const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }))
app.use(express.json({ limit: '10mb' }))  // allow base64 image uploads

app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      process.env.FRONTEND_URL,
      'https://autorra.eu',
      'https://www.autorra.eu',
      'http://localhost:3000',
      'http://localhost:5173',
    ].filter(Boolean)
    if (!origin) return cb(null, true)
    if (allowed.includes(origin)) return cb(null, true)
    try {
      if (/\.vercel\.app$/.test(new URL(origin).hostname)) return cb(null, true)
    } catch {}
    cb(null, false)
  },
  credentials: true,
}))

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false })
const apiLimiter  = rateLimit({ windowMs: 60 * 1000,       max: 300, standardHeaders: true, legacyHeaders: false })

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function authRequired(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Missing token' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = { id: payload.id, username: payload.username, role: payload.role, name: payload.name }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

function authOptional(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET)
      req.user = { id: payload.id, username: payload.username, role: payload.role, name: payload.name }
    } catch {}
  }
  if (!req.user) req.user = { id: null }
  next()
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' })
    const hash = crypto.createHash('sha256').update(password).digest('hex')
    const { rows } = await db.execute({
      sql: 'SELECT id, username, password, name, role FROM users WHERE username = ?',
      args: [username],
    })
    const user = rows[0]
    if (!user || user.password !== hash) return res.status(401).json({ error: 'Invalid credentials' })
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    )
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } })
  } catch (e) {
    console.error('login error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/auth/me', authRequired, (req, res) => {
  res.json({ user: req.user })
})

// ─── STORAGE (catalogue, settings, learned data) ──────────────────────────────
// Anonymous reads allowed for public catalogue (shared=true). Per-user writes need auth.
app.use('/api/storage', apiLimiter, authOptional, storageRouter)

// ─── ANTHROPIC AI PROXY ───────────────────────────────────────────────────────
app.post('/api/ai', apiLimiter, authRequired, async (req, res) => {
  try {
    const { messages, system, model, max_tokens } = req.body || {}
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages must be array' })
    const response = await anthropic.messages.create({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: max_tokens || 2000,
      system: system || undefined,
      messages,
    })
    res.json({ content: response.content })
  } catch (e) {
    console.error('AI error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─── VONAGE WEBHOOKS ──────────────────────────────────────────────────────────
app.post('/webhook/vonage/inbound', async (req, res) => {
  try {
    const msg = req.body || {}
    const channel = msg.channel || 'unknown'
    const contact = (msg.from && (msg.from.name || msg.from.number)) || 'Unknown'
    const phone   = (msg.from && msg.from.number) || ''
    const text    = (msg.message && msg.message.content && msg.message.content.text) || msg.text || ''
    const raw     = JSON.stringify(msg)
    if (text) {
      await db.execute({
        sql: 'INSERT INTO messages (channel, direction, contact, phone, text, raw) VALUES (?, ?, ?, ?, ?, ?)',
        args: [channel, 'in', contact, phone, text, raw],
      })
      console.log(`[${channel}] ${contact}: ${text.slice(0, 50)}`)
    }
    res.sendStatus(200)
  } catch (e) {
    console.error('Vonage inbound error:', e)
    res.sendStatus(500)
  }
})

app.post('/webhook/vonage/status', (req, res) => {
  console.log('[vonage status]', (req.body && req.body.status) || 'unknown')
  res.sendStatus(200)
})

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
app.get('/api/messages', authRequired, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500)
    const { rows } = await db.execute({
      sql: 'SELECT id, channel, direction, contact, phone, text, sent_at FROM messages ORDER BY sent_at DESC LIMIT ?',
      args: [limit],
    })
    res.json({ messages: rows })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── HEALTH ───────────────────────────────────────────────────────────────────
app.get('/health',     (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// ─── START ────────────────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║  autorra backend (Turso + Anthropic)       ║
╠════════════════════════════════════════════╣
║  Listening on :${String(PORT).padEnd(28)}║
║  DB: ${String(process.env.TURSO_URL || 'MISSING').slice(0, 36).padEnd(38)}║
║                                            ║
║  POST /api/auth/login                      ║
║  GET  /api/auth/me                         ║
║  GET  /api/storage/:key                    ║
║  PUT  /api/storage/:key                    ║
║  POST /api/ai                              ║
║  GET  /api/messages                        ║
║  POST /webhook/vonage/inbound              ║
╚════════════════════════════════════════════╝
    `)
  })
}).catch(e => {
  console.error('Startup failed:', e)
  process.exit(1)
})
