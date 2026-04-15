# Alkatrész Manager — Deploy & Wiring Guide
## Stack: Vercel (frontend) · Railway (backend) · Turso (database)

---

## Overview

```
Browser
  │
  ├─ Vercel ──────────────── React app (your-app.vercel.app)
  │     │
  │     └─ VITE_API_URL ──► Railway backend (alkatresz.railway.app)
  │                               │
  │                         ┌─────┴──────────────────────────────┐
  │                         │  /api/storage    → Turso (SQLite)   │
  │                         │  /api/anthropic  → Anthropic API    │
  │                         │  /webhook/whatsapp ← Meta           │
  │                         │  /webhook/viber    ← Viber          │
  │                         │  /webhook/messenger ← Meta          │
  │                         │  /webhook/events → SSE stream       │
  │                         └─────────────────────────────────────┘
  │
  └─ /webhook/events ─────── Real-time inbox updates (SSE)
```

**Cost at zero traffic:** ~€5/month total (Railway Starter plan)

---

## STEP 1 — Turso Database (free, 5 min)

1. Sign up at **https://turso.tech** (free tier: 500MB, 1B reads/month)

2. Install CLI:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth login
   ```

3. Create database:
   ```bash
   turso db create alkatresz
   turso db show alkatresz          # note the URL: libsql://alkatresz-xxx.turso.io
   turso db tokens create alkatresz # note the token
   ```

4. Save these — you'll paste them into Railway next.

---

## STEP 2 — Railway Backend (5 min)

1. Sign up at **https://railway.app** — link your GitHub account

2. New Project → **Deploy from GitHub repo** → select your repo (or upload as zip: New → Empty Project → Deploy from template → then drag files)

3. Set the **Root Directory** to `backend/`

4. Railway auto-detects Node.js and runs `npm start`

5. Go to **Variables** tab → Add these one by one:

   | Variable | Value |
   |----------|-------|
   | `TURSO_URL` | `libsql://alkatresz-yourname.turso.io` |
   | `TURSO_TOKEN` | your Turso token |
   | `JWT_SECRET` | paste output of: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
   | `FRONTEND_URL` | `https://your-app.vercel.app` (fill in after step 3) |
   | `WHATSAPP_NUMBERS` | `[]` (fill in later) |
   | `VIBER_BOTS` | `[]` (fill in later) |
   | `FB_PAGE_ACCESS_TOKEN` | (fill in later) |
   | `FB_VERIFY_TOKEN` | pick any string, e.g. `alkatresz_verify_2024` |
   | `FB_APP_SECRET` | (fill in later) |
   | `ADMIN_PASSWORD` | your secure admin password |

6. Click **Deploy** — wait ~1 min

7. Go to **Settings → Networking → Generate Domain**
   → you get: `https://alkatresz-backend-production.up.railway.app`
   → **Save this URL**

8. Test: `curl https://your-railway-url.railway.app/health` → `{"ok":true}`

---

## STEP 3 — Vercel Frontend (3 min)

1. Sign up at **https://vercel.com** — link GitHub

2. **New Project → Import** your repo
   - Framework: **Vite**
   - Root directory: `frontend/`
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Environment Variables** (in Vercel dashboard):

   | Variable | Value |
   |----------|-------|
   | `VITE_API_URL` | `https://your-backend.railway.app` |

4. Click **Deploy** — you get: `https://your-app.vercel.app`

5. Go back to Railway → update `FRONTEND_URL` to your Vercel URL → Redeploy

6. Open your Vercel URL — you should see the login screen.
   Login: `admin` / your `ADMIN_PASSWORD`

---

## STEP 4 — WhatsApp Cloud API

### Required
- Meta Business account (free): https://business.facebook.com
- A phone number per country (PL + HU) — the SIM will be unlinked from personal WhatsApp

### A) Create Meta App
1. https://developers.facebook.com → **Create App** → Type: **Business**
2. Name it: `Alkatrész Manager`
3. Add product: **WhatsApp**

### B) Get tokens
1. WhatsApp → **API Setup**
2. Note: **Phone Number ID** and **Temporary Access Token**
3. For permanent token: Business Manager → **System Users** → Add → role: Admin
   → Generate Token → select your App → permissions: `whatsapp_business_messaging`, `whatsapp_business_management`
   → Copy token (shown once)

### C) Register webhook
1. WhatsApp → Configuration → **Webhooks** → Edit
2. **Callback URL**: `https://your-backend.railway.app/webhook/whatsapp`
3. **Verify Token**: same string you set as `FB_VERIFY_TOKEN` in Railway
4. Subscribe fields: check **messages**

### D) Railway env update
```json
WHATSAPP_NUMBERS=[
  {"phoneId":"PHONE_ID_PL","token":"PERMANENT_TOKEN_PL","verifyToken":"alkatresz_verify_2024","lang":"PL"},
  {"phoneId":"PHONE_ID_HU","token":"PERMANENT_TOKEN_HU","verifyToken":"alkatresz_verify_2024","lang":"HU"}
]
```
Redeploy Railway after saving.

### E) Test
Open your app → Inbox → send a WhatsApp message to your number → it appears live.

---

## STEP 5 — Viber Bot

### A) Create bots
1. **https://partners.viber.com** → Create Bot Account (do this twice — one PL, one HU)
2. Fill in name, category (Shopping), country
3. **Auth Token** is shown in the bot settings page

### B) Register webhooks
Run these two curl commands (replace tokens and your Railway URL):

