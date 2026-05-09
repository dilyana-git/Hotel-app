import { reservationColor, legendItems } from '../utils/colors'
import './BookingGrid.css'

const DAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function daysInMonth(year, month) { return new Date(year, month, 0).getDate() }
function toDateStr(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}
function parseDate(s) { const [y,m,d] = s.split('-').map(Number); return {y,m,d} }
function cmp(a,b) {
  if (a.y!==b.y) return a.y<b.y?-1:1
  if (a.m!==b.m) return a.m<b.m?-1:1
  if (a.d!==b.d) return a.d<b.d?-1:1
  return 0
}

function resolveStatus(res) {
  if (res.paymentStatus) return res.paymentStatus
  return res.paid ? 'paid' : 'reserved'
}

function buildGrid(year, month, rooms, reservations) {
  const total = daysInMonth(year, month)
  const grid = {}
  for (let d = 1; d <= total; d++) {
    grid[d] = {}
    for (const r of rooms) grid[d][r.id] = { type: 'free' }
  }

  for (const res of reservations) {
    const ci = parseDate(res.checkIn)
    const co = parseDate(res.checkOut)
    if (cmp(co, {y:year,m:month,d:1}) <= 0) continue
    if (cmp(ci, {y:year,m:month,d:total+1}) >= 0) continue

    const startDay = (ci.y===year && ci.m===month) ? ci.d : 1
    const endDay   = (co.y===year && co.m===month) ? co.d : total+1
    const span     = Math.min(endDay, total+1) - startDay
    if (span <= 0 || !grid[startDay]?.[res.roomId]) continue

    grid[startDay][res.roomId] = {
      type: 'start', res, span,
      fromPrev: !(ci.y===year && ci.m===month),
      toNext:   !(co.y===year && co.m===month),
    }
    for (let d = startDay+1; d < endDay && d <= total; d++) {
      if (grid[d]?.[res.roomId]) grid[d][res.roomId] = { type: 'occupied' }
    }
  }
  return { grid, total }
}

function Legend({ rooms }) {
  const legend = legendItems()
  const hasApt = rooms.some(r => r.type === 'Apartment')
  const labels = { reserved: 'Reserved', advance: 'Advance', paid: 'Paid' }

  return (
    <div className="grid-legend">
      <div className="legend-group">
        <span className="legend-cat">Room</span>
        {legend.room.map(item => (
          <span key={item.key} className="legend-item">
            <span className="legend-swatch" style={{ background: item.bg, borderColor: item.border }} />
            {labels[item.key]}
          </span>
        ))}
      </div>
      {hasApt && (
        <div className="legend-group">
          <span className="legend-cat">Apartment</span>
          {legend.apt.map(item => (
            <span key={item.key} className="legend-item">
              <span className="legend-swatch" style={{ background: item.bg, borderColor: item.border }} />
              {labels[item.key]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BookingGrid({ year, month, rooms, reservations, onCellClick, onReservationClick }) {
  const today    = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth()+1, today.getDate())
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
    <>
      <Legend rooms={rooms} />
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
              const dow     = new Date(year, month-1, day).getDay()
              const isToday   = dateStr === todayStr
              const isWeekend = dow === 0 || dow === 6

              return (
                <tr key={day}
                  className={`${isToday?'row-today':''} ${isWeekend?'row-weekend':''}`}
                >
                  <td className={`date-cell sticky-col ${isToday?'date-cell-today':''}`}>
                    <span className="day-num">{day}</span>
                    <span className="day-abbr">{DAY_ABBR[dow]}</span>
                  </td>

                  {rooms.map(room => {
                    const cell = grid[day][room.id]
                    if (cell.type === 'occupied') return null

                    if (cell.type === 'start') {
                      const { res, span, fromPrev, toNext } = cell
                      const status = resolveStatus(res)
                      const colors = reservationColor(room.type, status)
                      const nights = Math.round(
                        (new Date(res.checkOut) - new Date(res.checkIn)) / 86400000
                      )
                      return (
                        <td key={room.id} rowSpan={span}
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
                              background:   colors.bg,
                              borderColor:  colors.border,
                              color:        colors.text,
                              borderLeftColor: colors.border,
                            }}
                          >
                            <div className="res-name">{res.guestName}</div>
                            {res.phone && <div className="res-phone">{res.phone}</div>}
                            <div className="res-meta">
                              <span className="res-nights">{nights}n</span>
                              {status === 'paid'    && <span className="status-dot dot-paid">paid</span>}
                              {status === 'advance' && <span className="status-dot dot-advance">adv.</span>}
                              {status === 'reserved'&& <span className="status-dot dot-reserved">rsv.</span>}
                            </div>
                          </div>
                        </td>
                      )
                    }

                    return (
                      <td key={room.id} className="free-cell"
                        onClick={() => onCellClick(room.id, dateStr)}
                        title={`Add reservation — ${room.name}`}
                      />
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
