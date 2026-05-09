import { useState, useEffect } from 'react'
import BookingGrid from './components/BookingGrid'
import ReservationModal from './components/ReservationModal'
import ReservationQuickView from './components/ReservationQuickView'
import RoomsManager from './components/RoomsManager'
import ConfigPage from './components/ConfigPage'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

const DEFAULT_ROOMS = [
  { id: 'r11', name: '11', type: 'Room',      price: 100 },
  { id: 'r12', name: '12', type: 'Room',      price: 100 },
  { id: 'r13', name: '13', type: 'Room',      price: 100 },
  { id: 'r14', name: '14', type: 'Room',      price: 100 },
  { id: 'r21', name: '21', type: 'Apartment', price: 150 },
  { id: 'r22', name: '22', type: 'Room',      price: 100 },
  { id: 'r23', name: '23', type: 'Room',      price: 100 },
  { id: 'r24', name: '24', type: 'Room',      price: 100 },
  { id: 'r25', name: '25', type: 'Room',      price: 100 },
  { id: 'r26', name: '26', type: 'Apartment', price: 150 },
  { id: 'r31', name: '31', type: 'Apartment', price: 150 },
  { id: 'r32', name: '32', type: 'Room',      price: 100 },
  { id: 'r33', name: '33', type: 'Room',      price: 100 },
  { id: 'r34', name: '34', type: 'Room',      price: 100 },
  { id: 'r35', name: '35', type: 'Room',      price: 100 },
  { id: 'r36', name: '36', type: 'Apartment', price: 150 },
]

const DEFAULT_SEASONS = [
  { id:'s1', name:'Low Season',  from:'01-01', to:'05-31', prices:{ Room: 80,  Apartment: 120 } },
  { id:'s2', name:'High Season', from:'06-01', to:'08-31', prices:{ Room: 140, Apartment: 210 } },
  { id:'s3', name:'Shoulder',    from:'09-01', to:'12-31', prices:{ Room: 100, Apartment: 150 } },
]

export default function App() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [rooms, setRooms] = useState(() => load('hm-rooms-v4', DEFAULT_ROOMS))
  const [reservations, setReservations] = useState(() => load('hm-reservations', []))
  const [seasons, setSeasons] = useState(() => load('hm-seasons', DEFAULT_SEASONS))
  const [modal, setModal] = useState(null)
  const [view, setView]   = useState('grid')

  useEffect(() => { localStorage.setItem('hm-rooms-v4',     JSON.stringify(rooms))        }, [rooms])
  useEffect(() => { localStorage.setItem('hm-reservations', JSON.stringify(reservations)) }, [reservations])
  useEffect(() => { localStorage.setItem('hm-seasons',      JSON.stringify(seasons))      }, [seasons])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth() + 1)
  }

  function openAdd(roomId, date)  { setModal({ mode: 'add',   roomId, date }) }
  function openQuick(reservation) { setModal({ mode: 'quick', reservation }) }
  function openEdit(reservation)  { setModal({ mode: 'edit',  reservation }) }

  function updatePaymentStatus(id, status) {
    setReservations(prev => prev.map(r =>
      r.id === id ? { ...r, paymentStatus: status } : r
    ))
    // Keep quick view open with updated reservation
    setModal(prev => prev?.mode === 'quick'
      ? { ...prev, reservation: { ...prev.reservation, paymentStatus: status } }
      : prev
    )
  }

  function saveReservation(data) {
    if (modal.mode === 'add') {
      setReservations(prev => [...prev, { ...data, id: String(Date.now()) }])
    } else {
      setReservations(prev => prev.map(r => r.id === data.id ? data : r))
    }
    setModal(null)
  }

  function deleteReservation(id) {
    setReservations(prev => prev.filter(r => r.id !== id))
    setModal(null)
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">🏨</span>
          <span className="brand-name">Hotel Manager</span>
        </div>
        <nav className="header-nav">
          {[
            { key: 'grid',   icon: '📅', label: 'Bookings' },
            { key: 'rooms',  icon: '🚪', label: 'Rooms' },
            { key: 'config', icon: '⚙️', label: 'Pricing' },
          ].map(t => (
            <button
              key={t.key}
              className={`nav-tab ${view === t.key ? 'active' : ''}`}
              onClick={() => setView(t.key)}
            >
              <span className="nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {view === 'grid' && (
        <>
          <div className="month-nav">
            <button className="month-arrow" onClick={prevMonth}>‹</button>
            <div className="month-center">
              <h2 className="month-title">{MONTHS[month - 1]} {year}</h2>
              {!isCurrentMonth && (
                <button className="today-btn" onClick={goToday}>Today</button>
              )}
            </div>
            <button className="month-arrow" onClick={nextMonth}>›</button>
          </div>

          <BookingGrid
            year={year}
            month={month}
            rooms={rooms}
            reservations={reservations}
            onCellClick={openAdd}
            onReservationClick={openQuick}
          />
        </>
      )}

      {view === 'rooms' && (
        <RoomsManager rooms={rooms} onSave={setRooms} />
      )}

      {view === 'config' && (
        <ConfigPage seasons={seasons} rooms={rooms} onSave={setSeasons} />
      )}

      {modal?.mode === 'quick' && (
        <ReservationQuickView
          reservation={modal.reservation}
          room={rooms.find(r => r.id === modal.reservation.roomId)}
          onStatusChange={status => updatePaymentStatus(modal.reservation.id, status)}
          onEdit={() => openEdit(modal.reservation)}
          onDelete={deleteReservation}
          onClose={() => setModal(null)}
        />
      )}

      {(modal?.mode === 'add' || modal?.mode === 'edit') && (
        <ReservationModal
          mode={modal.mode}
          reservation={modal.reservation ?? null}
          initialRoomId={modal.roomId ?? modal.reservation?.roomId}
          initialDate={modal.date ?? modal.reservation?.checkIn}
          rooms={rooms}
          seasons={seasons}
          reservations={reservations}
          onSave={saveReservation}
          onDelete={deleteReservation}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
