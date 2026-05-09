import express  from 'express'
import fs        from 'fs'
import os        from 'os'
import path      from 'path'
import qrcode    from 'qrcode-terminal'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app       = express()
const PORT      = process.env.PORT || 3001
const DATA      = path.join(__dirname, 'hotel-data.json')

// ── JSON file store (atomic write via tmp → rename) ──
function readStore() {
  try { return JSON.parse(fs.readFileSync(DATA, 'utf8')) }
  catch { return {} }
}
function writeStore(data) {
  const tmp = DATA + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
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

app.get('/api/data/:key', (req, res) => {
  res.json(readStore()[req.params.key] ?? null)
})

app.put('/api/data/:key', (req, res) => {
  const store = readStore()
  store[req.params.key] = req.body
  writeStore(store)
  res.json({ ok: true })
})

// ── Start ─────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const lan    = getLanIP()
  const lanUrl = lan ? `http://${lan}:${PORT}` : null

  console.log('\n  Hotel Manager is running\n')
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
