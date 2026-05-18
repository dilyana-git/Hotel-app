import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useHotel, roomNum, isApt, todayISO, nightsBetween } from './HotelContext.jsx';
import RoomsManager from './components/RoomsManager.jsx';
import ConfigPage   from './components/ConfigPage.jsx';

const DOW_BG   = ['НЕД','ПОН','ВТО','СРЯ','ЧЕТ','ПЕТ','СЪБ'];
const MONTH_BG = ['Януари','Февруари','Март','Април','Май','Юни',
                  'Юли','Август','Септември','Октомври','Ноември','Декември'];
const N_DAYS   = 21;
const COL_W    = 70;
const LABEL_W  = 158;
const ROW_H    = 52;

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const NAV_TABS = [
  { id: 'calendar',     label: 'Календар'    },
  { id: 'reservations', label: 'Резервации'  },
  { id: 'rooms',        label: 'Стаи'        },
  { id: 'prices',       label: 'Цени'        },
];

// ─── Top bar (shared across all tabs) ─────────────────────────
function TopBar({ tab, setTab, totalRooms }) {
  const { openModal } = useHotel();
  return (
    <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: 'var(--surface)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--room-500), var(--apt-500))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>М</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Морски бряг</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Хотел · {totalRooms} стаи</div>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 4 }}>
          {NAV_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 14px',
              background: tab === t.id ? 'var(--ink)' : 'transparent',
              color:      tab === t.id ? 'white'      : 'var(--ink-2)',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>{t.label}</button>
          ))}
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => openModal({ mode: 'add' })}
          style={{ padding: '8px 16px', background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          ＋ Нова резервация
        </button>
        <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--room-100)', color: 'var(--room-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>ДМ</div>
      </div>
    </div>
  );
}

