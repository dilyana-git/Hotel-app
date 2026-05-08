import './BookingGrid.css'

const DAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function toDateStr(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m, d }
}

// Compare two date objects {y,m,d}: -1 / 0 / 1
function cmp(a, b) {
  if (a.y !== b.y) return a.y < b.y ? -1 : 1
  if (a.m !== b.m) return a.m < b.m ? -1 : 1
  if (a.d !== b.d) return a.d < b.d ? -1 : 1
  return 0
}

function buildGrid(year, month, rooms, reservations) {
  const total = daysInMonth(year, month)
  // grid[day][roomId] = { type: 'free' | 'start' | 'occupied', ... }
  const grid = {}
  for (let d = 1; d <= total; d++) {
    grid[d] = {}
    for (const r of rooms) grid[d][r.id] = { type: 'free' }
  }

  for (const res of reservations) {
    const ci = parseDate(res.checkIn)
    const co = parseDate(res.checkOut)

    // Skip if reservation doesn't overlap this month
    const monthEnd = { y: year, m: month, d: total }
    const monthStart = { y: year, m: month, d: 1 }
    if (cmp(co, monthStart) <= 0) continue
    if (cmp(ci, { y: year, m: month, d: total + 1 }) >= 0) continue

    const startDay = (ci.y === year && ci.m === month) ? ci.d : 1
    const endDay   = (co.y === year && co.m === month) ? co.d : total + 1
    const span     = Math.min(endDay, total + 1) - startDay
    if (span <= 0) continue

    if (!grid[startDay]?.[res.roomId]) continue

    grid[startDay][res.roomId] = {
      type: 'start',
      res,
      span,
      fromPrev: !(ci.y === year && ci.m === month),
      toNext:   !(co.y === year && co.m === month),
    }

    for (let d = startDay + 1; d < endDay && d <= total; d++) {
      if (grid[d]?.[res.roomId]) grid[d][res.roomId] = { type: 'occupied' }
    }
  }
  return { grid, total }
}

export default function BookingGrid({ year, month, rooms, reservations, onCellClick, onReservationClick }) {
  const today = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate())
  const { grid, total } = buildGrid(year, month, rooms, reservations)

  if (rooms.length === 0) {
    return (
      <div className="empty-state">
        <p>No rooms configured yet.</p>
        <p>Go to <strong>Rooms</strong> to add your rooms.</p>
      </div>
    )
  }

  return (
    <div className="grid-wrapper">
      <table className="booking-table">
        <thead>
          <tr>
            <th className="date-header sticky-col sticky-head">Date</th>
            {rooms.map(r => (
              <th key={r.id} className="room-header sticky-head">
                <div className="room-hdr-name">{r.name}</div>
                {r.type && <div className="room-hdr-type">{r.type}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: total }, (_, i) => i + 1).map(day => {
            const dateStr = toDateStr(year, month, day)
            const dow = new Date(year, month - 1, day).getDay()
            const isToday   = dateStr === todayStr
            const isWeekend = dow === 0 || dow === 6

            return (
              <tr
                key={day}
                className={[
                  isToday   ? 'row-today'   : '',
                  isWeekend ? 'row-weekend' : '',
                ].join(' ')}
              >
                {/* Date label */}
                <td className={`date-cell sticky-col ${isToday ? 'date-cell-today' : ''}`}>
                  <span className="day-num">{day}</span>
                  <span className="day-abbr">{DAY_ABBR[dow]}</span>
                </td>

                {/* Room cells */}
                {rooms.map(room => {
                  const cell = grid[day][room.id]

                  if (cell.type === 'occupied') return null

                  if (cell.type === 'start') {
                    const { res, span, fromPrev, toNext } = cell
                    const nights = (() => {
                      const ci = parseDate(res.checkIn)
                      const co = parseDate(res.checkOut)
                      return Math.round((new Date(co.y,co.m-1,co.d) - new Date(ci.y,ci.m-1,ci.d)) / 86400000)
                    })()
                    return (
                      <td
                        key={room.id}
                        rowSpan={span}
                        className="res-cell"
                        onClick={() => onReservationClick(res)}
                      >
                        <div
                          className={[
                            'res-block',
                            fromPrev ? 'from-prev' : '',
                            toNext   ? 'to-next'   : '',
                          ].join(' ')}
                          style={{
                            background: res.color + '20',
                            borderColor: res.color,
                            borderLeftColor: res.color,
                          }}
                        >
                          <div className="res-name">{res.guestName}</div>
                          {res.phone && <div className="res-phone">{res.phone}</div>}
                          <div className="res-meta">
                            <span className="res-nights">{nights}n</span>
                            {res.paid
                              ? <span className="badge-paid">✓ paid</span>
                              : res.price
                                ? <span className="badge-unpaid">unpaid</span>
                                : null
                            }
                          </div>
                        </div>
                      </td>
                    )
                  }

                  // Free cell — click to add reservation
                  return (
                    <td
                      key={room.id}
                      className="free-cell"
                      onClick={() => onCellClick(room.id, dateStr)}
                      title={`Add reservation: ${room.name}`}
                    />
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
