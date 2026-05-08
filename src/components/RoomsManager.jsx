import { useState } from 'react'
import './RoomsManager.css'

const ROOM_TYPES = ['Standard', 'Deluxe', 'Suite', 'Family', 'Single', 'Double', 'Twin']

export default function RoomsManager({ rooms, onSave }) {
  const [list, setList]         = useState(rooms)
  const [editingId, setEditing] = useState(null)
  const [saved, setSaved]       = useState(false)

  function addRoom() {
    const id   = `r${Date.now()}`
    const name = `Room ${list.length + 1}`
    setList(prev => [...prev, { id, name, type: 'Standard' }])
    setEditing(id)
    setSaved(false)
  }

  function update(id, field, value) {
    setList(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    setSaved(false)
  }

  function remove(id) {
    if (!window.confirm('Remove this room? Existing reservations will not be deleted.')) return
    setList(prev => prev.filter(r => r.id !== id))
    setSaved(false)
  }

  function moveUp(index) {
    if (index === 0) return
    setList(prev => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
    setSaved(false)
  }

  function moveDown(index) {
    setList(prev => {
      if (index === prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
    setSaved(false)
  }

  function save() {
    onSave(list)
    setSaved(true)
  }

  return (
    <div className="rooms-page">
      <div className="rooms-toolbar">
        <div>
          <h2>Manage Rooms</h2>
          <p className="rooms-hint">{list.length} room{list.length !== 1 ? 's' : ''} · click a room to edit its name or type</p>
        </div>
        <button className="btn btn-primary" onClick={addRoom}>+ Add Room</button>
      </div>

      <div className="rooms-list">
        {list.length === 0 && (
          <div className="rooms-empty">No rooms yet. Add your first room above.</div>
        )}

        {list.map((room, idx) => (
          <div key={room.id} className={`room-row ${editingId === room.id ? 'editing' : ''}`}>
            <div className="room-order">
              <button
                className="order-btn"
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                aria-label="Move up"
              >▲</button>
              <button
                className="order-btn"
                onClick={() => moveDown(idx)}
                disabled={idx === list.length - 1}
                aria-label="Move down"
              >▼</button>
            </div>

            {editingId === room.id ? (
              <div className="room-edit-fields">
                <input
                  type="text"
                  value={room.name}
                  onChange={e => update(room.id, 'name', e.target.value)}
                  placeholder="Room name"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(null) }}
                />
                <select
                  value={room.type}
                  onChange={e => update(room.id, 'type', e.target.value)}
                >
                  {ROOM_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Done</button>
              </div>
            ) : (
              <div className="room-display" onClick={() => setEditing(room.id)}>
                <span className="room-display-name">{room.name}</span>
                <span className="room-display-type">{room.type}</span>
              </div>
            )}

            <button
              className="remove-btn"
              onClick={() => remove(room.id)}
              aria-label={`Remove ${room.name}`}
            >✕</button>
          </div>
        ))}
      </div>

      <div className="rooms-save-bar">
        {saved && <span className="save-ok">✓ Saved</span>}
        <button className="btn btn-primary" onClick={save}>Save Changes</button>
      </div>
    </div>
  )
}
