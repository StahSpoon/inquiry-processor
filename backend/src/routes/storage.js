import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/:key', async (req, res) => {
  const shared = req.query.shared === 'true' ? 1 : 0
  const userId = shared ? null : req.user.id
  const result = await db.execute({
    sql: 'SELECT value FROM storage WHERE key = ? AND shared = ? AND COALESCE(user_id, 0) = COALESCE(?, 0)',
    args: [req.params.key, shared, userId]
  })
  if (!result.rows[0]) return res.status(404).json({ value: null })
  res.json({ key: req.params.key, value: result.rows[0].value, shared: !!shared })
})

router.put('/:key', async (req, res) => {
  const { value, shared = false } = req.body || {}
  if (value === undefined) return res.status(400).json({ error: 'Missing value' })
  const isShared = shared ? 1 : 0
  const userId = isShared ? null : req.user.id
  await db.execute({
    sql: `INSERT INTO storage (key, value, shared, user_id, updated) VALUES (?, ?, ?, ?, datetime('now'))
          ON CONFLICT(key, shared, COALESCE(user_id, 0)) DO UPDATE SET value = excluded.value, updated = excluded.updated`,
    args: [req.params.key, value, isShared, userId]
  })
  res.json({ key: req.params.key, value, shared: !!shared })
})

router.delete('/:key', async (req, res) => {
  const shared = req.query.shared === 'true' ? 1 : 0
  const userId = shared ? null : req.user.id
  await db.execute({
    sql: 'DELETE FROM storage WHERE key = ? AND shared = ? AND COALESCE(user_id, 0) = COALESCE(?, 0)',
    args: [req.params.key, shared, userId]
  })
  res.json({ deleted: true })
})

router.get('/', async (req, res) => {
  const { prefix = '', shared = 'false' } = req.query
  const isShared = shared === 'true' ? 1 : 0
  const userId = isShared ? null : req.user.id
  const result = await db.execute({
    sql: 'SELECT key FROM storage WHERE key LIKE ? AND shared = ? AND COALESCE(user_id, 0) = COALESCE(?, 0)',
    args: [`${prefix}%`, isShared, userId]
  })
  res.json({ keys: result.rows.map(r => r.key), shared: !!isShared })
})

export default router
