import { Router } from 'express'
import crypto from 'crypto'
import { db } from '../db.js'
import { signToken } from '../middleware/auth.js'

const router = Router()
const hash = (pw) => crypto.createHash('sha256').update(pw).digest('hex')

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' })
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE username = ?', args: [username] })
  const user = result.rows[0]
  if (!user || user.password !== hash(password)) return res.status(401).json({ error: 'Invalid credentials' })
  const token = signToken({ id: user.id, username: user.username, name: user.name, role: user.role })
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } })
})

router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  const auth = req.headers.authorization?.slice(7) || ''
  if (!auth) return res.status(401).json({ error: 'Unauthorized' })
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Min 8 chars' })
  try {
    const [data] = auth.split('.')
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString())
    const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [payload.id] })
    const user = result.rows[0]
    if (!user || user.password !== hash(currentPassword)) return res.status(401).json({ error: 'Wrong password' })
    await db.execute({ sql: 'UPDATE users SET password = ? WHERE id = ?', args: [hash(newPassword), user.id] })
    res.json({ ok: true })
  } catch { res.status(401).json({ error: 'Invalid token' }) }
})

export default router
