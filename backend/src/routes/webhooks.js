import { Router } from 'express'
import crypto from 'crypto'
import fetch from 'node-fetch'
import { db } from '../db.js'

const router = Router()

// ── SSE: browser subscribes here for real-time messages ───────────────────────
const clients = new Set()

router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*')
  res.flushHeaders()

  const send = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`) } catch {}
  }
  clients.add(send)
  // Heartbeat every 25s to keep Railway alive
  const ping = setInterval(() => { try { res.write(': ping\n\n') } catch {} }, 25000)
  req.on('close', () => { clients.delete(send); clearInterval(ping) })
})

function broadcast(event) {
  clients.forEach(send => send(event))
}

async function saveMessage({ channel, direction, contact, phone, text, raw }) {
  const result = await db.execute({
    sql: `INSERT INTO messages (channel, direction, contact, phone, text, raw) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [channel, direction, contact, phone || '', text, JSON.stringify(raw || {})]
  })
  const msg = { id: Number(result.lastInsertRowid), channel, direction, contact, phone, text, sent_at: new Date().toISOString() }
  broadcast({ type: 'message', msg })
  return msg
}

// ── WHATSAPP ──────────────────────────────────────────────────────────────────
router.get('/whatsapp', (req, res) => {
  const numbers = JSON.parse(process.env.WHATSAPP_NUMBERS || '[]')
  const verifyToken = numbers[0]?.verifyToken || 'verify_token'
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === verifyToken) {
    return res.send(req.query['hub.challenge'])
  }
  res.sendStatus(403)
})

router.post('/whatsapp', (req, res) => {
  res.sendStatus(200)
  try {
    const body = JSON.parse(req.body.toString())
    const numbers = JSON.parse(process.env.WHATSAPP_NUMBERS || '[]')

    // Signature check
    const appSecret = process.env.FB_APP_SECRET
    const sig = req.headers['x-hub-signature-256'] || ''
    if (appSecret && sig) {
      const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(req.body).digest('hex')
      if (sig !== expected) return
    }

    const value = body.entry?.[0]?.changes?.[0]?.value
    if (!value?.messages) return

    const phoneId = value.metadata?.phone_number_id
    const numCfg = numbers.find(n => n.phoneId === phoneId) || numbers[0]
    const channel = (numCfg?.lang || 'HU') === 'PL' ? 'wa_pl' : 'wa_hu'

    for (const msg of value.messages) {
      if (msg.type !== 'text') continue
      const contact = value.contacts?.[0]?.profile?.name || msg.from
      saveMessage({ channel, direction: 'in', contact, phone: msg.from, text: msg.text.body, raw: msg })
    }
  } catch (e) { console.error('WA webhook:', e.message) }
})

router.post('/whatsapp/send', async (req, res) => {
  const { to, text, lang } = req.body || {}
  const numbers = JSON.parse(process.env.WHATSAPP_NUMBERS || '[]')
  const num = numbers.find(n => (n.lang || 'HU') === (lang || 'HU')) || numbers[0]
  if (!num) return res.status(503).json({ error: 'No WhatsApp number configured' })
  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${num.phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${num.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } })
    })
    const data = await r.json()
    await saveMessage({ channel: lang === 'PL' ? 'wa_pl' : 'wa_hu', direction: 'out', contact: to, phone: to, text, raw: data })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── VIBER ─────────────────────────────────────────────────────────────────────
router.post('/viber', (req, res) => {
  res.sendStatus(200)
  try {
    const body = JSON.parse(req.body.toString())
    if (body.event !== 'message') return
    const bots = JSON.parse(process.env.VIBER_BOTS || '[]')
    const bot = bots[0]

    // Signature
    const sig = req.headers['x-viber-content-signature']
    if (bot?.token && sig) {
      const expected = crypto.createHmac('sha256', bot.token).update(req.body).digest('hex')
      if (sig !== expected) return
    }
    const lang = bot?.lang || 'HU'
    saveMessage({
      channel: lang === 'PL' ? 'vb_pl' : 'vb_hu', direction: 'in',
      contact: body.sender?.name || body.sender?.id,
      phone: body.sender?.id,
      text: body.message?.text || '',
      raw: body
    })
  } catch (e) { console.error('Viber webhook:', e.message) }
})

router.post('/viber/send', async (req, res) => {
  const { to, text, lang } = req.body || {}
  const bots = JSON.parse(process.env.VIBER_BOTS || '[]')
  const bot = bots.find(b => (b.lang || 'HU') === (lang || 'HU')) || bots[0]
  if (!bot) return res.status(503).json({ error: 'No Viber bot configured' })
  try {
    const r = await fetch('https://chatapi.viber.com/pa/send_message', {
      method: 'POST',
      headers: { 'X-Viber-Auth-Token': bot.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver: to, min_api_version: 1, type: 'text', text })
    })
    const data = await r.json()
    await saveMessage({ channel: lang === 'PL' ? 'vb_pl' : 'vb_hu', direction: 'out', contact: to, phone: to, text, raw: data })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── MESSENGER ─────────────────────────────────────────────────────────────────
router.get('/messenger', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.FB_VERIFY_TOKEN) {
    return res.send(req.query['hub.challenge'])
  }
  res.sendStatus(403)
})

router.post('/messenger', (req, res) => {
  res.sendStatus(200)
  try {
    const body = JSON.parse(req.body.toString())

    const appSecret = process.env.FB_APP_SECRET
    const sig = req.headers['x-hub-signature-256'] || ''
    if (appSecret && sig) {
      const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(req.body).digest('hex')
      if (sig !== expected) return
    }

    if (body.object !== 'page') return
    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        if (!event.message?.text) continue
        saveMessage({
          channel: 'fb_hu', direction: 'in',
          contact: event.sender?.id, phone: event.sender?.id,
          text: event.message.text, raw: event
        })
      }
    }
  } catch (e) { console.error('Messenger webhook:', e.message) }
})

router.post('/messenger/send', async (req, res) => {
  const { to, text } = req.body || {}
  if (!process.env.FB_PAGE_ACCESS_TOKEN) return res.status(503).json({ error: 'FB token not set' })
  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: to }, message: { text } })
    })
    const data = await r.json()
    await saveMessage({ channel: 'fb_hu', direction: 'out', contact: to, phone: to, text, raw: data })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Message history ───────────────────────────────────────────────────────────
router.get('/messages', async (req, res) => {
  const { channel, limit = 100 } = req.query
  const result = channel
    ? await db.execute({ sql: 'SELECT * FROM messages WHERE channel = ? ORDER BY id DESC LIMIT ?', args: [channel, +limit] })
    : await db.execute({ sql: 'SELECT * FROM messages ORDER BY id DESC LIMIT ?', args: [+limit] })
  res.json(result.rows.reverse())
})

export default router
