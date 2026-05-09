// Returns the nightly price for a given date, room type, and seasons list.
// Season dates are "MM-DD" strings (year-agnostic).
export function getPriceForNight(date, roomType, seasons) {
  const m  = String(date.getMonth() + 1).padStart(2, '0')
  const d  = String(date.getDate()).padStart(2, '0')
  const md = `${m}-${d}`

  const season = seasons.find(s => {
    if (!s.from || !s.to) return false
    if (s.from <= s.to) {
      return md >= s.from && md <= s.to
    }
    // Wraps across year-end (e.g. Dec–Jan)
    return md >= s.from || md <= s.to
  })

  if (!season) return null
  return season.prices?.[roomType] ?? null
}

// Sums nightly prices over the stay. Falls back to roomBasePrice if no season covers a night.
export function calcTotalPrice(checkIn, checkOut, roomType, seasons, roomBasePrice) {
  if (!checkIn || !checkOut) return null
  const start = new Date(checkIn)
  const end   = new Date(checkOut)
  if (start >= end) return null

  let total = 0
  const cur = new Date(start)
  while (cur < end) {
    const p = getPriceForNight(cur, roomType, seasons) ?? roomBasePrice ?? null
    if (p === null) return null
    total += p
    cur.setDate(cur.getDate() + 1)
  }
  return total
}

export function advanceOf(total) {
  return Math.round(total * 0.30)
}