// ─── Calendar view (full month) ───────────────────────────────
function CalendarView() {
  const { rooms: realRooms, reservations, openModal } = useHotel();

  // Always start on the 1st of the month
  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  // All days of the viewed month
  const days = useMemo(() => {
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
    const count = new Date(y, m + 1, 0).getDate(); // days in month
    return Array.from({ length: count }, (_, i) => {
      const date = new Date(y, m, i + 1);
      const dow  = date.getDay();
      return { date, d: i + 1, w: DOW_BG[dow], weekend: dow === 0 || dow === 6 };
    });
  }, [viewMonth]);

  // Column width fills the viewport without horizontal scroll
  const colW = useMemo(() => {
    const available = Math.max(600, window.innerWidth) - 48 - LABEL_W;
    return Math.max(36, Math.floor(available / days.length));
  }, [days.length]);

  const todayStr = useMemo(() => todayISO(), []);
  // Index of today in the days array (-1 if today is not in this month)
  const todayIdx = useMemo(() => {
    const t = new Date();
    if (t.getFullYear() === viewMonth.getFullYear() && t.getMonth() === viewMonth.getMonth()) {
      return t.getDate() - 1;
    }
    return -1;
  }, [viewMonth]);

  const rooms = useMemo(() => realRooms.map(r => ({
    id: r.id, num: roomNum(r), type: isApt(r) ? 'apt' : 'room', cap: r.cap ?? 2, label: r.type ?? r.name,
  })), [realRooms]);

  // Month boundaries for clipping bookings
  const monthStart = viewMonth; // 1st of month (midnight)
  const monthEnd   = useMemo(() => new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1), [viewMonth]);

  const bookings = useMemo(() => reservations.flatMap(res => {
    const room = realRooms.find(r => r.id === res.roomId);
    if (!room) return [];
    const ci = startOfDay(new Date(res.checkIn));
    const co = startOfDay(new Date(res.checkOut));
    if (co <= monthStart || ci >= monthEnd) return [];
    return [{ id: res.id, room: roomNum(room), checkIn: res.checkIn, checkOut: res.checkOut,
              name: res.guestName, status: res.paymentStatus === 'advance' ? 'deposit' : (res.paymentStatus ?? 'reserved'),
              src: res.phone ? '📞' : '🌐', nights: nightsBetween(res.checkIn, res.checkOut) }];
  }), [reservations, realRooms, monthStart, monthEnd]);

  // ── Drag-to-select ───────────────────────────────────────────
  const dragRef  = useRef(null);
  const [drag, setDrag] = useState(null); // { roomId, startIdx, endIdx }

  // commitRef keeps a fresh closure over `days` and `openModal` without
  // making them effect dependencies, so the document listener never needs
  // to be removed/re-added on every month change.
  const commitRef = useRef(null);
  commitRef.current = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    setDrag(null);
    const minIdx = Math.min(d.startIdx, d.endIdx);
    const maxIdx = Math.max(d.startIdx, d.endIdx);
    const checkIn  = days[minIdx].date.toISOString().slice(0, 10);
    const coDate   = new Date(days[maxIdx].date);
    coDate.setDate(coDate.getDate() + 1);
    const checkOut = coDate.toISOString().slice(0, 10);
    openModal({ mode: 'add', initialRoomId: d.roomId, initialCheckIn: checkIn, initialCheckOut: checkOut });
  }, [days, openModal]);

  useEffect(() => {
    const onUp = () => commitRef.current?.();
    document.addEventListener('mouseup', onUp);
    return () => document.removeEventListener('mouseup', onUp);
  }, []);

  const handleCellMouseDown = useCallback((e, roomId, dayIdx) => {
    e.preventDefault(); // prevent text selection while dragging
    dragRef.current = { roomId, startIdx: dayIdx, endIdx: dayIdx };
    setDrag({ ...dragRef.current });
  }, []);

  const handleCellMouseEnter = useCallback((roomId, dayIdx) => {
    const d = dragRef.current;
    if (!d || d.roomId !== roomId || d.endIdx === dayIdx) return;
    dragRef.current = { ...d, endIdx: dayIdx };
    setDrag({ ...dragRef.current });
  }, []);

  // ── Today stats (always relative to actual today, not the viewed month)
  const todaysRes      = reservations.filter(r => r.checkIn <= todayStr && r.checkOut > todayStr);
  const arrivingRes    = reservations.filter(r => r.checkIn === todayStr);
  const departingCount = reservations.filter(r => r.checkOut === todayStr).length;
  const occupied       = todaysRes.length;
  const totalRooms     = realRooms.length;
  const occupancyPct   = totalRooms > 0 ? Math.round(occupied / totalRooms * 100) : 0;
  const arrivingSub    = arrivingRes.length > 0
    ? arrivingRes[0].guestName + (arrivingRes.length > 1 ? `, още ${arrivingRes.length - 1}` : '') : '—';
  const weekRevenue = useMemo(() => {
    const endStr = new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().slice(0, 10);
    return reservations.filter(r => r.checkIn >= todayStr && r.checkIn < endStr).reduce((s, r) => s + (Number(r.price) || 0), 0);
  }, [reservations, todayStr]);

  // Navigate by whole months
  function navigate(delta) {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }
  function goToday() {
    const t = new Date();
    setViewMonth(new Date(t.getFullYear(), t.getMonth(), 1));
  }

  const viewLabel = `${MONTH_BG[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
  const todayLeft = todayIdx >= 0 ? LABEL_W + todayIdx * colW : -9999;

  // Render one booking bar, clipped to the visible month
  const renderBooking = (b) => {
    const ci = startOfDay(new Date(b.checkIn));
    const co = startOfDay(new Date(b.checkOut));
    // Position relative to day 1 of the month (index 0)
    const relStart = Math.round((ci - monthStart) / 86400000);
    const relEnd   = Math.round((co - monthStart) / 86400000);
    const visStart = Math.max(relStart, 0);
    const visEnd   = Math.min(relEnd, days.length);
    if (visEnd <= visStart) return null;

    const apt = rooms.find(r => r.num === b.room)?.type === 'apt';
    const pal = apt
      ? { fill: b.status === 'paid' ? 'var(--apt-100)' : 'var(--apt-50)',   border: 'var(--apt-500)',  ink: 'var(--apt-700)'  }
      : { fill: b.status === 'paid' ? 'var(--room-100)' : 'var(--room-50)', border: 'var(--room-500)', ink: 'var(--room-700)' };

    // Show arrow indicators when the booking extends beyond the current month
    const fromPrev = relStart < 0;
    const toNext   = relEnd > days.length;

    return (
      <div key={`${b.room}-${b.checkIn}`}
        onClick={() => { const res = reservations.find(r => r.id === b.id); if (res) openModal({ mode: 'edit', reservation: res }); }}
        title={`${b.name} · ${b.checkIn} → ${b.checkOut}`}
        style={{
          position: 'absolute',
          left:  visStart * colW + (fromPrev ? 0 : 4),
          width: (visEnd - visStart) * colW - (fromPrev ? 0 : 4) - (toNext ? 0 : 4),
          top: 6, bottom: 6,
          background: pal.fill,
          borderLeft:  fromPrev ? `2px dashed ${pal.border}` : `3px solid ${pal.border}`,
          borderRight: toNext   ? `2px dashed ${pal.border}` : 'none',
          borderRadius: fromPrev && toNext ? 0 : fromPrev ? '0 8px 8px 0' : toNext ? '8px 0 0 8px' : 8,
          padding: '5px 8px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          color: pal.ink, boxShadow: 'var(--shadow-sm)', cursor: 'pointer', overflow: 'hidden',
          pointerEvents: 'auto',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
          <StatusDot s={b.status} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>{b.src} · {b.nights}н</div>
      </div>
    );
  };

  return (
    <>
      {/* Stats strip */}
      <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <StatCard label="Заетост днес"     value={`${occupancyPct}%`}           sub={`${occupied} от ${totalRooms} стаи`} accent="var(--ok)"      big />
        <StatCard label="Пристигат днес"   value={arrivingRes.length}            sub={arrivingSub}                         accent="var(--info)"   icon="↘" />
        <StatCard label="Заминават днес"   value={departingCount}                sub="до 11:00"                            accent="var(--warn)"   icon="↗" />
        <StatCard label="Свободни стаи"    value={totalRooms - occupied}         sub="за тази вечер"                       accent="var(--ink)"    icon="🛏" />
        <StatCard label="Очаквани приходи" value={weekRevenue ? `${weekRevenue} лв` : '—'} sub="следващите 7 дни"         accent="var(--apt-500)" icon="◷" />
      </div>

      {/* Toolbar */}
      <div style={{ margin: '0 24px 14px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, border: '1px solid var(--line)', background: 'white', borderRadius: 8, color: 'var(--ink-2)', cursor: 'pointer', fontSize: 18 }}>‹</button>
          <button onClick={() => navigate(1)}  style={{ width: 32, height: 32, border: '1px solid var(--line)', background: 'white', borderRadius: 8, color: 'var(--ink-2)', cursor: 'pointer', fontSize: 18 }}>›</button>
          <button onClick={goToday}            style={{ padding: '6px 12px', border: '1px solid var(--line)', background: 'white', borderRadius: 8, fontSize: 13, color: 'var(--ink-2)', fontWeight: 600, cursor: 'pointer' }}>Днес</button>
          <div style={{ marginLeft: 12, fontSize: 16, fontWeight: 700 }}>{viewLabel}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>· {days.length} дни</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>
          <LegendDot color="var(--ok)"      label="Платено" />
          <LegendDot color="#e6b020"        label="Капаро" />
          <LegendDot color="var(--muted-2)" label="Резервирано" />
        </div>
      </div>

      {/* Calendar grid — fills full width, no horizontal scroll */}
      <div style={{ margin: '0 24px 24px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', userSelect: drag ? 'none' : 'auto' }}>
        {/* Date header */}
        <div style={{ display: 'grid', gridTemplateColumns: `${LABEL_W}px repeat(${days.length}, ${colW}px)`, borderBottom: '1px solid var(--line)' }}>
          <div style={{ padding: '12px 14px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.06em' }}>СТАЯ / ДАТА</div>
          {days.map((day, i) => (
            <div key={i} style={{ padding: '8px 0', textAlign: 'center', borderLeft: '1px solid var(--line-2)',
              background: i === todayIdx ? 'var(--ink)' : (day.weekend ? 'var(--surface-2)' : 'transparent'),
              color: i === todayIdx ? 'white' : 'var(--ink-2)' }}>
              <div style={{ fontSize: 9, fontWeight: 500, opacity: i === todayIdx ? 0.7 : 0.5, letterSpacing: '0.04em' }}>{day.w}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 1 }}>{day.d}</div>
            </div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ position: 'relative' }}>
          {todayIdx >= 0 && (
            <div style={{ position: 'absolute', left: todayLeft, width: colW, top: 0, bottom: 0, background: 'rgba(26,24,20,0.04)', pointerEvents: 'none', zIndex: 1 }} />
          )}

          {rooms.filter(r => r.type === 'room').length > 0 && (
            <RoomGroupHeader label="Стаи" count={rooms.filter(r => r.type === 'room').length} labelW={LABEL_W} />
          )}
          {rooms.filter(r => r.type === 'room').map(r => (
            <RoomRow key={r.id} room={r} days={days} colW={colW} labelW={LABEL_W} rowH={ROW_H}
              bookings={bookings.filter(b => b.room === r.num)} renderBooking={renderBooking}
              drag={drag} onCellMouseDown={handleCellMouseDown} onCellMouseEnter={handleCellMouseEnter} />
          ))}

          {rooms.filter(r => r.type === 'apt').length > 0 && (
            <RoomGroupHeader label="Апартаменти" count={rooms.filter(r => r.type === 'apt').length} labelW={LABEL_W} />
          )}
          {rooms.filter(r => r.type === 'apt').map(r => (
            <RoomRow key={r.id} room={r} days={days} colW={colW} labelW={LABEL_W} rowH={ROW_H}
              bookings={bookings.filter(b => b.room === r.num)} renderBooking={renderBooking}
              drag={drag} onCellMouseDown={handleCellMouseDown} onCellMouseEnter={handleCellMouseEnter} />
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Reservations list view ────────────────────────────────────
function ReservationsView() {
  const { rooms: realRooms, reservations, openModal } = useHotel();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return reservations
      .filter(r => !q || r.guestName?.toLowerCase().includes(q) || r.phone?.includes(q))
      .sort((a, b) => b.checkIn.localeCompare(a.checkIn));
  }, [reservations, search]);

  const STATUS_LABEL = { paid: 'Платено', advance: 'Авансово', reserved: 'Резервирано' };
  const STATUS_COLOR = { paid: 'var(--ok)', advance: '#e6b020', reserved: 'var(--muted-2)' };

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Търси по гост или телефон…"
          style={{ padding: '8px 14px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 14, width: 280, outline: 'none', fontFamily: 'var(--font)' }} />
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{filtered.length} резервации</span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          {reservations.length === 0 ? 'Все още няма резервации. Натисни „＋ Нова резервация" за да започнеш.' : 'Няма намерени резервации.'}
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          {filtered.map((res, i) => {
            const room   = realRooms.find(r => r.id === res.roomId);
            const nights = nightsBetween(res.checkIn, res.checkOut);
            const status = res.paymentStatus ?? 'reserved';
            return (
              <div key={res.id} onClick={() => openModal({ mode: 'edit', reservation: res })}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', alignItems: 'center', padding: '14px 20px', cursor: 'pointer', borderBottom: i < filtered.length - 1 ? '1px solid var(--line-2)' : 'none', transition: 'background .12s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{res.guestName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{res.phone || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13 }}>{room?.name ?? 'Непозната стая'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{res.checkIn} → {res.checkOut} · {nights}н</div>
                </div>
                <div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: STATUS_COLOR[status] }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: STATUS_COLOR[status] }} />
                    {STATUS_LABEL[status] ?? status}
                  </span>
                  {res.price && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{res.price} лв</div>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted-2)' }}>›</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main desktop component ────────────────────────────────────
const ImprovedDesktop = () => {
  const { rooms, seasons, saveRooms, saveSeasons } = useHotel();
  const [tab, setTab] = useState('calendar');

  return (
    <div className="hm-app" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopBar tab={tab} setTab={setTab} totalRooms={rooms.length} />

      {tab === 'calendar'     && <CalendarView />}
      {tab === 'reservations' && <ReservationsView />}
      {tab === 'rooms'        && (
        <div style={{ padding: '20px 24px' }}>
          <RoomsManager rooms={rooms} onSave={saveRooms} />
        </div>
      )}
      {tab === 'prices'       && (
        <div style={{ padding: '20px 24px' }}>
          <ConfigPage seasons={seasons} rooms={rooms} onSave={saveSeasons} />
        </div>
      )}
    </div>
  );
};

export default ImprovedDesktop;

// ─── Atom components ──────────────────────────────────────────

function StatusDot({ s }) {
  const col = { paid: 'var(--ok)', deposit: '#e6b020', reserved: 'var(--muted-2)' }[s] ?? 'var(--muted-2)';
  const lbl = { paid: 'Платено',   deposit: 'Капаро',  reserved: 'Резервирано'   }[s] ?? '';
  return <span title={lbl} style={{ width: 8, height: 8, borderRadius: 999, background: col, flex: '0 0 auto' }} />;
}

function StatCard({ label, value, sub, accent, icon, big }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: big ? 28 : 24, fontWeight: 800, color: accent, letterSpacing: '-0.02em', marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
      {big && (
        <div style={{ position: 'absolute', right: 14, bottom: 14, width: 44, height: 44 }}>
          <svg viewBox="0 0 36 36" width="44" height="44">
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--line)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--ok)" strokeWidth="3"
              strokeDasharray={`${parseInt(value) * 0.942} 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
          </svg>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      {label}
    </span>
  );
}

