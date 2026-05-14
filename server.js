import 'dotenv/config'
import express          from 'express'
import fs               from 'fs'
import os               from 'os'
import path             from 'path'
import qrcode           from 'qrcode-terminal'
import Anthropic        from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app       = express()
const PORT      = process.env.PORT || 3001
const DATA      = path.join(__dirname, 'hotel-data.json')

// ── Storage: Supabase (cloud) or local JSON file ──────
const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null

async function dbGet(key) {
  if (supabase) {
    const { data } = await supabase.from('store').select('value').eq('key', key).maybeSingle()
    return data?.value ?? null
  }
  try { return JSON.parse(fs.readFileSync(DATA, 'utf8'))[key] ?? null }
  catch { return null }
}

async function dbSet(key, value) {
  if (supabase) {
    await supabase.from('store').upsert({ key, value })
    return
  }
  const tmp = DATA + '.tmp'
  let store = {}
  try { store = JSON.parse(fs.readFileSync(DATA, 'utf8')) } catch {}
  store[key] = value
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8')
  fs.renameSync(tmp, DATA)
}

// ── Local network IP ──────────────────────────────────
function getLanIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return null
}

// ── Middleware ────────────────────────────────────────
app.use(express.json({ limit: '4mb' }))
app.use(express.static(path.join(__dirname, 'dist')))

// ── API ───────────────────────────────────────────────
app.get('/api/ping', (_, res) => res.json({ ok: true }))

app.get('/api/data/:key', async (req, res) => {
  res.json(await dbGet(req.params.key))
})

app.put('/api/data/:key', async (req, res) => {
  await dbSet(req.params.key, req.body)
  res.json({ ok: true })
})

// ── Voice: parse spoken reservation via Claude ────────
app.post('/api/parse-reservation', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured in .env' })
  }
  const { text } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' })

  const rooms = await dbGet('rooms') ?? []
  const today = new Date().toISOString().slice(0, 10)
  const tmrw  = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  const client = new Anthropic()
  const msg    = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system:     'Extract hotel reservation details from spoken text. Return ONLY valid JSON — no markdown, no explanation.',
    messages: [{
      role:    'user',
      content: `Today is ${today}. Tomorrow is ${tmrw}.
Available rooms: ${rooms.map(r => `id="${r.id}" name="${r.name}" type="${r.type}"`).join(', ')}

Spoken reservation: "${text}"

Return JSON with these exact fields:
{
  "guestName": string or null,
  "phone":     string or null,
  "checkIn":   "YYYY-MM-DD" or null,
  "checkOut":  "YYYY-MM-DD" or null,
  "roomId":    one of the available room ids or null,
  "notes":     string or null
}

Rules:
- If N nights are mentioned, set checkOut = checkIn + N days
- Match room by number or type if mentioned
- The text may be in any language — keep guest names as spoken`,
    }],
  })

  try {
    res.json(JSON.parse(msg.content[0].text))
  } catch {
    res.status(500).json({ error: 'Could not parse Claude response' })
  }
})

// ── Start ─────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const lan    = getLanIP()
  const lanUrl = lan ? `http://${lan}:${PORT}` : null

  console.log('\n  Hotel Manager is running\n')
  console.log(`  Storage: ${supabase ? 'Supabase (cloud)' : 'local file'}`)
  console.log(`  This computer:  http://localhost:${PORT}`)
  if (lanUrl) {
    console.log(`  Phone / tablet: ${lanUrl}`)
    console.log('\n  Scan to open on your phone:\n')
    qrcode.generate(lanUrl, { small: true })
    if (process.platform === 'win32') {
      console.log('  Windows tip: if the phone cannot connect, allow')
      console.log('  Node.js through Windows Defender Firewall.\n')
    }
  }
  console.log()
})
