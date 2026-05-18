import React, { useMemo, useState } from 'react';
import { useHotel, roomNum, isApt, todayISO, nightsBetween } from './HotelContext.jsx';

// Mobile screens for the Hotel Manager redesign.
// All 4 screens are wrapped in IOSDevice (390x844 area inside frame).

// ─── shared bits ─────────────────────────────────────────────

const HM_FONT = '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

const MobileBottomNav = ({ active = 'today', onNavigate }) => {
  const items = [
    { id: 'today', label: 'Днес', icon: '◉' },
    { id: 'cal',   label: 'Календар', icon: '▦' },
    { id: 'guests',label: 'Гости', icon: '◔' },
    { id: 'more',  label: 'Още', icon: '⋯' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: 'calc(28px + env(safe-area-inset-bottom))', paddingTop: 8,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--line)',
      display: 'flex', justifyContent: 'space-around',
      zIndex: 5
    }}>
      {items.map(it => (
        <button key={it.id} onClick={() => onNavigate?.(it.id)} style={{
          background: 'transparent', border: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          color: it.id === active ? 'var(--ink)' : 'var(--muted-2)',
          padding: 4, minWidth: 44, minHeight: 44, cursor: 'pointer'
        }}>
          <span style={{ fontSize: 22, lineHeight: 1, fontWeight: it.id === active ? 700 : 500 }}>{it.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 600 }}>{it.label}</span>
        </button>
      ))}
    </div>
  );
};

const MobileHeader = ({ title, subtitle, leading, trailing }) => (
  <div style={{
    padding: '8px 20px 12px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'var(--surface)', borderBottom: '1px solid var(--line)'
  }}>
    <div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{subtitle}</div>}
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</div>
    </div>
    <div style={{ display: 'flex', gap: 8 }}>{trailing}</div>
  </div>
);

const StatusDotM = ({ s, size = 8 }) => {
  const m = { paid: 'var(--ok)', deposit: '#e6b020', reserved: 'var(--muted-2)' }[s];
  return <span style={{ width: size, height: size, borderRadius: 999, background: m, flex: '0 0 auto', display: 'inline-block' }} />;
};

const RoomBadge = ({ num, type, size = 40 }) => {
  const isApt = type === 'apt';
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: isApt ? 'var(--apt-50)' : 'var(--room-50)',
      color: isApt ? 'var(--apt-700)' : 'var(--room-700)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size > 36 ? 15 : 12,
      flex: '0 0 auto'
    }}>{num}</div>
  );
};

// ─── Screen 1: Днес (Today) ──────────────────────────────────

const DOW_BG_LONG  = ['Неделя','Понеделник','Вторник','Сряда','Четвъртък','Петък','Събота'];
const DOW_BG_SHORT = ['Нд','Пн','Вт','Ср','Чт','Пт','Сб'];
const MON_BG_SHORT = ['яну','фев','мар','апр','май','юни','юли','авг','сеп','окт','ное','дек'];
const MON_BG_FULL  = ['Януари','Февруари','Март','Април','Май','Юни','Юли','Август','Септември','Октомври','Ноември','Декември'];

