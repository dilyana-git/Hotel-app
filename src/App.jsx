import { useState, useEffect } from 'react'
import BookingGrid from './components/BookingGrid'
import ReservationModal from './components/ReservationModal'
import RoomsManager from './components/RoomsManager'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

const COLORS = [
  '#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6',
  '#06B6D4','#F97316','#EC4899','#14B8A6','#6366F1',
  '#84CC16','#E11D48'
]

let colorCursor = 0
function nextColor() {
  return COLORS[colorCursor++ % COLORS.length]
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

const DEFAULT_ROOMS = [
  { id: 'r11', name: '11', type: 'Room', price: 100 },
  { id: 'r12', name: '12', type: 'Room', price: 100 },
  { id: 'r13', name: '13', type: 'Room', price: 100 },
  { id: 'r14', name: '14', type: 'Room', price: 100 },
  { id: 'r21', name: '21', type: 'Apartment', price: 150 },
  { id: 'r22', name: '22', type: 'Room', price: 100 },
  { id: 'r23', name: '23', type: 'Room', price: 100 },
  { id: 'r24', name: '24', type: 'Room', price: 100 },
  { id: 'r25', name: '25', type: 'Room', price: 100 },
  { id: 'r26', name: '26', type: 'Apartment', price: 150 },
  { id: 'r31', name: '31', type: 'Apartment', price: 150 },
  { id: 'r32', name: '32', type: 'Room', price: 100 },
  { id: 'r33', name: '33', type: 'Room', price: 100 },
  { id: 'r34', name: '34', type: 'Room', price: 100 },
  { id: 'r35', name: '35', type: 'Room', price: 100 },
  { id: 'r36', name: '36', type: 'Apartment', price: 150 },
]

export default function App() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [rooms, setRooms] = useState(() => load('hm-rooms-v4', DEFAULT_ROOMS))
  const [reservations, setReservations] = useState(() => load('hm-reservations', []))
  const [modal, setModal] = useState(null)
  const [view, setView]   = useState('grid')

  useEffect(() => { localStorage.setItem('hm-rooms-v4', JSON.stringify(rooms)) }, [rooms])
  useEffect(() => { localStorage.setItem('hm-reservations', JSON.stringify(reservations)) }, [reservations])

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

  function openAdd(roomId, date) {
    setModal({ mode: 'add', roomId, date })
  }
  function openEdit(reservation) {
    setModal({ mode: 'edit', reservation })
  }

  function saveReservation(data) {
    if (modal.mode === 'add') {
      setReservations(prev => [...prev, { ...data, id: String(Date.now()), color: nextColor() }])
    } else {
      setReservations(prev => prev.map(r => r.id === data.id ? data : r))
    }
    setModal(null)
  }

  function deleteReservation(id) {
    setReservations(prev => prev.filter(r => r.id !== id))
    setModal(null)
  }

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">🏨</span>
          <span className="brand-name">Hotel Manager</span>
        </div>
        <nav className="header-nav">
          <button
            className={`nav-tab ${view === 'grid' ? 'active' : ''}`}
            onClick={() => setView('grid')}
          >
            <span className="nav-icon">📅</span>
            <span>Bookings</span>
          </button>
          <button
            className={`nav-tab ${view === 'rooms' ? 'active' : ''}`}
            onClick={() => setView('rooms')}
          >
            <span className="nav-icon">🚪</span>
            <span>Rooms</span>
          </button>
        </nav>
      </header>

      {view === 'grid' && (
        <>
          <div className="month-nav">
            <button className="month-arrow" onClick={prevMonth} aria-label="Previous month">‹</button>
            <div className="month-center">
              <h2 className="month-title">{MONTHS[month - 1]} {year}</h2>
              {!isCurrentMonth && (
                <button className="today-btn" onClick={goToday}>Today</button>
              )}
            </div>
            <button className="month-arrow" onClick={nextMonth} aria-label="Next month">›</button>
          </div>

          <BookingGrid
            year={year}
            month={month}
            rooms={rooms}
            reservations={reservations}
            onCellClick={openAdd}
            onReservationClick={openEdit}
          />
        </>
      )}

      {view === 'rooms' && (
        <RoomsManager rooms={rooms} onSave={setRooms} />
      )}

      {modal && (
        <ReservationModal
          mode={modal.mode}
          reservation={modal.reservation ?? null}
          initialRoomId={modal.roomId ?? modal.reservation?.roomId}
          initialDate={modal.date ?? modal.reservation?.checkIn}
          rooms={rooms}
          reservations={reservations}
          onSave={saveReservation}
          onDelete={deleteReservation}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
