import { useState, useEffect } from 'react'
import BookingGrid from './components/BookingGrid'
import ReservationModal from './components/ReservationModal'
import ReservationQuickView from './components/ReservationQuickView'
import RoomsManager from './components/RoomsManager'
import ConfigPage from './components/ConfigPage'
import { loadAll, save } from './utils/api'

const MONTHS = [
  'Януари','Февруари','Март','Април','Май','Юни',
  'Юли','Август','Септември','Октомври','Ноември','Декември'
]


const DEFAULT_ROOMS = [
  { id: 'r11', name: '11', type: 'Стая',        price: 100 },
  { id: 'r12', name: '12', type: 'Стая',        price: 100 },
  { id: 'r13', name: '13', type: 'Стая',        price: 100 },
  { id: 'r14', name: '14', type: 'Стая',        price: 100 },
  { id: 'r21', name: '21', type: 'Апартамент',  price: 150 },
  { id: 'r22', name: '22', type: 'Стая',        price: 100 },
  { id: 'r23', name: '23', type: 'Стая',        price: 100 },
  { id: 'r24', name: '24', type: 'Стая',        price: 100 },
  { id: 'r25', name: '25', type: 'Стая',        price: 100 },
  { id: 'r26', name: '26', type: 'Апартамент',  price: 150 },
  { id: 'r31', name: '31', type: 'Апартамент',  price: 150 },
  { id: 'r32', name: '32', type: 'Стая',        price: 100 },
  { id: 'r33', name: '33', type: 'Стая',        price: 100 },
  { id: 'r34', name: '34', type: 'Стая',        price: 100 },
  { id: 'r35', name: '35', type: 'Стая',        price: 100 },
  { id: 'r36', name: '36', type: 'Апартамент',  price: 150 },
]

const DEFAULT_SEASONS = [
  { id:'s1', name:'Нисък сезон',  from:'01-01', to:'05-31', prices:{ Стая: 80,  Апартамент: 120 } },
  { id:'s2', name:'Висок сезон', from:'06-01', to:'08-31', prices:{ Стая: 140, Апартамент: 210 } },
  { id:'s3', name:'Преходен',    from:'09-01', to:'12-31', prices:{ Стая: 100, Апартамент: 150 } },
]

export default function App() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [rooms, setRooms] = useState(DEFAULT_ROOMS)
  const [reservations, setReservations] = useState([])
  const [seasons, setSeasons] = useState(DEFAULT_SEASONS)
  const [modal, setModal] = useState(null)
  const [view, setView]   = useState('grid')
  const [ready, setReady] = useState(false)

  // Load from server (if running) or localStorage on startup
  useEffect(() => {
    loadAll(DEFAULT_ROOMS, DEFAULT_SEASONS).then(data => {
      setRooms(data.rooms)
      setReservations(data.reservations)
      setSeasons(data.seasons)
      setReady(true)
    })
  }, [])

  // Persist every change to localStorage + server in the background
  useEffect(() => { if (ready) save('rooms',        rooms)        }, [rooms,        ready])
  useEffect(() => { if (ready) save('reservations', reservations) }, [reservations, ready])
  useEffect(() => { if (ready) save('seasons',      seasons)      }, [seasons,      ready])

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

function openAdd(roomId, checkIn, checkOut) { setModal({ mode: 'add', roomId, checkIn, checkOut }) }
  function openQuick(reservation) { setModal({ mode: 'quick', reservation }) }
  function openEdit(reservation)  { setModal({ mode: 'edit',  reservation }) }

  function updatePaymentStatus(id, status) {
    setReservations(prev => prev.map(r =>
      r.id === id ? { ...r, paymentStatus: status } : r
    ))
    setModal(prev => prev?.mode === 'quick'
      ? { ...prev, reservation: { ...prev.reservation, paymentStatus: status } }
      : prev
    )
  }

  function moveReservation(id, newRoomId) {
    setReservations(prev => prev.map(r =>
      r.id === id ? { ...r, roomId: newRoomId } : r
    ))
    setModal(prev => prev?.mode === 'quick' && prev.reservation?.id === id
      ? { ...prev, reservation: { ...prev.reservation, roomId: newRoomId } }
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

  if (!ready) return <div className="app-loading">Зареждане…</div>

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">🏨</span>
          <span className="brand-name">Хотелски Мениджър</span>
        </div>
        <nav className="header-nav">
          {[
            { key: 'grid',   icon: '📅', label: 'Резервации' },
            { key: 'rooms',  icon: '🚪', label: 'Стаи' },
            { key: 'config', icon: '⚙️', label: 'Цени' },
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
                <button className="today-btn" onClick={goToday}>Днес</button>
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
          rooms={rooms}
          reservations={reservations}
          onStatusChange={status => { updatePaymentStatus(modal.reservation.id, status); setModal(null) }}
          onEdit={() => openEdit(modal.reservation)}
          onDelete={deleteReservation}
          onClose={() => setModal(null)}
          onMove={moveReservation}
        />
      )}

      {(modal?.mode === 'add' || modal?.mode === 'edit') && (
        <ReservationModal
          mode={modal.mode}
          reservation={modal.reservation ?? null}
          initialRoomId={modal.roomId ?? modal.reservation?.roomId}
          initialCheckIn={modal.checkIn ?? modal.reservation?.checkIn}
          initialCheckOut={modal.checkOut}
rooms={rooms}
          seasons={seasons}
          reservations={reservations}
          onSave={saveReservation}
          onDelete={deleteReservation}
          onClose={() => setModal(null)}
          onApplySwap={moveReservation}
        />
      )}
    </div>
  )
}
