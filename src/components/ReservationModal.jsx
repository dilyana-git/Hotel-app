import { useState, useEffect, useRef, useMemo } from 'react'
import { scoreRooms, fitLabel, findSwapSuggestions } from '../utils/roomScoring'
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
  if (gaps.before === 0)      parts.push('идва след предния гост')
  else if (gaps.before === 1) parts.push('1 ден след предния гост')
  else if (gaps.before != null) parts.push(`${gaps.before}д преди`)

  if (gaps.after === 0)       parts.push('идва преди следващия гост')
  else if (gaps.after === 1)  parts.push('1 ден преди следващия гост')
  else if (gaps.after != null)  parts.push(`${gaps.after}д след`)

  return parts.join(' · ') || 'Няма съседни резервации'
}

// Migrate old paid:boolean → paymentStatus string
function resolveStatus(res) {
  if (!res) return 'reserved'
  if (res.paymentStatus) return res.paymentStatus
  return res.paid ? 'paid' : 'reserved'
}

const PAYMENT_OPTIONS = [
  { value: 'reserved', label: 'Резервирано — без плащане' },
  { value: 'advance',  label: 'Авансово платено (30%)' },
  { value: 'paid',     label: 'Напълно платено' },
]

export default function ReservationModal({
  mode, reservation, initialRoomId, initialCheckIn, initialCheckOut, voiceData,
  rooms, seasons, reservations, onSave, onDelete, onClose, onApplySwap,
}) {
  const firstInputRef = useRef(null)
  const defaultCheckIn  = voiceData?.checkIn  ?? initialCheckIn  ?? ''
  const defaultCheckOut = voiceData?.checkOut ?? initialCheckOut ?? (defaultCheckIn ? addDays(defaultCheckIn, 1) : '')
  const defaultRoomId   = voiceData?.roomId   ?? initialRoomId   ?? rooms[0]?.id ?? ''

  const [form, setForm] = useState({
    guestName:     voiceData?.guestName ?? '',
    phone:         voiceData?.phone     ?? '',
    roomId:        defaultRoomId,
    checkIn:       defaultCheckIn,
    checkOut:      defaultCheckOut,
    price:         '',
    paymentStatus: 'reserved',
    notes:         voiceData?.notes ?? '',
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

  const swapSuggestions = useMemo(() => {
    if (!form.checkIn || !form.checkOut || form.checkOut <= form.checkIn) return []
    return findSwapSuggestions(rooms, form.checkIn, form.checkOut, reservations, reservation?.id)
  }, [form.checkIn, form.checkOut, rooms, reservations, reservation?.id])

  const bestRoom    = scored[0] ?? null
  const isBestRoom  = bestRoom?.room.id === form.roomId
  const currentScore = scored.find(s => s.room.id === form.roomId)

  function handleApplySwap(s) {
    onApplySwap?.(s.conflictRes.id, s.toRoom.id)
    set('roomId', s.fromRoom.id)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.guestName.trim()) { setError('Име на гост е задължително.'); return }
    if (!form.checkIn)          { setError('Датата на чек-ин е задължителна.'); return }
    if (!form.checkOut)         { setError('Датата на чек-аут е задължителна.'); return }
    if (form.checkOut <= form.checkIn) { setError('Чек-аутът трябва да е след чек-ина.'); return }
    if (hasConflict(reservations, form.roomId, form.checkIn, form.checkOut, reservation?.id)) {
      setError('Тази стая вече е резервирана за част от този период.'); return
    }
    onSave({
      ...form,
      id: mode === 'edit' ? reservation.id : undefined,
    })
  }

  function handleDelete() {
    if (window.confirm(`Изтрий резервацията за ${reservation.guestName}?`)) {
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
          <h2>{mode === 'add' ? 'Нова резервация' : 'Редактирай резервацията'}</h2>
          <button className="close-x" onClick={onClose} aria-label="Затвори">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {voiceData?._transcript && (
            <div className="voice-banner">
              🎤 &ldquo;{voiceData._transcript}&rdquo;
              <span className="voice-banner-hint">Review the pre-filled details and confirm</span>
            </div>
          )}

          <div className="field">
            <label>Име на гост <span className="req">*</span></label>
            <input ref={firstInputRef} type="text" value={form.guestName}
              onChange={e => set('guestName', e.target.value)} placeholder="Пълно име" />
          </div>

          <div className="field">
            <label>Телефонен номер</label>
            <input type="tel" value={form.phone}
              onChange={e => set('phone', e.target.value)} placeholder="+359 98 123 4567" />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Чек-ин</label>
              <input type="date" value={form.checkIn}
                onChange={e => set('checkIn', e.target.value)} />
            </div>
            <div className="field">
              <label>Чек-аут</label>
              <input type="date" value={form.checkOut}
                min={form.checkIn ? addDays(form.checkIn, 1) : ''}
                onChange={e => set('checkOut', e.target.value)} />
            </div>
          </div>

          {nights > 0 && (
            <div className="nights-pill">{nights} нощ{nights !== 1 ? 'и' : ''} · {roomName}</div>
          )}

          {/* ── Smart room picker ── */}
          <div className="field">
            <label>
              Стая
              {scored.length > 0 && <span className="label-hint"> — сортирано по най-добро съответствие</span>}
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
                            {i === 0 && <span className="star-badge">★ Най-добро</span>}
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
                    {showAll ? 'Покажи по-малко стаи' : `Покажи всички ${scored.length} налични стаи`}
                  </button>
                )}
                {currentScore && !isBestRoom && fitLabel(currentScore.score).text === 'Оставя празнина' && (
                  <div className="room-warn">
                    ⚠ Тази стая ще остави празнина. Разгледайте <strong>{bestRoom.room.name}</strong> за по-добро съответствие.
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

          {/* ── Swap suggestions ── */}
          {swapSuggestions.length > 0 && (
            <div className="swap-section">
              <div className="swap-section-label">Освободи стая като преместиш съществуващ гост</div>
              {swapSuggestions.map(s => {
                const lbl = fitLabel(s.newScore)
                return (
                  <div key={s.conflictRes.id} className="swap-item">
                    <div className="swap-info">
                      <span className="swap-guest">{s.conflictRes.guestName}</span>
                      <span className="swap-route">
                        Стая {s.fromRoom.name} → Стая {s.toRoom.name}
                      </span>
                    </div>
                    <div className="swap-item-right">
                      <span className="fit-badge" style={{
                        color: lbl.color,
                        borderColor: lbl.color + '55',
                        background:  lbl.color + '12',
                      }}>
                        {lbl.text}
                      </span>
                      <button type="button" className="btn btn-sm btn-ghost"
                        onClick={() => handleApplySwap(s)}>
                        Приложи
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Price & payment ── */}
          <div className="field-row">
            <div className="field">
              <label>
                Обща цена
                {autoPrice !== null && !priceOverridden && (
                  <span className="label-hint"> — автоматично от сезон</span>
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
              <label>Статус на плащане</label>
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
                <span>Обща сума: <strong>€ {totalPrice}</strong> — без събрано плащане</span>
              )}
              {form.paymentStatus === 'advance' && (
                <span>Авансово платено: <strong>€ {advance}</strong> — оставащо: <strong>€ {totalPrice - advance}</strong></span>
              )}
              {form.paymentStatus === 'paid' && (
                <span>Напълно платено: <strong>€ {totalPrice}</strong></span>
              )}
            </div>
          )}

          <div className="field">
            <label>Бележки</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Специални заявки, ранен чек-ин, и т.н." rows={3} />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-foot">
            {mode === 'edit' && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>Изтрий</button>
            )}
            <div className="foot-right">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Отмени</button>
              <button type="submit" className="btn btn-primary">
                {mode === 'add' ? 'Запази резервацията' : 'Актуализирай'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
