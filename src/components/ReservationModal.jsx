import { useState, useEffect, useRef } from 'react'
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
  const [error, setError] = useState('')

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

  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])

  function set(field, value) {
    setError('')
    setForm(prev => {
      const next = { ...prev, [field]: value }
      // Auto-advance checkout when checkin changes
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

    const data = {
      ...form,
      id:    mode === 'edit' ? reservation.id    : undefined,
      color: mode === 'edit' ? reservation.color : undefined,
    }
    onSave(data)
  }

  function handleDelete() {
    if (window.confirm(`Delete reservation for ${reservation.guestName}?`)) {
      onDelete(reservation.id)
    }
  }

  const nights = nightsBetween(form.checkIn, form.checkOut)
  const roomName = rooms.find(r => r.id === form.roomId)?.name ?? ''

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

          {/* Room */}
          <div className="field">
            <label>Room</label>
            <select value={form.roomId} onChange={e => set('roomId', e.target.value)}>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}{r.type ? ` — ${r.type}` : ''}</option>
              ))}
            </select>
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
