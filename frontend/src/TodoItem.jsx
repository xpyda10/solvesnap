import { useState } from 'react'
import { describeDue, openPicker } from './dates'
import { ArrowDownIcon, ArrowUpIcon, CalendarIcon, GripIcon, PencilIcon, TrashIcon } from './icons'
import PriorityPicker from './PriorityPicker'
import { PRIORITIES } from './priorities'

export default function TodoItem({ todo, canReorder, prevId, nextId, onChange, onDelete, onMove }) {
  const [editing, setEditing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [dragging, setDragging] = useState(false)

  const due = todo.due_date ? describeDue(todo.due_date) : null
  const priority = PRIORITIES.find((p) => p.id === todo.priority)

  if (editing) {
    return (
      <li className="item is-editing">
        <EditForm
          todo={todo}
          onCancel={() => setEditing(false)}
          onSave={(changes) => {
            if (Object.keys(changes).length) onChange(todo, changes)
            setEditing(false)
          }}
        />
      </li>
    )
  }

  const classes = ['item', todo.completed && 'is-done', dragOver && 'is-drag-over', dragging && 'is-dragging']

  return (
    <li
      className={classes.filter(Boolean).join(' ')}
      draggable={canReorder}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(todo.id))
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
      onDragOver={(e) => {
        if (!canReorder) return
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        onMove(Number(e.dataTransfer.getData('text/plain')), todo.id)
      }}
    >
      {canReorder && (
        <span className="grip" aria-hidden="true">
          <GripIcon size={14} />
        </span>
      )}

      <input
        id={`todo-${todo.id}`}
        type="checkbox"
        className="check"
        checked={todo.completed}
        onChange={() => onChange(todo, { completed: !todo.completed })}
        aria-label={`Mark “${todo.title}” as ${todo.completed ? 'not done' : 'done'}`}
      />

      <div className="item-body" onDoubleClick={() => setEditing(true)}>
        <span className="item-title">{todo.title}</span>
        {(priority || due) && (
          <span className="meta">
            {priority && (
              <span className={`tag prio-${priority.id}`}>
                <span className="dot" aria-hidden="true" />
                {priority.label}
              </span>
            )}
            {due && (
              <span className={`tag due-${todo.completed ? 'later' : due.tone}`}>
                <CalendarIcon size={12} />
                {due.label}
              </span>
            )}
          </span>
        )}
      </div>

      <div className="actions">
        {canReorder && (
          <>
            <button className="icon-btn" onClick={() => onMove(todo.id, prevId)} disabled={prevId == null} aria-label="Move up">
              <ArrowUpIcon size={15} />
            </button>
            <button className="icon-btn" onClick={() => onMove(todo.id, nextId)} disabled={nextId == null} aria-label="Move down">
              <ArrowDownIcon size={15} />
            </button>
          </>
        )}
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label={`Edit “${todo.title}”`}>
          <PencilIcon size={15} />
        </button>
        <button className="icon-btn danger" onClick={() => onDelete(todo)} aria-label={`Delete “${todo.title}”`}>
          <TrashIcon size={15} />
        </button>
      </div>
    </li>
  )
}

function EditForm({ todo, onSave, onCancel }) {
  const [title, setTitle] = useState(todo.title)
  const [priority, setPriority] = useState(todo.priority)
  const [dueDate, setDueDate] = useState(todo.due_date ?? '')

  function handleSubmit(e) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return
    // Only send what actually changed.
    const changes = {}
    if (clean !== todo.title) changes.title = clean
    if (priority !== todo.priority) changes.priority = priority
    if ((dueDate || null) !== todo.due_date) changes.due_date = dueDate || null
    onSave(changes)
  }

  return (
    <form className="edit-form" onSubmit={handleSubmit} onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <input
        id={`edit-title-${todo.id}`}
        className="edit-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        aria-label="Todo title"
        autoFocus
      />
      <div className="edit-row">
        <PriorityPicker value={priority} onChange={setPriority} />
        <label className="edit-date">
          <CalendarIcon size={14} />
          <input
            id={`edit-due-${todo.id}`}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            onClick={openPicker}
            aria-label="Due date"
          />
        </label>
        <div className="edit-buttons">
          <button type="button" className="text-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary-btn small" disabled={!title.trim()}>
            Save
          </button>
        </div>
      </div>
    </form>
  )
}
