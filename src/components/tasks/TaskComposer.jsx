import { useRef, useState } from 'react'
import { MAX_TASK_TITLE } from '../../lib/tasks.js'
import { addDaysISO, dueInfo, todayISO } from '../../lib/dates.js'

// Quick "add a task" row: type, optionally pick a due date, press Enter.
// Optional room picker (Home dashboard): pass rooms, roomId and onRoomChange.
export default function TaskComposer({ onAdd, rooms = null, roomId = null, onRoomChange }) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const dateInput = useRef(null)

  const today = todayISO()
  const tomorrow = addDaysISO(today, 1)
  const active = title.trim().length > 0 || dueDate

  async function handleSubmit(e) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return
    setBusy(true)
    setError(null)
    try {
      await onAdd({ title: clean, dueDate })
      setTitle('')
      setDueDate(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const chip = (value, label) => (
    <button
      type="button"
      onClick={() => setDueDate(dueDate === value ? null : value)}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
        dueDate === value ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )

  const customPicked = dueDate && dueDate !== today && dueDate !== tomorrow

  function openPicker() {
    const input = dateInput.current
    if (!input) return
    try {
      input.showPicker() // Chrome, Edge, Firefox, Safari 16+
    } catch {
      input.focus() // older browsers: focusing usually opens it on mobile
      input.click()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-canvas p-2">
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={MAX_TASK_TITLE}
          placeholder="Add a task…"
          aria-label="New task"
          className="min-w-0 flex-1 bg-transparent px-2 py-2 outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? '…' : 'Add'}
        </button>
      </div>

      {rooms && rooms.length > 0 && (
        <div className="flex items-center gap-2 px-2 pt-1 pb-1">
          <span className="text-xs text-muted">In:</span>
          <select
            value={roomId ?? ''}
            onChange={(e) => onRoomChange(e.target.value)}
            aria-label="Room for this task"
            className="max-w-[14rem] truncate rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold outline-none focus:border-brand"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {active && (
        <div className="flex flex-wrap items-center gap-2 px-2 pt-1 pb-1">
          <span className="text-xs text-muted">Due:</span>
          {chip(today, 'Today')}
          {chip(tomorrow, 'Tomorrow')}
          <span className="relative">
            <button
              type="button"
              onClick={openPicker}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                customPicked ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted hover:text-ink'
              }`}
            >
              {customPicked ? dueInfo(dueDate).label : 'Pick date'}
            </button>
            {/* Hidden native picker, opened by the button above. It stays rendered
                (not display:none) because showPicker() needs a laid-out input. */}
            <input
              ref={dateInput}
              type="date"
              tabIndex={-1}
              aria-hidden="true"
              value={dueDate ?? ''}
              onChange={(e) => setDueDate(e.target.value || null)}
              className="pointer-events-none absolute bottom-0 left-0 h-0 w-0 opacity-0"
            />
          </span>
        </div>
      )}

      {error && <p className="px-2 pt-1 text-xs text-danger">{error}</p>}
    </form>
  )
}