```bash
# PL bot
curl -X POST https://chatapi.viber.com/pa/set_webhook \
  -H "X-Viber-Auth-Token: YOUR_PL_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-backend.railway.app/webhook/viber","event_types":["message","subscribed","conversation_started"]}'

# HU bot
curl -X POST https://chatapi.viber.com/pa/set_webhook \
  -H "X-Viber-Auth-Token: YOUR_HU_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-backend.railway.app/webhook/viber","event_types":["message","subscribed","conversation_started"]}'
```

Both should respond: `{"status":0,"status_message":"ok"}`

### C) Railway env update
```json
VIBER_BOTS=[
  {"token":"YOUR_PL_BOT_TOKEN","lang":"PL"},
  {"token":"YOUR_HU_BOT_TOKEN","lang":"HU"}
]
```

---

## STEP 6 — Facebook Messenger

### A) Add Messenger to your Meta App
1. developers.facebook.com → your App → **Add Product → Messenger**
2. Settings → Access Tokens → **Add or Remove Pages** → select your business page
3. **Generate Page Access Token** → copy it

### B) Get App Secret
App Settings → Basic → **App Secret** → Show → copy

### C) Register webhook
1. Messenger → Webhooks → **Add Callback URL**
2. URL: `https://your-backend.railway.app/webhook/messenger`
3. Verify Token: your `FB_VERIFY_TOKEN` value
4. Subscriptions: **messages**, **messaging_postbacks**
5. **Subscribe** this webhook to your page

### D) Railway env update
```
FB_PAGE_ACCESS_TOKEN=EAABwzLixnjYBO...
FB_APP_SECRET=abc123def456...
```

---

## STEP 7 — Real-Time Inbox (SSE)

The inbox receives messages live via Server-Sent Events. Add this to the `Inbox` function in `App.jsx` (inside the existing `useEffect` block or as a new one):

```js
// Add near the top of Inbox component
useEffect(() => {
  const API = window.__getApiBase?.() || ''
  const es = new EventSource(`${API}/webhook/events`)

  es.onmessage = (e) => {
    const { type, msg } = JSON.parse(e.data)
    if (type !== 'message' || msg.direction !== 'in') return

    setConvos(prev => {
      const existing = prev.find(c => c.phone === msg.phone && c.channel === msg.channel)
      const newMsg = {
        id: msg.id,
        from: 'in',
        text: msg.text,
        time: new Date(msg.sent_at).toLocaleTimeString('hu', { hour: '2-digit', minute: '2-digit' })
      }
      if (existing) {
        return prev.map(c => c.id === existing.id
          ? { ...c, messages: [...c.messages, newMsg], unread: c.unread + 1, lastTime: newMsg.time }
          : c)
      }
      // New contact — create conversation
      return [{
        id: Date.now(),
        contact: msg.contact,
        channel: msg.channel,
        phone: msg.phone,
        status: 'open',
        unread: 1,
        lastTime: newMsg.time,
        assigned: null,
        messages: [newMsg]
      }, ...prev]
    })
  }

  es.onerror = () => es.close()
  return () => es.close()
}, []) // run once on mount
```

---

## STEP 8 — Sending Messages from Inbox

Replace the `sendMsg` function in the `Inbox` component to actually dispatch via Railway:

```js
const sendMsg = async () => {
  if (!reply.trim() || !active) return
  const text = reply.trim()
  const msg = {
    id: Date.now(), from: 'out', text,
    time: new Date().toLocaleTimeString('hu', { hour: '2-digit', minute: '2-digit' }),
    sender: userName
  }
  setConvos(p => p.map(c => c.id === active ? { ...c, messages: [...c.messages, msg], lastTime: msg.time } : c))
  setReply(''); setAiSugg(null)

  // Dispatch to correct platform
  const API = window.__getApiBase?.() || ''
  const endpointMap = {
    wa_pl: `${API}/webhook/whatsapp/send`,
    wa_hu: `${API}/webhook/whatsapp/send`,
    vb_pl: `${API}/webhook/viber/send`,
    vb_hu: `${API}/webhook/viber/send`,
    fb_hu: `${API}/webhook/messenger/send`,
  }
  const endpoint = endpointMap[ac.channel]
  const chInfo = CHANNELS[ac.channel]

  if (endpoint && ac.phone && ac.phone !== 'Facebook') {
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('am_token')}`
      },
      body: JSON.stringify({ to: ac.phone, text, lang: chInfo?.lang })
    }).catch(err => console.error('Send failed:', err))
  }
}
```

---

## Maintenance

```bash
# View Railway logs
# railway.app → your project → Deployments → View Logs

# Turso — view data
turso db shell alkatresz
> SELECT * FROM messages ORDER BY id DESC LIMIT 10;
> SELECT key, shared FROM storage;

# Update backend
git push → Railway auto-redeploys

# Update frontend
git push → Vercel auto-redeploys
```

---

## Quick Reference

| What | URL |
|------|-----|
| Frontend | `https://your-app.vercel.app` |
| Backend | `https://your-backend.railway.app` |
| WhatsApp webhook | `https://your-backend.railway.app/webhook/whatsapp` |
| Viber webhook | `https://your-backend.railway.app/webhook/viber` |
| Messenger webhook | `https://your-backend.railway.app/webhook/messenger` |
| Health check | `https://your-backend.railway.app/health` |
| Real-time stream | `https://your-backend.railway.app/webhook/events` |

| Service | Free tier | Paid |
|---------|-----------|------|
| Vercel | ✅ Free | — |
| Railway | $5 credit/month | Starter $5/mo |
| Turso | ✅ 500MB free | — |
| WhatsApp | 1000 conv/mo free | ~€0.005/conv |
| Viber | ✅ Unlimited free | — |
| Messenger | ✅ Unlimited free | — |
| Anthropic | — | ~$3/M tokens |
