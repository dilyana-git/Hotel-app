import { useState, useEffect, useRef, useMemo } from 'react'
import { scoreRooms, fitLabel } from '../utils/roomScoring'
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
  if (gaps.before === 0) parts.push('back-to-back after prev. guest')
  else if (gaps.before === 1) parts.push('1 day after prev. guest')
  else if (gaps.before != null) parts.push(`${gaps.before}d gap before`)

  if (gaps.after === 0) parts.push('back-to-back before next guest')
  else if (gaps.after === 1) parts.push('1 day before next guest')
  else if (gaps.after != null) parts.push(`${gaps.after}d gap after`)

  return parts.join(' · ') || 'No adjacent bookings'
}

export default function ReservationModal({
  mode, reservation, initialRoomId, initialDate,
  rooms, reservations, onSave, onDelete, onClose,
}) {
  const firstInputRef = useRef(null)
  const defaultCheckIn  = initialDate ?? ''
  const defaultCheckOut = initialDate ? addDays(initialDate, 1) : ''

  const [form, setForm] = useState({
    guestName: '',
    phone: '',
    roomId: initialRoomId ?? rooms[0]?.id ?? '',
    checkIn:  defaultCheckIn,
    checkOut: defaultCheckOut,
    price: '',
    paid: false,
    notes: '',
  })
  const [error, setError]             = useState('')
  const [showAllRooms, setShowAll]    = useState(false)

  useEffect(() => {
    if (mode === 'edit' && reservation) {
      setForm({
        guestName: reservation.guestName ?? '',
        phone:     reservation.phone     ?? '',
        roomId:    reservation.roomId,
        checkIn:   reservation.checkIn,
        checkOut:  reservation.checkOut,
        price:     reservation.price ?? '',
        paid:      reservation.paid  ?? false,
        notes:     reservation.notes ?? '',
      })
    }
  }, [mode, reservation])

  useEffect(() => { firstInputRef.current?.focus() }, [])

  function set(field, value) {
    setError('')
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'checkIn' && value) {
        if (!prev.checkOut || prev.checkOut <= value) {
          next.checkOut = addDays(value, 1)
        }
      }
      // Auto-set price when room changes, if price is empty
      if (field === 'roomId') {
        const room = rooms.find(r => r.id === value)
        if (room && !prev.price) {
          next.price = room.price
        }
      }
      return next
    })
  }

  // Score available rooms whenever dates change
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
    if (form.checkOut <= form.checkIn) {
      setError('Check-out must be after check-in.'); return
    }
    if (hasConflict(reservations, form.roomId, form.checkIn, form.checkOut, reservation?.id)) {
      setError('This room is already booked for part of that period.'); return
    }
    onSave({
      ...form,
      id:    mode === 'edit' ? reservation.id    : undefined,
      color: mode === 'edit' ? reservation.color : undefined,
    })
  }

  function handleDelete() {
    if (window.confirm(`Delete reservation for ${reservation.guestName}?`)) {
      onDelete(reservation.id)
    }
  }

  const nights   = nightsBetween(form.checkIn, form.checkOut)
  const roomName = rooms.find(r => r.id === form.roomId)?.name ?? ''

  // Rooms shown in the smart picker (top 5 unless expanded)
  const visibleScored = showAllRooms ? scored : scored.slice(0, 5)

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{mode === 'add' ? 'New Reservation' : 'Edit Reservation'}</h2>
          <button className="close-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Guest info */}
          <div className="field">
            <label>Guest Name <span className="req">*</span></label>
            <input
              ref={firstInputRef}
              type="text"
              value={form.guestName}
              onChange={e => set('guestName', e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div className="field">
            <label>Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+1 234 567 8900"
            />
          </div>

          {/* Dates */}
          <div className="field-row">
            <div className="field">
              <label>Check-in</label>
              <input
                type="date"
                value={form.checkIn}
                onChange={e => set('checkIn', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Check-out</label>
              <input
                type="date"
                value={form.checkOut}
                min={form.checkIn ? addDays(form.checkIn, 1) : ''}
                onChange={e => set('checkOut', e.target.value)}
              />
            </div>
          </div>

          {nights > 0 && (
            <div className="nights-pill">
              {nights} night{nights !== 1 ? 's' : ''} · {roomName}
            </div>
          )}

          {/* ── Smart room picker ─────────────────────── */}
          <div className="field">
            <label>
              Room
              {scored.length > 0 && (
                <span className="label-hint"> — sorted by best fit</span>
              )}
            </label>

            {scored.length > 0 ? (
              <>
                <div className="room-picker">
                  {visibleScored.map(({ room, score, gaps }, i) => {
                    const lbl      = fitLabel(score)
                    const selected = form.roomId === room.id
                    return (
                      <button
                        key={room.id}
                        type="button"
                        className={`room-option ${selected ? 'selected' : ''}`}
                        onClick={() => set('roomId', room.id)}
                      >
                        <div className="room-opt-top">
                          <span className="room-opt-name">
                            {room.name}
                            {i === 0 && <span className="star-badge">★ Best</span>}
                          </span>
                          <span className="fit-badge" style={{ color: lbl.color, borderColor: lbl.color + '55', background: lbl.color + '12' }}>
                            {lbl.text}
                          </span>
                        </div>
                        <div className="room-opt-detail">{gapDesc(gaps)}</div>
                      </button>
                    )
                  })}
                </div>

                {scored.length > 5 && (
                  <button
                    type="button"
                    className="show-more-btn"
                    onClick={() => setShowAll(v => !v)}
                  >
                    {showAllRooms
                      ? 'Show fewer rooms'
                      : `Show all ${scored.length} available rooms`}
                  </button>
                )}

                {/* Warn if a non-optimal room is selected */}
                {currentScore && !isBestRoom && (() => {
                  const lbl = fitLabel(currentScore.score)
                  return lbl.text === 'Creates gap' ? (
                    <div className="room-warn">
                      ⚠ This room will leave a gap. Consider <strong>{bestRoom.room.name}</strong> for a better fit.
                    </div>
                  ) : null
                })()}
              </>
            ) : (
              /* Fallback plain select when dates not set yet */
              <select value={form.roomId} onChange={e => set('roomId', e.target.value)}>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}{r.type ? ` — ${r.type}` : ''}</option>
                ))}
              </select>
            )}
          </div>

          {/* Price */}
          <div className="field-row">
            <div className="field">
              <label>Price</label>
              <input
                type="number"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div className="field field-check">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={form.paid}
                  onChange={e => set('paid', e.target.checked)}
                />
                <span>Paid</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="field">
            <label>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Special requests, early check-in, etc."
              rows={3}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-foot">
            {mode === 'edit' && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
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
