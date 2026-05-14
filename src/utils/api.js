// Maps the 3 data keys to their legacy localStorage key names
const LS = {
  rooms:        'hm-rooms-v4',
  reservations: 'hm-reservations',
  seasons:      'hm-seasons',
}

function lsRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(LS[key])) ?? fallback }
  catch { return fallback }
}
function lsWrite(key, value) {
  try { localStorage.setItem(LS[key], JSON.stringify(value)) } catch {}
}

// Probe once per page load — cached for the whole session
let _serverUp = null
async function serverUp() {
  if (_serverUp !== null) return _serverUp
  try {
    const ac  = new AbortController()
    const tid = setTimeout(() => ac.abort(), 1000)
    const res = await fetch('/api/ping', { signal: ac.signal })
    clearTimeout(tid)
    const contentType = res.headers.get('content-type')
    _serverUp = res.ok && contentType?.includes('application/json')
  } catch {
    _serverUp = false
  }
  return _serverUp
}

function apiPut(key, value) {
  return fetch(`/api/data/${key}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(value),
  }).catch(err => console.error('[api] save failed:', err))
}

async function apiGet(key) {
  try {
    const r = await fetch(`/api/data/${key}`)
    if (!r.ok) return null
    const contentType = r.headers.get('content-type')
    if (!contentType?.includes('application/json')) return null
    return await r.json()
  } catch {
    return null
  }
}

// ── Public API ────────────────────────────────────────

export async function loadAll(defaultRooms, defaultSeasons) {
  try {
    if (!await serverUp()) {
      // File mode (single HTML) or server not running — use localStorage
      return {
        rooms:        lsRead('rooms',        defaultRooms),
        reservations: lsRead('reservations', []),
        seasons:      lsRead('seasons',      defaultSeasons),
      }
    }

    const [rooms, reservations, seasons] = await Promise.all([
      apiGet('rooms'), apiGet('reservations'), apiGet('seasons'),
    ])

    const result = {
      rooms:        rooms        ?? lsRead('rooms',        defaultRooms),
      reservations: reservations ?? lsRead('reservations', []),
      seasons:      seasons      ?? lsRead('seasons',      defaultSeasons),
    }

    // First launch with server: migrate any existing localStorage data
    if (rooms        === null) apiPut('rooms',        result.rooms)
    if (reservations === null) apiPut('reservations', result.reservations)
    if (seasons      === null) apiPut('seasons',      result.seasons)

    return result
  } catch {
    return {
      rooms:        lsRead('rooms',        defaultRooms),
      reservations: lsRead('reservations', []),
      seasons:      lsRead('seasons',      defaultSeasons),
    }
  }
}

// Write to localStorage immediately + replicate to server in the background
export function save(key, value) {
  lsWrite(key, value)
  serverUp().then(up => { if (up) apiPut(key, value) })
}
