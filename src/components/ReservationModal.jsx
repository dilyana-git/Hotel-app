import { useState, useEffect, useRef, useMemo } from 'react'
import { scoreRooms, fitLabel } from '../utils/roomScoring'
import { calcTotalPrice, advanceOf } from '../utils/pricing'
import './ReservationModal.css'

function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function nightsBetween(from, to) {
  if (!from || !to) return 0
  return Math.max(0, Math.round((new Date(to) - new Date(from)) / 86400000))
}

function hasConflict(reservations, roomId, checkIn, checkOut, excludeId) {
  return reservations.some(r => {
    if (r.id === excludeId) return false
    if (r.roomId !== roomId) return false
    return r.checkIn < checkOut && r.checkOut > checkIn
  })
}

function gapDesc(gaps) {
  const parts = []
  if (gaps.before === 0)      parts.push('back-to-back after prev. guest')
  else if (gaps.before === 1) parts.push('1 day after prev. guest')
  else if (gaps.before != null) parts.push(`${gaps.before}d gap before`)

  if (gaps.after === 0)       parts.push('back-to-back before next guest')
  else if (gaps.after === 1)  parts.push('1 day before next guest')
  else if (gaps.after != null)  parts.push(`${gaps.after}d gap after`)

  return parts.join(' · ') || 'No adjacent bookings'
}

// Migrate old paid:boolean → paymentStatus string
function resolveStatus(res) {
  if (!res) return 'reserved'
  if (res.paymentStatus) return res.paymentStatus
  return res.paid ? 'paid' : 'reserved'
}

const PAYMENT_OPTIONS = [
  { value: 'reserved', label: 'Reserved — no payment yet' },
  { value: 'advance',  label: 'Advance paid (30%)' },
  { value: 'paid',     label: 'Fully paid' },
]

