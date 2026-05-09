import express from 'express'
import fs      from 'fs'
import path    from 'path'
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
app.listen(PORT, () => {
  console.log(`\n  Hotel Manager is running.\n  Open http://localhost:${PORT} in your browser.\n`)
})
