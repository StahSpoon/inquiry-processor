import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { initDb } from './db.js'
import authRouter from './routes/auth.js'
import storageRouter from './routes/storage.js'
import anthropicRouter from './routes/anthropic.js'
import webhookRouter from './routes/webhooks.js'
import { verifyToken } from './middleware/auth.js'

const app = express()
const PORT = process.env.PORT || 4000

// Railway injects PORT automatically

app.use(helmet({ contentSecurityPolicy: false }))

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    /\.vercel\.app$/,  // allow any vercel preview URL
  ],
  credentials: true,
}))

// Raw body needed for webhook signature verification
app.use('/webhook', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '10mb' }))

// Rate limits
const apiLimit = rateLimit({ windowMs: 900000, max: 500 })
const authLimit = rateLimit({ windowMs: 900000, max: 20 })

app.use('/api/auth', authLimit, authRouter)
app.use('/api/storage', apiLimit, verifyToken, storageRouter)
app.use('/api/anthropic', apiLimit, verifyToken, anthropicRouter)
app.use('/webhook', webhookRouter)

app.get('/health', (_, res) => res.json({ ok: true, ts: Date.now() }))

// Boot
initDb()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Backend on :${PORT} (${process.env.NODE_ENV || 'development'})`)
    })
  })
  .catch(err => { console.error('DB init failed:', err); process.exit(1) })
