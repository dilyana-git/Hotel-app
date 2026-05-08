function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

function gapPenalty(days) {
  if (days === 0) return -10   // perfect back-to-back
  if (days === 1) return -4    // one cleaning day — acceptable
  if (days <= 3)  return days
  if (days <= 7)  return days * 2
  return days * 3              // large gaps hurt a lot
}

/**
 * Score every room for a proposed stay.
 * Returns array sorted best → worst (lowest score first).
 * Rooms with a booking conflict are excluded.
 */
export function scoreRooms(rooms, checkIn, checkOut, reservations, excludeId) {
  return rooms.map(room => {
    // Check for conflict
    const conflict = reservations.some(r =>
      r.id !== excludeId &&
      r.roomId === room.id &&
      r.checkIn < checkOut &&
      r.checkOut > checkIn
    )
    if (conflict) return null

    const roomRes = reservations
      .filter(r => r.id !== excludeId && r.roomId === room.id)

    // Nearest reservation ending on or before our checkIn
    const before = roomRes
      .filter(r => r.checkOut <= checkIn)
      .sort((a, b) => b.checkOut.localeCompare(a.checkOut))[0] ?? null

    // Nearest reservation starting on or after our checkOut
    const after = roomRes
      .filter(r => r.checkIn >= checkOut)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0] ?? null

    let score = 0
    const gaps = {}

    if (before) {
      gaps.before = daysBetween(before.checkOut, checkIn)
      score += gapPenalty(gaps.before)
    }
    if (after) {
      gaps.after = daysBetween(checkOut, after.checkIn)
      score += gapPenalty(gaps.after)
    }

    // Prefer rooms already in use — consolidate bookings
    if (roomRes.length === 0) score += 12

    return { room, score, gaps, before, after }
  }).filter(Boolean).sort((a, b) => a.score - b.score)
}

export function fitLabel(score) {
  if (score <= -8)  return { text: 'Perfect fit',  color: '#16A34A' }
  if (score <= 0)   return { text: 'Great fit',    color: '#2563EB' }
  if (score <= 10)  return { text: 'Good',         color: '#9333EA' }
  if (score <= 20)  return { text: 'Acceptable',   color: '#EA580C' }
  return              { text: 'Creates gap',  color: '#DC2626' }
}
