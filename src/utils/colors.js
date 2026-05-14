// Hue per room category
const ROOM_HUE = 250   // indigo / violet
const APT_HUE  =  16   // terracotta / coral

// Saturation/lightness per payment status (same across both hues)
const SATS = {
  reserved: { bgS: 18, bgL: 93, bdS: 18, bdL: 68, txS: 18, txL: 40 },
  advance:  { bgS: 52, bgL: 86, bdS: 58, bdL: 50, txS: 58, txL: 26 },
  paid:     { bgS: 78, bgL: 78, bdS: 78, bdL: 38, txS: 78, txL: 20 },
}

export function reservationColor(roomType, paymentStatus) {
  const h = roomType === 'Апартамент' ? APT_HUE : ROOM_HUE
  const s = SATS[paymentStatus] ?? SATS.reserved
  return {
    bg:     `hsl(${h},${s.bgS}%,${s.bgL}%)`,
    border: `hsl(${h},${s.bdS}%,${s.bdL}%)`,
    text:   `hsl(${h},${s.txS}%,${s.txL}%)`,
  }
}

// Legend entries for the grid header
export function legendItems() {
  const statuses = [
    { key: 'reserved', label: 'Резервирано' },
    { key: 'advance',  label: 'Капаро' },
    { key: 'paid',     label: 'Платено' },
  ]
  return {
    room: statuses.map(st => ({ ...st, ...reservationColor('Room', st.key) })),
    apt:  statuses.map(st => ({ ...st, ...reservationColor('Апартамент', st.key) })),
  }
}
