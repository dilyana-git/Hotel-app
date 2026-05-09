import { reservationColor } from '../utils/colors'
import { advanceOf } from '../utils/pricing'
import './ReservationQuickView.css'

function fmt(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

function nights(ci, co) {
  return Math.round((new Date(co) - new Date(ci)) / 86400000)
}

function resolveStatus(res) {
  if (res.paymentStatus) return res.paymentStatus
  return res.paid ? 'paid' : 'reserved'
}

const STATUSES = [
  { value: 'reserved', label: 'Reserved',     sub: 'No payment yet' },
  { value: 'advance',  label: 'Advance paid',  sub: '30%' },
  { value: 'paid',     label: 'Fully paid',    sub: '100%' },
]

export default function ReservationQuickView({
  reservation, room, onStatusChange, onEdit, onDelete, onClose,
}) {
  const status   = resolveStatus(reservation)
  const roomType = room?.type ?? 'Room'
  const total    = Number(reservation.price) || 0
  const adv      = total ? advanceOf(total) : 0
  const n        = nights(reservation.checkIn, reservation.checkOut)

  function subLabel(st) {
    if (st === 'advance' && total) return `€ ${adv}`
    if (st === 'paid'    && total) return `€ ${total}`
    return null
  }

  return (
    <div className="qv-overlay" onClick={onClose}>
      <div className="qv-card" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="qv-head">
          <div className="qv-head-info">
            <h2 className="qv-guest">{reservation.guestName}</h2>
            <span className="qv-room-tag">{room?.name ?? '—'} · {roomType}</span>
          </div>
          <button className="close-x" onClick={onClose}>×</button>
        </div>

        {/* Stay info */}
        <div className="qv-stay">
          <div className="qv-stay-row">
            <div className="qv-stay-block">
              <span className="qv-stay-lbl">Check-in</span>
              <span className="qv-stay-val">{fmt(reservation.checkIn)}</span>
            </div>
            <span className="qv-stay-arrow">→</span>
            <div className="qv-stay-block">
              <span className="qv-stay-lbl">Check-out</span>
              <span className="qv-stay-val">{fmt(reservation.checkOut)}</span>
            </div>
          </div>
          <div className="qv-stay-meta">
            <span>{n} night{n !== 1 ? 's' : ''}</span>
            {total > 0 && <span>€ {total} total</span>}
            {reservation.phone && <span>{reservation.phone}</span>}
          </div>
          {reservation.notes && (
            <div className="qv-notes">"{reservation.notes}"</div>
          )}
        </div>

        {/* Payment status */}
        <div className="qv-section-label">Payment Status</div>
        <div className="qv-status-grid">
          {STATUSES.map(st => {
            const active = status === st.value
            const colors = reservationColor(roomType, st.value)
            const sub    = subLabel(st.value)
            return (
              <button
                key={st.value}
                className={`qv-status-btn ${active ? 'active' : ''}`}
                style={active ? {
                  background:  colors.bg,
                  borderColor: colors.border,
                  color:       colors.text,
                } : {}}
                onClick={() => onStatusChange(st.value)}
              >
                <span className="qv-st-check">{active ? '✓' : ''}</span>
                <span className="qv-st-label">{st.label}</span>
                {sub && <span className="qv-st-sub">{sub}</span>}
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <div className="qv-actions">
          <button className="btn btn-danger" onClick={() => {
            if (window.confirm(`Delete reservation for ${reservation.guestName}?`)) {
              onDelete(reservation.id)
            }
          }}>
            Delete
          </button>
          <button className="btn btn-ghost" onClick={onEdit}>
            Edit Details
          </button>
        </div>

      </div>
    </div>
  )
}
