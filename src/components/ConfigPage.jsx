import { useState, useMemo } from 'react'
import './ConfigPage.css'

const FULL_MONTHS = [
  'Януари','Февруари','Март','Април','Май','Юни',
  'Юли','Август','Септември','Октомври','Ноември','Декември'
]

function parseMD(md) {
  const [m, d] = (md ?? '01-01').split('-').map(Number)
  return { m: m || 1, d: d || 1 }
}

function buildMD(m, d) {
  return `${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

const DEFAULT_SEASONS = [
  { id:'s1', name:'Зимен сезон',  from:'01-01', to:'05-31', prices:{} },
  { id:'s2', name:'Летен сезон', from:'06-01', to:'08-31', prices:{} },
  { id:'s3', name:'Преходен',    from:'09-01', to:'12-31', prices:{} },
]

export default function ConfigPage({ seasons: initialSeasons, rooms, onSave }) {
  const [list, setList] = useState(
    initialSeasons?.length ? initialSeasons : DEFAULT_SEASONS
  )
  const [saved, setSaved] = useState(false)

  // Unique room types, Apartment always last
  const roomTypes = useMemo(() => {
    const types = [...new Set(rooms.map(r => r.type).filter(Boolean))]
    return types.sort((a, b) =>
      a === 'Apartment' ? 1 : b === 'Apartment' ? -1 :
      a.localeCompare(b)
    )
  }, [rooms])

  function upd(id, patch) {
    setList(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    setSaved(false)
  }

  function updPrice(id, type, val) {
    setList(prev => prev.map(s => s.id === id
      ? { ...s, prices: { ...s.prices, [type]: Number(val) || 0 } }
      : s
    ))
    setSaved(false)
  }

  function addSeason() {
    const prices = {}
    roomTypes.forEach(t => { prices[t] = 0 })
    setList(prev => [...prev, { id: `s${Date.now()}`, name: 'Нов сезон', from: '01-01', to: '12-31', prices }])
    setSaved(false)
  }

  function remove(id) {
    if (!window.confirm('Премахни този сезон?')) return
    setList(prev => prev.filter(s => s.id !== id))
    setSaved(false)
  }

  function save() { onSave(list); setSaved(true) }

  return (
    <div className="config-page">
      <div className="config-toolbar">
        <div>
          <h2>Цени по сезон</h2>
          <p className="config-hint">
            Нощните цени се попълват автоматично при създаване на резервация.
            30% авансът се изчислява автоматично.
          </p>
        </div>
        <button className="btn btn-primary" onClick={addSeason}>+ Добави сезон</button>
      </div>

      <div className="season-list">
        {list.length === 0 && (
          <div className="season-empty">Все още нямаше сезони. Добави първия си сезон по-горе.</div>
        )}

        {list.map(season => {
          const fr = parseMD(season.from)
          const to = parseMD(season.to)

          return (
            <div key={season.id} className="season-card">
              <div className="season-head">
                <input
                  className="season-name-input"
                  type="text"
                  value={season.name}
                  onChange={e => upd(season.id, { name: e.target.value })}
                  placeholder="Име на сезон"
                />
                <button className="remove-btn" onClick={() => remove(season.id)}>✕</button>
              </div>

              <div className="season-dates">
                <span className="date-lbl">От</span>

                <select
                  value={fr.m}
                  onChange={e => upd(season.id, { from: buildMD(e.target.value, fr.d) })}
                >
                  {FULL_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <input
                  type="number" className="day-inp"
                  value={fr.d} min={1} max={31}
                  onChange={e => upd(season.id, { from: buildMD(fr.m, e.target.value) })}
                />

                <span className="date-lbl">до</span>

                <select
                  value={to.m}
                  onChange={e => upd(season.id, { to: buildMD(e.target.value, to.d) })}
                >
                  {FULL_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <input
                  type="number" className="day-inp"
                  value={to.d} min={1} max={31}
                  onChange={e => upd(season.id, { to: buildMD(to.m, e.target.value) })}
                />
              </div>

              {roomTypes.length > 0 ? (
                <table className="prices-table">
                  <thead>
                    <tr>
                      <th>Тип стая</th>
                      <th>Цена / нощ</th>
                      <th>30% авансово</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomTypes.map(type => {
                      const price = season.prices?.[type] ?? 0
                      const adv   = Math.round(price * 0.30)
                      const isApt = type === 'Apartment'
                      return (
                        <tr key={type}>
                          <td>
                            <span className={`type-chip ${isApt ? 'chip-apt' : 'chip-room'}`}>
                              {type}
                            </span>
                          </td>
                          <td>
                            <div className="price-wrap">
                              <span className="currency">€</span>
                              <input
                                type="number"
                                className="price-inp"
                                value={price || ''}
                                min={0} step={1}
                                placeholder="0"
                                onChange={e => updPrice(season.id, type, e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="adv-cell">
                            {price > 0 ? `€ ${adv}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="no-types-hint">Добави стаи първо, после се върни тук да зададеш цените.</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="config-save-bar">
        {saved && <span className="save-ok">✓ Запазено</span>}
        <button className="btn btn-primary" onClick={save}>Запази цените на сезоните</button>
      </div>
    </div>
  )
}
