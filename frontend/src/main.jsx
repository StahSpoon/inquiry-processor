import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// ── Backend URL ───────────────────────────────────────────────────────────────
// Set VITE_API_URL in Vercel environment variables → your Railway backend URL
// e.g. https://alkatresz-backend.railway.app
const API = import.meta.env.VITE_API_URL || ''

function getToken() { return localStorage.getItem('am_token') || '' }
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }
}

// ── Storage: backed by Railway + Turso ───────────────────────────────────────
window.storage = {
  async get(key, shared = false) {
    try {
      const r = await fetch(`${API}/api/storage/${encodeURIComponent(key)}?shared=${shared}`, { headers: authHeaders() })
      if (!r.ok) return null
      const d = await r.json()
      return d.value != null ? { key, value: d.value, shared } : null
    } catch {
      const v = localStorage.getItem(`am_${shared ? 's' : 'p'}_${key}`)
      return v ? { key, value: v, shared } : null
    }
  },
  async set(key, value, shared = false) {
    try {
      await fetch(`${API}/api/storage/${encodeURIComponent(key)}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ value, shared })
      })
    } catch {
      localStorage.setItem(`am_${shared ? 's' : 'p'}_${key}`, value)
    }
    return { key, value, shared }
  },
  async delete(key, shared = false) {
    try {
      await fetch(`${API}/api/storage/${encodeURIComponent(key)}?shared=${shared}`, {
        method: 'DELETE', headers: authHeaders()
      })
    } catch {
      localStorage.removeItem(`am_${shared ? 's' : 'p'}_${key}`)
    }
    return { key, deleted: true }
  },
  async list(prefix = '', shared = false) {
    try {
      const r = await fetch(`${API}/api/storage?prefix=${encodeURIComponent(prefix)}&shared=${shared}`, { headers: authHeaders() })
      const d = await r.json()
      return { keys: d.keys || [], shared }
    } catch { return { keys: [], shared } }
  }
}

// ── Patch fetch so App.jsx AI calls go through backend proxy ──────────────────
// App.jsx calls https://api.anthropic.com/v1/messages directly —
// we intercept that and redirect to our Railway proxy instead.
const _fetch = window.fetch.bind(window)
window.fetch = function (url, opts) {
  if (typeof url === 'string' && url.includes('api.anthropic.com')) {
    const proxied = `${API}/api/anthropic/messages`
    const headers = { ...(opts?.headers || {}), 'Authorization': `Bearer ${getToken()}` }
    delete headers['x-api-key']  // backend adds this
    return _fetch(proxied, { ...opts, headers })
  }
  return _fetch(url, opts)
}

// ── Store auth token when backend login is used ───────────────────────────────
window.__setAuthToken = (token) => localStorage.setItem('am_token', token)
window.__getApiBase = () => API

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
