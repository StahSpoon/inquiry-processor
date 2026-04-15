import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import fetch from 'node-fetch'

const router = Router()
const aiLimiter = rateLimit({ windowMs: 60000, max: 30, keyGenerator: r => `ai_${r.user?.id}` })

router.post('/messages', aiLimiter, async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' })
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    })
    res.status(r.status).json(await r.json())
  } catch (err) {
    console.error('Anthropic proxy:', err.message)
    res.status(500).json({ error: 'Proxy failed' })
  }
})

export default router
