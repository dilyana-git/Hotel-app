import React, { useState, useEffect } from 'react';
import './App.css';    // .btn / .btn-primary / layout utilities
import './styles.css'; // design tokens — loaded second so vars override App.css
import { HotelProvider, useHotel } from './HotelContext.jsx';
import ImprovedDesktop from './desktop.jsx';
import { MobileToday, MobileCalendar, MobileReservationDetail, MobileNewBooking } from './mobile.jsx';
import ReservationModal from './components/ReservationModal.jsx';

// ── Device detection ─────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

// ── Modal overlay — reads from HotelContext ───────────────────
function ModalOverlay() {
  const { rooms, reservations, seasons, modal, closeModal, saveReservation, deleteReservation, applySwap } = useHotel();
  if (!modal) return null;
  return (
    <ReservationModal
      mode={modal.mode}
      reservation={modal.reservation}
      initialRoomId={modal.initialRoomId}
      initialCheckIn={modal.initialCheckIn}
      initialCheckOut={modal.initialCheckOut}
      rooms={rooms}
      seasons={seasons}
      reservations={reservations}
      onSave={saveReservation}
      onDelete={deleteReservation}
      onClose={closeModal}
      onApplySwap={(conflictResId, toRoomId) => applySwap(conflictResId, toRoomId)}
    />
  );
}

// ── Mobile shell ─────────────────────────────────────────────
function MobileApp() {
  const [screen, setScreen] = useState('today');
  const screens = {
    today: <MobileToday onNavigate={setScreen} />,
    cal:   <MobileCalendar onNavigate={setScreen} />,
    res:   <MobileReservationDetail onNavigate={setScreen} />,
    new:   <MobileNewBooking onNavigate={setScreen} />,
  };
  return (
    <div style={{ height: '100dvh', width: '100vw', overflow: 'hidden', background: 'var(--bg)', position: 'relative', fontFamily: 'var(--font)', color: 'var(--ink)' }}>
      {screens[screen] ?? screens.today}
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────
function AppInner() {
  const mobile = useIsMobile();
  return (
    <>
      {mobile ? <MobileApp /> : <ImprovedDesktop />}
      <ModalOverlay />
    </>
  );
}

export default function App() {
  return (
    <HotelProvider>
      <AppInner />
    </HotelProvider>
  );
}
