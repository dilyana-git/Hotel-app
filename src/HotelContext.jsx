import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadAll, save } from './utils/api.js';

export const DEFAULT_ROOMS = [
  { id: 'r11', name: 'Стая 11',   num: 11, type: 'Двойна',      cap: 2, price: 80  },
  { id: 'r12', name: 'Стая 12',   num: 12, type: 'Двойна',      cap: 2, price: 80  },
  { id: 'r13', name: 'Стая 13',   num: 13, type: 'Двойна',      cap: 2, price: 80  },
  { id: 'r14', name: 'Стая 14',   num: 14, type: 'Тройна',      cap: 3, price: 100 },
  { id: 'r22', name: 'Стая 22',   num: 22, type: 'Двойна',      cap: 2, price: 80  },
  { id: 'r23', name: 'Стая 23',   num: 23, type: 'Двойна',      cap: 2, price: 80  },
  { id: 'r24', name: 'Стая 24',   num: 24, type: 'Тройна',      cap: 3, price: 100 },
  { id: 'r25', name: 'Стая 25',   num: 25, type: 'Двойна',      cap: 2, price: 80  },
  { id: 'r32', name: 'Стая 32',   num: 32, type: 'Семейна',     cap: 4, price: 120 },
  { id: 'r33', name: 'Стая 33',   num: 33, type: 'Двойна',      cap: 2, price: 80  },
  { id: 'r21', name: 'Апарт. 21', num: 21, type: 'Апартамент',  cap: 4, price: 160 },
  { id: 'r26', name: 'Апарт. 26', num: 26, type: 'Апартамент',  cap: 4, price: 160 },
  { id: 'r31', name: 'Апарт. 31', num: 31, type: 'Апартамент',  cap: 5, price: 210 },
];

const DEFAULT_SEASONS = [];

const HotelCtx = createContext(null);

export function HotelProvider({ children }) {
  const [rooms, setRooms]               = useState(DEFAULT_ROOMS);
  const [reservations, setReservations] = useState([]);
  const [seasons, setSeasons]           = useState(DEFAULT_SEASONS);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState(null);

  useEffect(() => {
    loadAll(DEFAULT_ROOMS, DEFAULT_SEASONS)
      .then(data => {
        if (data.rooms?.length)   setRooms(data.rooms);
        if (data.reservations)    setReservations(data.reservations);
        if (data.seasons?.length) setSeasons(data.seasons);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function saveReservation(form) {
    setReservations(prev => {
      const next = form.id
        ? prev.map(r => r.id === form.id ? { ...r, ...form } : r)
        : [...prev, { ...form, id: `res-${Date.now()}` }];
      save('reservations', next);
      return next;
    });
    setModal(null);
  }

  function deleteReservation(id) {
    setReservations(prev => {
      const next = prev.filter(r => r.id !== id);
      save('reservations', next);
      return next;
    });
    setModal(null);
  }

  function applySwap(conflictResId, toRoomId) {
    setReservations(prev => {
      const next = prev.map(r => r.id === conflictResId ? { ...r, roomId: toRoomId } : r);
      save('reservations', next);
      return next;
    });
  }

  function saveRooms(newRooms) {
    setRooms(newRooms);
    save('rooms', newRooms);
  }

  function saveSeasons(newSeasons) {
    setSeasons(newSeasons);
    save('seasons', newSeasons);
  }

  return (
    <HotelCtx.Provider value={{
      rooms, reservations, seasons, loading,
      saveReservation, deleteReservation, applySwap, saveRooms,
      modal, openModal: setModal, closeModal: () => setModal(null),
      saveSeasons,
    }}>
      {children}
    </HotelCtx.Provider>
  );
}

export function useHotel() {
  const ctx = useContext(HotelCtx);
  if (!ctx) throw new Error('useHotel must be used within HotelProvider');
  return ctx;
}

// Shared helpers used by desktop + mobile
export function roomNum(room) {
  if (room?.num != null) return room.num;
  const m = room?.name?.match(/\d+/);
  return m ? parseInt(m[0]) : 0;
}

export function isApt(room) {
  return room?.type === 'Апартамент' || room?.type?.toLowerCase().includes('апартамент');
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function nightsBetween(checkIn, checkOut) {
  return Math.max(0, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));
}