function RoomGroupHeader({ label, count, labelW }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${labelW}px 1fr`, background: 'var(--surface-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '6px 0' }}>
      <div style={{ padding: '4px 14px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label} · {count}</div>
      <div />
    </div>
  );
}

function RoomRow({ room, days, colW, labelW, rowH, bookings, renderBooking, drag, onCellMouseDown, onCellMouseEnter }) {
  const apt       = room.type === 'apt';
  const isDragging = drag?.roomId === room.id;
  const selMin    = isDragging ? Math.min(drag.startIdx, drag.endIdx) : -1;
  const selMax    = isDragging ? Math.max(drag.startIdx, drag.endIdx) : -1;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${labelW}px repeat(${days.length}, ${colW}px)`, position: 'relative', borderBottom: '1px solid var(--line-2)' }}>
      {/* Room label */}
      <div style={{ padding: '0 14px', height: rowH, display: 'flex', alignItems: 'center', gap: 10, borderRight: '1px solid var(--line)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: apt ? 'var(--apt-50)' : 'var(--room-50)', color: apt ? 'var(--apt-700)' : 'var(--room-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{room.num}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{room.label}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{room.cap} места</div>
        </div>
      </div>

      {/* Day cells — mousedown starts drag, mouseenter extends it */}
      {days.map((day, i) => {
        const selected = i >= selMin && i <= selMax;
        return (
          <div key={i}
            onMouseDown={e => onCellMouseDown(e, room.id, i)}
            onMouseEnter={() => onCellMouseEnter(room.id, i)}
            title={`${room.label} · ${day.d}`}
            style={{
              height: rowH,
              borderLeft: '1px solid var(--line-2)',
              cursor: drag ? 'col-resize' : 'pointer',
              background: selected
                ? apt ? 'rgba(217,122,74,0.18)' : 'rgba(108,102,216,0.18)'
                : day.weekend ? 'var(--surface-2)' : 'transparent',
              boxShadow: selected
                ? apt ? 'inset 0 0 0 1px var(--apt-500)' : 'inset 0 0 0 1px var(--room-500)'
                : 'none',
            }}
          />
        );
      })}

      {/* Booking blocks — pointer-events none on wrappers, auto on each block */}
      <div style={{ position: 'absolute', left: labelW, right: 0, top: 0, bottom: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'relative', height: '100%' }}>
          {bookings.map(b => renderBooking(b))}
        </div>
      </div>
    </div>
  );
}
