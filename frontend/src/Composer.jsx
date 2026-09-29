import { useState } from 'react'
import { addDaysISO, describeDue, openPicker } from './dates'
import { CalendarIcon, PlusIcon, XIcon } from './icons'
import PriorityPicker from './PriorityPicker'

// The "add a todo" card at the top of the page.
export default function Composer({ ref, onAdd }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState(null)
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const today = addDaysISO(0)
  const tomorrow = addDaysISO(1)
  const customDate = dueDate && dueDate !== today && dueDate !== tomorrow

  async function handleSubmit(e) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean || saving) return
    setSaving(true)
    const ok = await onAdd({ title: clean, priority, due_date: dueDate || null })
    setSaving(false)
    if (!ok) return // keep what was typed so it can be retried
    setTitle('')
    setPriority(null)
    setDueDate('')
    ref.current?.focus()
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <div className="composer-main">
        <span className="composer-plus" aria-hidden="true">
          <PlusIcon size={18} />
        </span>
        <input
          id="new-todo"
          ref={ref}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a todo…"
          maxLength={200}
          aria-label="New todo"
          autoComplete="off"
          autoFocus
        />
        <button type="submit" className="primary-btn" disabled={!title.trim() || saving}>
          Add
        </button>
      </div>

      <div className="composer-options">
        <PriorityPicker value={priority} onChange={setPriority} />
        <span className="divider" aria-hidden="true" />
        <div className="due-picker">
          <button
            type="button"
            className={`chip ${dueDate === today ? 'is-on' : ''}`}
            onClick={() => setDueDate(dueDate === today ? '' : today)}
          >
            Today
          </button>
          <button
            type="button"
            className={`chip ${dueDate === tomorrow ? 'is-on' : ''}`}
            onClick={() => setDueDate(dueDate === tomorrow ? '' : tomorrow)}
          >
            Tomorrow
          </button>
          <label className={`chip date-chip ${customDate ? 'is-on' : ''}`}>
            <CalendarIcon size={14} />
            <span>{customDate ? describeDue(dueDate).label : 'Pick date'}</span>
            <input
              id="new-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              onClick={openPicker}
              aria-label="Due date"
            />
          </label>
          {dueDate && (
            <button type="button" className="icon-btn" onClick={() => setDueDate('')} aria-label="Remove due date">
              <XIcon size={13} />
            </button>
          )}
        </div>
      </div>
    </form>
  )
}