const MobileToday = ({ onNavigate }) => {
  const { rooms: realRooms, reservations, openModal } = useHotel();

  const todayStr  = useMemo(() => todayISO(), []);
  const todayDate = useMemo(() => new Date(), []);

  // ── Today's data ─────────────────────────────────────
  const arriving = useMemo(() => reservations
    .filter(r => r.checkIn === todayStr)
    .map(r => {
      const room = realRooms.find(rm => rm.id === r.roomId);
      return {
        id: r.id, res: r,
        name:   r.guestName,
        room:   roomNum(room),
        type:   isApt(room) ? 'apt' : 'room',
        nights: nightsBetween(r.checkIn, r.checkOut),
        guests: 1,
        time:   '14:00',
        status: r.paymentStatus === 'advance' ? 'deposit' : (r.paymentStatus ?? 'reserved'),
        phone:  r.phone ?? '',
      };
    }), [reservations, realRooms, todayStr]);

  const leaving = useMemo(() => reservations
    .filter(r => r.checkOut === todayStr)
    .map(r => {
      const room = realRooms.find(rm => rm.id === r.roomId);
      return {
        id: r.id, res: r,
        name:   r.guestName,
        room:   roomNum(room),
        type:   isApt(room) ? 'apt' : 'room',
        nights: nightsBetween(r.checkIn, r.checkOut),
        guests: 1,
      };
    }), [reservations, realRooms, todayStr]);

  const occupied     = useMemo(() => reservations.filter(r => r.checkIn <= todayStr && r.checkOut > todayStr).length, [reservations, todayStr]);
  const totalRooms   = realRooms.length;
  const occupancyPct = totalRooms > 0 ? Math.round(occupied / totalRooms * 100) : 0;
  const free         = totalRooms - occupied;

  const weekOcc = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d  = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const occ = reservations.filter(r => r.checkIn <= ds && r.checkOut > ds).length;
    return { pct: totalRooms > 0 ? Math.round(occ / totalRooms * 100) : 0, day: DOW_BG_SHORT[d.getDay()] };
  }), [reservations, totalRooms, todayDate]);

  const dateSubtitle = `${DOW_BG_LONG[todayDate.getDay()]}, ${todayDate.getDate()} ${MON_BG_SHORT[todayDate.getMonth()]}`;

  return (
    <div style={{ height: '100%', background: 'var(--bg)', fontFamily: HM_FONT, color: 'var(--ink)', paddingTop: 52, paddingBottom: 80, overflow: 'auto' }}>
      <MobileHeader
        title="Добро утро"
        subtitle={dateSubtitle}
        trailing={<>
          <button style={{ width: 36, height: 36, borderRadius: 999, border: '1px solid var(--line)', background: 'white', fontSize: 16 }}>🔍</button>
          <button style={{ width: 36, height: 36, borderRadius: 999, border: '1px solid var(--line)', background: 'white', fontSize: 16, position: 'relative' }}>
            🔔
            {arriving.length > 0 && <span style={{ position: 'absolute', top: 6, right: 8, width: 7, height: 7, borderRadius: 999, background: '#d63b30', border: '2px solid white' }} />}
          </button>
        </>}
      />

      {/* Hero occupancy card */}
      <div style={{ margin: '14px 16px', background: 'linear-gradient(135deg, #1a1814 0%, #2a2520 100%)', color: 'white', borderRadius: 18, padding: 18, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Заетост довечера</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{occupancyPct}%</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>· {occupied}/{totalRooms} стаи</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>
              {free} свободни · {leaving.length} заминават до 11:00
            </div>
          </div>
          <div style={{ position: 'relative', width: 64, height: 64 }}>
            <svg viewBox="0 0 36 36" width="64" height="64">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#74d39e" strokeWidth="2.5"
                strokeDasharray={`${occupancyPct * 0.97} 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
            </svg>
          </div>
        </div>
        {/* 7-day occupancy barometer */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 32 }}>
          {weekOcc.map((w, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{ width: 18, height: Math.max(2, w.pct * 0.25), borderRadius: 3, background: i === 0 ? '#74d39e' : 'rgba(255,255,255,0.4)' }} />
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{w.day}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two action cards */}
      <div style={{ margin: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <ActionCard count={arriving.length} label="Пристигат" sub="до 17:00" tone="info" />
        <ActionCard count={leaving.length}  label="Заминават" sub="до 11:00" tone="warn" />
      </div>

      {/* Arrivals */}
      <SectionLabel title="Пристигат днес" />
      {arriving.length === 0
        ? <div style={{ margin: '0 16px', padding: 16, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>Никой не пристига днес</div>
        : (
          <div style={{ margin: '0 16px', background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', overflow: 'hidden' }}>
            {arriving.map((b, i) => (
              <ArrivalRow key={b.id} b={b} last={i === arriving.length - 1}
                onPress={() => openModal({ mode: 'edit', reservation: b.res })} />
            ))}
          </div>
        )}

      {/* Departures */}
      <SectionLabel title="Заминават днес" />
      {leaving.length === 0
        ? <div style={{ margin: '0 16px 16px', padding: 16, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>Никой не заминава днес</div>
        : (
          <div style={{ margin: '0 16px 16px', background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', overflow: 'hidden' }}>
            {leaving.map((b, i) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i === leaving.length - 1 ? 'none' : '1px solid var(--line-2)' }}>
                <RoomBadge num={b.room} type={b.type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{b.nights} нощувки</div>
                </div>
                <button onClick={() => openModal({ mode: 'edit', reservation: b.res })}
                  style={{ background: 'var(--ok-bg)', color: 'var(--ok)', border: 'none', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Чек-аут</button>
              </div>
            ))}
          </div>
        )}

      {/* FAB — opens real ReservationModal */}
      <div style={{ position: 'absolute', right: 18, bottom: 96, zIndex: 4 }}>
        <button onClick={() => openModal({ mode: 'add' })} style={{
          width: 58, height: 58, borderRadius: 999,
          background: 'var(--ink)', color: 'white', border: 'none',
          fontSize: 26, fontWeight: 300, cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)'
        }}>＋</button>
      </div>

      <MobileBottomNav active="today" onNavigate={onNavigate} />
    </div>
  );
};

const ActionCard = ({ count, label, sub, tone }) => {
  const colors = {
    info: { bg: 'var(--info-bg)', ink: 'var(--info)' },
    warn: { bg: 'var(--warn-bg)', ink: 'var(--warn)' },
  }[tone];
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: colors.bg, color: colors.ink,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700
        }}>{label === 'Пристигат' ? '↘' : '↗'}</span>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>{count}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>
    </div>
  );
};

const SectionLabel = ({ title, right }) => (
  <div style={{ margin: '18px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.01em' }}>{title}</div>
    {right}
  </div>
);

const ArrivalRow = ({ b, last, onPress }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: last ? 'none' : '1px solid var(--line-2)' }}>
    <RoomBadge num={b.room} type={b.type} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <StatusDotM s={b.status} />
        <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{b.nights} нощувки · {b.time}</div>
    </div>
    <button onClick={onPress} style={{ background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Чек-ин</button>
  </div>
);

// ─── Screen 2: Календар (mobile heatmap) ──────────────────────

const CELL_W  = 22;
const ROW_H   = 36;
const LABEL_W = 50;

const MobileCalendar = ({ onNavigate }) => {
  const { rooms: realRooms, reservations, openModal } = useHotel();

  // ── Month navigation state ────────────────────────────────────
  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const todayStr = useMemo(() => todayISO(), []);

  // Full month of days
  const days = useMemo(() => {
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
    const count = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const d      = new Date(y, m, i + 1);
      const dow    = d.getDay();
      const dateStr = d.toISOString().slice(0, 10);
      return { d: i + 1, dateStr, w: DOW_BG_SHORT[dow], weekend: dow === 0 || dow === 6, isToday: dateStr === todayStr };
    });
  }, [viewMonth, todayStr]);

  const rooms = useMemo(() => realRooms.map(r => ({
    id: r.id, num: roomNum(r), type: isApt(r) ? 'apt' : 'room',
  })), [realRooms]);

  function navigate(delta) {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }
  function goToday() {
    const t = new Date();
    setViewMonth(new Date(t.getFullYear(), t.getMonth(), 1));
  }

  // Stats always show today regardless of which month is displayed
  const occupied      = useMemo(() => reservations.filter(r => r.checkIn <= todayStr && r.checkOut > todayStr).length, [reservations, todayStr]);
  const arrivingCount = useMemo(() => reservations.filter(r => r.checkIn === todayStr).length, [reservations, todayStr]);
  const leavingCount  = useMemo(() => reservations.filter(r => r.checkOut === todayStr).length, [reservations, todayStr]);
  const occupancyPct  = rooms.length > 0 ? Math.round(occupied / rooms.length * 100) : 0;

  const getStatus = (roomId, dateStr) => {
    const res = reservations.find(r => r.roomId === roomId && r.checkIn <= dateStr && r.checkOut > dateStr);
    if (!res) return null;
    return res.paymentStatus === 'advance' ? 'deposit' : (res.paymentStatus ?? 'reserved');
  };

  const cellColor = (status, apt) => {
    if (!status)             return 'transparent';
    if (status === 'paid')    return apt ? 'var(--apt-500)'  : 'var(--room-500)';
    if (status === 'deposit') return apt ? 'var(--apt-200)'  : 'var(--room-200)';
    return                          apt ? 'var(--apt-50)'   : 'var(--room-50)';
  };

  const isCurrentMonth = viewMonth.getFullYear() === new Date().getFullYear() && viewMonth.getMonth() === new Date().getMonth();

  return (
    <div style={{ height: '100%', background: 'var(--bg)', fontFamily: HM_FONT, color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>

      {/* Status bar spacer */}
      <div style={{ height: 52, flexShrink: 0 }} />

      {/* ── Month nav header ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--line)', gap: 8, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)}
          style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid var(--line)', background: 'white', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', flexShrink: 0 }}>‹</button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>
            {MON_BG_FULL[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{days.length} дни</div>
        </div>

        <button onClick={() => navigate(1)}
          style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid var(--line)', background: 'white', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', flexShrink: 0 }}>›</button>

        {!isCurrentMonth && (
          <button onClick={goToday}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--ink)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Днес</button>
        )}
      </div>

      {/* ── Today stats strip ────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px 6px', flexShrink: 0 }}>
        <MiniStat value={`${occupied}/${rooms.length}`} label="Заети" />
        <MiniStat value={arrivingCount}                 label="Пристигат" />
        <MiniStat value={leavingCount}                  label="Заминават" />
        <MiniStat value={`${occupancyPct}%`}            label="Заетост" accent />
      </div>

      {/* ── Heatmap: sticky room labels + scrollable days ─ */}
      <div style={{ flex: 1, minHeight: 0, margin: '4px 12px 8px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'auto' }}>
          <div style={{ minWidth: LABEL_W + days.length * CELL_W, display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Sticky date-header row */}
            <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 3, background: 'var(--surface)', borderBottom: '1px solid var(--line-2)', flexShrink: 0 }}>
              {/* Corner cell — sticky in both axes */}
              <div style={{ width: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 4, background: 'var(--surface)' }} />
              {days.map((day, i) => (
                <div key={i} style={{
                  width: CELL_W, flexShrink: 0, textAlign: 'center', padding: '5px 0',
                  background: day.isToday ? 'var(--ink)' : (day.weekend ? 'var(--surface-2)' : 'transparent'),
                  color:      day.isToday ? 'white'      : (day.weekend ? 'var(--muted)'    : 'var(--ink)'),
                }}>
                  <div style={{ fontSize: 7, fontWeight: 600, letterSpacing: '0.04em' }}>{day.w}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 1 }}>{day.d}</div>
                </div>
              ))}
            </div>

            {/* Room rows */}
            {rooms.map(r => {
              const apt = r.type === 'apt';
              return (
                <div key={r.id} style={{ display: 'flex', borderTop: '1px solid var(--line-2)', height: ROW_H, alignItems: 'center', flexShrink: 0 }}>
                  {/* Sticky room label */}
                  <div style={{ width: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface)', height: '100%', display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 8, borderRight: '1px solid var(--line-2)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: apt ? 'var(--apt-500)' : 'var(--room-500)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{r.num}</span>
                  </div>
                  {/* Day cells */}
                  {days.map((day, i) => {
                    const s  = getStatus(r.id, day.dateStr);
                    const bg = cellColor(s, apt);
                    return (
                      <div key={i}
                        onClick={() => openModal({ mode: 'add', initialRoomId: r.id, initialCheckIn: day.dateStr })}
                        style={{
                          width: CELL_W, flexShrink: 0, height: ROW_H - 6, margin: '3px 1px',
                          borderRadius: 4, cursor: 'pointer', background: bg,
                          border: s
                            ? `1px solid ${apt ? 'var(--apt-500)' : 'var(--room-500)'}`
                            : day.weekend ? '1px dashed rgba(0,0,0,0.08)' : 'none',
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, fontSize: 11, color: 'var(--muted)', fontWeight: 600, paddingBottom: 8, flexShrink: 0 }}>
        <LegendSwatch fill="var(--room-500)" label="Платено" />
        <LegendSwatch fill="var(--room-200)" label="Капаро" />
        <LegendSwatch fill="var(--room-50)"  border="var(--room-500)" label="Резерв." />
      </div>

      <MobileBottomNav active="cal" onNavigate={onNavigate} />
    </div>
  );
};

const MiniStat = ({ value, label, accent }) => (
  <div style={{
    flex: 1, background: accent ? 'var(--ink)' : 'var(--surface)',
    color: accent ? 'white' : 'var(--ink)',
    border: accent ? 'none' : '1px solid var(--line)',
    borderRadius: 10, padding: '8px 4px', textAlign: 'center'
  }}>
    <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>{value}</div>
    <div style={{ fontSize: 9, fontWeight: 600, opacity: accent ? 0.8 : 0.6, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 1 }}>{label}</div>
  </div>
);

const LegendSwatch = ({ fill, border, label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    <span style={{ width: 10, height: 10, borderRadius: 3, background: fill, border: border ? `1px solid ${border}` : 'none' }} />
    {label}
  </span>
);

// ─── Screen 3: Резервация detail ─────────────────────────────

const MobileReservationDetail = ({ onNavigate }) => {
  return (
    <div style={{ height: '100%', background: 'var(--bg)', fontFamily: HM_FONT, color: 'var(--ink)', paddingTop: 52, paddingBottom: 92, overflow: 'auto' }}>
      {/* Header */}
      <div style={{
        padding: '8px 16px 14px',
        background: 'var(--surface)', borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <button onClick={() => onNavigate?.('today')} style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--surface-3)', border: 'none', fontSize: 18, color: 'var(--ink)', cursor: 'pointer' }}>‹</button>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Резервация · #2014</div>
        <button style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--surface-3)', border: 'none', fontSize: 16 }}>⋯</button>
      </div>

      {/* Hero */}
      <div style={{ margin: '14px 16px', padding: 18, background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <RoomBadge num={14} type="room" size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Стая 14 · Тройна</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', marginTop: 1 }}>Иван Иванов</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <span className="hm-chip" style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}>
                <StatusDotM s="deposit" size={6} /> Авансово платено
              </span>
              <span className="hm-chip" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>📞 По телефон</span>
            </div>
          </div>
        </div>

        {/* Dates row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, marginTop: 18, alignItems: 'center' }}>
          <DateBlock label="Чек-ин" date="16 май" weekday="Събота" time="след 14:00" />
          <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 11, fontWeight: 600 }}>5 нощувки</div>
            <div style={{ marginTop: 2 }}>→</div>
          </div>
          <DateBlock label="Чек-аут" date="21 май" weekday="Четвъртък" time="до 11:00" align="right" />
        </div>
      </div>

      {/* Guest details */}
      <SectionLabel title="Гост" />
      <div style={{ margin: '0 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
        <DetailRow icon="◔" label="Имена" value="Иван Иванов" />
        <DetailRow icon="☏" label="Телефон" value="+359 88 234 5678" actionLabel="Обади се" />
        <DetailRow icon="✉" label="E-mail" value="ivanov@example.com" />
        <DetailRow icon="👥" label="Гости" value="2 възрастни" last />
      </div>

      {/* Payment */}
      <SectionLabel title="Плащане" />
      <div style={{ margin: '0 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px' }}>
        <PriceRow label="5 нощувки × 95 лв" value="475 лв" />
        <PriceRow label="Туристическа такса" value="10 лв" />
        <div style={{ height: 1, background: 'var(--line)', margin: '10px 0' }} />
        <PriceRow label="Общо" value="485 лв" bold />
        <PriceRow label="Платено капаро" value="150 лв" muted />
        <PriceRow label="Дължи се" value="335 лв" warn />
        <button style={{
          marginTop: 12, width: '100%',
          background: 'var(--ok)', color: 'white', border: 'none',
          borderRadius: 10, padding: '12px 16px', fontSize: 14, fontWeight: 700
        }}>Отбележи като платено</button>
      </div>

      {/* Notes */}
      <SectionLabel title="Бележка" />
      <div style={{ margin: '0 16px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          Гостът пристига късно вечерта. Иска допълнителни хавлии. Платил капарото по банка на 8 май.
        </div>
      </div>

      {/* Action bar */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        paddingBottom: 28, paddingTop: 10, paddingLeft: 16, paddingRight: 16,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--line)',
        display: 'flex', gap: 8
      }}>
        <button style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'var(--surface-3)', border: 'none', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Редактирай</button>
        <button style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'var(--ink)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700 }}>Чек-ин гост</button>
      </div>
    </div>
  );
};

const DateBlock = ({ label, date, weekday, time, align = 'left' }) => (
  <div style={{ textAlign: align }}>
    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em', marginTop: 2 }}>{date}</div>
    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{weekday}</div>
    <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 2 }}>{time}</div>
  </div>
);

const DetailRow = ({ icon, label, value, actionLabel, last }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px',
    borderBottom: last ? 'none' : '1px solid var(--line-2)'
  }}>
    <span style={{
      width: 28, height: 28, borderRadius: 8,
      background: 'var(--surface-3)', color: 'var(--ink-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14
    }}>{icon}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 1 }}>{value}</div>
    </div>
    {actionLabel && (
      <button style={{ fontSize: 12, fontWeight: 700, color: 'var(--info)', background: 'transparent', border: 'none' }}>{actionLabel}</button>
    )}
  </div>
);

const PriceRow = ({ label, value, bold, muted, warn }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', fontSize: bold ? 16 : 13 }}>
    <span style={{ color: warn ? 'var(--warn)' : (muted ? 'var(--muted)' : 'var(--ink-2)'), fontWeight: bold ? 700 : 500 }}>{label}</span>
    <span style={{ color: warn ? 'var(--warn)' : (muted ? 'var(--muted)' : 'var(--ink)'), fontWeight: bold ? 800 : 600 }}>{value}</span>
  </div>
);

// ─── Screen 4: Нова резервация (new booking) ─────────────────

const MobileNewBooking = ({ onNavigate }) => {
  return (
    <div style={{ height: '100%', background: 'var(--bg)', fontFamily: HM_FONT, color: 'var(--ink)', paddingTop: 52, paddingBottom: 92, overflow: 'auto' }}>
      {/* Header */}
      <div style={{
        padding: '8px 16px 14px',
        background: 'var(--surface)', borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <button onClick={() => onNavigate?.('today')} style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Откажи</button>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Нова резервация</div>
        <div style={{ width: 50 }} />
      </div>

      {/* Progress */}
      <div style={{ margin: '14px 16px 6px', display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--ink)' }} />
        <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--ink)' }} />
        <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--surface-3)' }} />
      </div>
      <div style={{ margin: '0 16px', fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Стъпка 2 от 3 · Дати & стая</div>

      {/* Dates */}
      <SectionLabel title="Период на престоя" />
      <div style={{ margin: '0 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-3)' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Чек-ин</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>22 май</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Петък</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, padding: '0 4px' }}>3 нощ.</div>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-3)' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Чек-аут</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>25 май</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Понеделник</div>
          </div>
        </div>

        {/* Mini calendar preview */}
        <div style={{ marginTop: 14, padding: '10px 4px', background: 'var(--bg)', borderRadius: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {['П','В','С','Ч','П','С','Н'].map((w, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'var(--muted)', fontWeight: 700 }}>{w}</div>
            ))}
            {Array.from({ length: 28 }, (_, i) => {
              const d = 18 + i;
              const inRange = d >= 22 && d <= 24;
              const isStart = d === 22;
              const isEnd = d === 25;
              return (
                <div key={i} style={{
                  textAlign: 'center', padding: '6px 0', fontSize: 11, fontWeight: 600,
                  background: inRange ? 'var(--ink)' : (isEnd ? 'var(--ink)' : 'transparent'),
                  color: (inRange || isEnd) ? 'white' : (d < 22 ? 'var(--muted-2)' : 'var(--ink)'),
                  borderTopLeftRadius: isStart ? 999 : 4,
                  borderBottomLeftRadius: isStart ? 999 : 4,
                  borderTopRightRadius: isEnd ? 999 : 4,
                  borderBottomRightRadius: isEnd ? 999 : 4,
                }}>{d <= 31 ? d : d - 31}</div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Available rooms */}
      <SectionLabel title="Свободни стаи" right={<span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>5 налични</span>} />
      <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <RoomOption num={11} type="room" label="Двойна" cap={2} price={95} selected />
        <RoomOption num={13} type="room" label="Двойна" cap={2} price={95} />
        <RoomOption num={32} type="room" label="Семейна" cap={4} price={140} />
        <RoomOption num={26} type="apt" label="Апартамент" cap={4} price={210} />
      </div>

      {/* Sticky CTA */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        paddingBottom: 28, paddingTop: 10, paddingLeft: 16, paddingRight: 16,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--line)',
        display: 'flex', gap: 10, alignItems: 'center'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Общо</div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>285 лв</div>
        </div>
        <button style={{
          flex: 1.6, padding: '14px 0', borderRadius: 12, background: 'var(--ink)', color: 'white',
          border: 'none', fontSize: 14, fontWeight: 700
        }}>Към гост ›</button>
      </div>
    </div>
  );
};

const RoomOption = ({ num, type, label, cap, price, selected }) => {
  const isApt = type === 'apt';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: 12,
      background: 'var(--surface)',
      border: selected ? '2px solid var(--ink)' : '1px solid var(--line)',
      borderRadius: 14,
      position: 'relative'
    }}>
      <RoomBadge num={num} type={type} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Стая {num} · {label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{cap} места · {isApt ? 'с кухня' : 'с тераса'}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>{price} лв</div>
        <div style={{ fontSize: 10, color: 'var(--muted)' }}>на нощ</div>
      </div>
      {selected && (
        <div style={{
          position: 'absolute', top: -8, right: 12,
          background: 'var(--ink)', color: 'white',
          borderRadius: 999, padding: '2px 8px',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.04em'
        }}>ИЗБРАНО</div>
      )}
    </div>
  );
};

export { MobileToday, MobileCalendar, MobileReservationDetail, MobileNewBooking };