export default function ReservationModal({
  mode, reservation, initialRoomId, initialDate,
  rooms, seasons, reservations, onSave, onDelete, onClose,
}) {
  const firstInputRef = useRef(null)
  const defaultCheckIn  = initialDate ?? ''
  const defaultCheckOut = initialDate ? addDays(initialDate, 1) : ''

  const [form, setForm] = useState({
    guestName:     '',
    phone:         '',
    roomId:        initialRoomId ?? rooms[0]?.id ?? '',
    checkIn:       defaultCheckIn,
    checkOut:      defaultCheckOut,
    price:         '',
    paymentStatus: 'reserved',
    notes:         '',
  })
  const [priceOverridden, setPriceOverridden] = useState(false)
  const [error, setError]   = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (mode === 'edit' && reservation) {
      setForm({
        guestName:     reservation.guestName     ?? '',
        phone:         reservation.phone         ?? '',
        roomId:        reservation.roomId,
        checkIn:       reservation.checkIn,
        checkOut:      reservation.checkOut,
        price:         reservation.price         ?? '',
        paymentStatus: resolveStatus(reservation),
        notes:         reservation.notes         ?? '',
      })
    }
  }, [mode, reservation])

  useEffect(() => { firstInputRef.current?.focus() }, [])

  // Auto-calculate price whenever room or dates change (unless user overrode it)
  const selectedRoom = rooms.find(r => r.id === form.roomId)
  const autoPrice = useMemo(() => {
    if (!form.checkIn || !form.checkOut || !selectedRoom) return null
    return calcTotalPrice(
      form.checkIn, form.checkOut,
      selectedRoom.type,
      seasons ?? [],
      selectedRoom.price ?? null
    )
  }, [form.checkIn, form.checkOut, form.roomId, seasons, rooms])

  // Apply auto-price only when not overridden
  useEffect(() => {
    if (!priceOverridden && autoPrice !== null) {
      setForm(prev => ({ ...prev, price: autoPrice }))
    }
  }, [autoPrice, priceOverridden])

  function set(field, value) {
    setError('')
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'checkIn' && value) {
        if (!prev.checkOut || prev.checkOut <= value) {
          next.checkOut = addDays(value, 1)
        }
        setPriceOverridden(false) // reset override when dates change
      }
      if (field === 'roomId') {
        setPriceOverridden(false)
      }
      return next
    })
  }

  function setPrice(val) {
    setPriceOverridden(true)
    setForm(prev => ({ ...prev, price: val }))
  }

  const scored = useMemo(() => {
    if (!form.checkIn || !form.checkOut || form.checkOut <= form.checkIn) return []
    return scoreRooms(rooms, form.checkIn, form.checkOut, reservations, reservation?.id)
  }, [form.checkIn, form.checkOut, rooms, reservations, reservation?.id])

  const bestRoom    = scored[0] ?? null
  const isBestRoom  = bestRoom?.room.id === form.roomId
  const currentScore = scored.find(s => s.room.id === form.roomId)

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.guestName.trim()) { setError('Guest name is required.'); return }
    if (!form.checkIn)          { setError('Check-in date is required.'); return }
    if (!form.checkOut)         { setError('Check-out date is required.'); return }
    if (form.checkOut <= form.checkIn) { setError('Check-out must be after check-in.'); return }
    if (hasConflict(reservations, form.roomId, form.checkIn, form.checkOut, reservation?.id)) {
      setError('This room is already booked for part of that period.'); return
    }
    onSave({
      ...form,
      id: mode === 'edit' ? reservation.id : undefined,
    })
  }

  function handleDelete() {
    if (window.confirm(`Delete reservation for ${reservation.guestName}?`)) {
      onDelete(reservation.id)
    }
  }

  const nights      = nightsBetween(form.checkIn, form.checkOut)
  const roomName    = selectedRoom?.name ?? ''
  const totalPrice  = Number(form.price) || 0
  const advance     = totalPrice > 0 ? advanceOf(totalPrice) : 0
  const visibleScored = showAll ? scored : scored.slice(0, 5)

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{mode === 'add' ? 'New Reservation' : 'Edit Reservation'}</h2>
          <button className="close-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label>Guest Name <span className="req">*</span></label>
            <input ref={firstInputRef} type="text" value={form.guestName}
              onChange={e => set('guestName', e.target.value)} placeholder="Full name" />
          </div>

          <div className="field">
            <label>Phone Number</label>
            <input type="tel" value={form.phone}
              onChange={e => set('phone', e.target.value)} placeholder="+1 234 567 8900" />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Check-in</label>
              <input type="date" value={form.checkIn}
                onChange={e => set('checkIn', e.target.value)} />
            </div>
            <div className="field">
              <label>Check-out</label>
              <input type="date" value={form.checkOut}
                min={form.checkIn ? addDays(form.checkIn, 1) : ''}
                onChange={e => set('checkOut', e.target.value)} />
            </div>
          </div>

          {nights > 0 && (
            <div className="nights-pill">{nights} night{nights !== 1 ? 's' : ''} · {roomName}</div>
          )}

          {/* ── Smart room picker ── */}
          <div className="field">
            <label>
              Room
              {scored.length > 0 && <span className="label-hint"> — sorted by best fit</span>}
            </label>

            {scored.length > 0 ? (
              <>
                <div className="room-picker">
                  {visibleScored.map(({ room, score, gaps }, i) => {
                    const lbl      = fitLabel(score)
                    const selected = form.roomId === room.id
                    return (
                      <button key={room.id} type="button"
                        className={`room-option ${selected ? 'selected' : ''}`}
                        onClick={() => set('roomId', room.id)}
                      >
                        <div className="room-opt-top">
                          <span className="room-opt-name">
                            {room.name}
                            {i === 0 && <span className="star-badge">★ Best</span>}
                          </span>
                          <span className="fit-badge"
                            style={{ color: lbl.color, borderColor: lbl.color+'55', background: lbl.color+'12' }}>
                            {lbl.text}
                          </span>
                        </div>
                        <div className="room-opt-detail">{gapDesc(gaps)}</div>
                      </button>
                    )
                  })}
                </div>
                {scored.length > 5 && (
                  <button type="button" className="show-more-btn"
                    onClick={() => setShowAll(v => !v)}>
                    {showAll ? 'Show fewer rooms' : `Show all ${scored.length} available rooms`}
                  </button>
                )}
                {currentScore && !isBestRoom && fitLabel(currentScore.score).text === 'Creates gap' && (
                  <div className="room-warn">
                    ⚠ This room will leave a gap. Consider <strong>{bestRoom.room.name}</strong> for a better fit.
                  </div>
                )}
              </>
            ) : (
              <select value={form.roomId} onChange={e => set('roomId', e.target.value)}>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}{r.type ? ` — ${r.type}` : ''}</option>
                ))}
              </select>
            )}
          </div>

          {/* ── Price & payment ── */}
          <div className="field-row">
            <div className="field">
              <label>
                Total Price
                {autoPrice !== null && !priceOverridden && (
                  <span className="label-hint"> — auto from season</span>
                )}
              </label>
              <div className="price-field-wrap">
                <span className="currency-prefix">€</span>
                <input type="number" value={form.price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0" min="0" step="1" />
              </div>
            </div>

            <div className="field">
              <label>Payment Status</label>
              <select value={form.paymentStatus}
                onChange={e => set('paymentStatus', e.target.value)}>
                {PAYMENT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment summary pill */}
          {totalPrice > 0 && (
            <div className={`payment-summary status-${form.paymentStatus}`}>
              {form.paymentStatus === 'reserved' && (
                <span>Total: <strong>€ {totalPrice}</strong> — no payment collected</span>
              )}
              {form.paymentStatus === 'advance' && (
                <span>Advance paid: <strong>€ {advance}</strong> — remaining: <strong>€ {totalPrice - advance}</strong></span>
              )}
              {form.paymentStatus === 'paid' && (
                <span>Fully paid: <strong>€ {totalPrice}</strong></span>
              )}
            </div>
          )}

          <div className="field">
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Special requests, early check-in, etc." rows={3} />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-foot">
            {mode === 'edit' && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
            )}
            <div className="foot-right">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                {mode === 'add' ? 'Save Reservation' : 'Update'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
