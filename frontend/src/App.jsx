import { useEffect, useState } from 'react'
import * as api from './api'

const FILTERS = ['All', 'Active', 'Done']

export default function App() {
  const [todos, setTodos] = useState([])
  const [newTitle, setNewTitle] = useState('')
  const [filter, setFilter] = useState('All')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Load the list once when the page opens.
  useEffect(() => {
    api
      .getTodos()
      .then(setTodos)
      .catch(() => setError('Could not reach the backend. Is it running?'))
      .finally(() => setLoading(false))
  }, [])

  // Runs an API call and shows a friendly message if it fails.
  async function run(action) {
    try {
      setError('')
      await action()
    } catch {
      setError('Something went wrong. Please try again.')
    }
  }

  function handleAdd(e) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    run(async () => {
      const todo = await api.addTodo(title)
      setTodos((prev) => [...prev, todo])
      setNewTitle('')
    })
  }

  function handleToggle(todo) {
    const setCompleted = (completed) =>
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, completed } : t)))

    setCompleted(!todo.completed) // tick the box right away, then save
    run(async () => {
      try {
        await api.updateTodo(todo.id, { completed: !todo.completed })
      } catch (err) {
        setCompleted(todo.completed) // undo if saving failed
        throw err
      }
    })
  }

  function handleRename(todo, title) {
    run(async () => {
      const updated = await api.updateTodo(todo.id, { title })
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)))
    })
  }

  function handleDelete(todo) {
    run(async () => {
      await api.deleteTodo(todo.id)
      setTodos((prev) => prev.filter((t) => t.id !== todo.id))
    })
  }

  function handleClearDone() {
    run(async () => {
      const done = todos.filter((t) => t.completed)
      await Promise.all(done.map((t) => api.deleteTodo(t.id)))
      setTodos((prev) => prev.filter((t) => !t.completed))
    })
  }

  // Moves the todo with id `fromId` to where `toId` currently is.
  function handleMove(fromId, toId) {
    if (fromId === toId) return
    const next = [...todos]
    const fromIndex = next.findIndex((t) => t.id === fromId)
    const toIndex = next.findIndex((t) => t.id === toId)
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)

    const previous = todos
    setTodos(next) // update the screen right away, then save
    run(async () => {
      try {
        setTodos(await api.reorderTodos(next.map((t) => t.id)))
      } catch (err) {
        setTodos(previous) // put things back if saving failed
        throw err
      }
    })
  }

  const visible = todos.filter((t) =>
    filter === 'Active' ? !t.completed : filter === 'Done' ? t.completed : true,
  )
  const remaining = todos.filter((t) => !t.completed).length
  const doneCount = todos.length - remaining

  return (
    <main className="app">
      <h1>My Todos</h1>

      <form className="add-form" onSubmit={handleAdd}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="What needs to be done?"
          maxLength={200}
          aria-label="New todo"
          autoFocus
        />
        <button type="submit" disabled={!newTitle.trim()}>
          Add
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="toolbar">
        <div className="filters" role="group" aria-label="Filter todos">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={f === filter ? 'active' : ''}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="count">
          {remaining} {remaining === 1 ? 'item' : 'items'} left
        </span>
      </div>

      {loading ? (
        <p className="empty">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="empty">
          {todos.length === 0 ? 'Nothing here yet — add your first todo above.' : 'No todos in this view.'}
        </p>
      ) : (
        <ul className="list">
          {visible.map((todo, i) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              canDrag={filter === 'All'}
              prevId={visible[i - 1]?.id}
              nextId={visible[i + 1]?.id}
              onToggle={handleToggle}
              onRename={handleRename}
              onDelete={handleDelete}
              onMove={handleMove}
            />
          ))}
        </ul>
      )}

      {doneCount > 0 && (
        <button className="clear" onClick={handleClearDone}>
          Clear {doneCount} done
        </button>
      )}

      <p className="hint">
        Tip: drag items (or use ▲▼) to reorder. Double-click a todo to edit it.
      </p>
    </main>
  )
}

function TodoItem({ todo, canDrag, prevId, nextId, onToggle, onRename, onDelete, onMove }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.title)
  const [dragOver, setDragOver] = useState(false)

  function finishEdit() {
    setEditing(false)
    const title = draft.trim()
    if (title && title !== todo.title) onRename(todo, title)
    else setDraft(todo.title)
  }

  return (
    <li
      className={`item ${todo.completed ? 'done' : ''} ${dragOver ? 'drag-over' : ''}`}
      draggable={canDrag && !editing}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(todo.id))}
      onDragOver={(e) => {
        if (!canDrag) return
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
      {canDrag && <span className="handle" aria-hidden="true">⋮⋮</span>}

      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo)}
        aria-label={`Mark "${todo.title}" as ${todo.completed ? 'not done' : 'done'}`}
      />

      {editing ? (
        <input
          className="edit"
          value={draft}
          maxLength={200}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={finishEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finishEdit()
            if (e.key === 'Escape') {
              setDraft(todo.title)
              setEditing(false)
            }
          }}
        />
      ) : (
        <span className="title" onDoubleClick={() => setEditing(true)}>
          {todo.title}
        </span>
      )}

      {canDrag && (
        <span className="move">
          <button onClick={() => onMove(todo.id, prevId)} disabled={prevId == null} aria-label="Move up">
            ▲
          </button>
          <button onClick={() => onMove(todo.id, nextId)} disabled={nextId == null} aria-label="Move down">
            ▼
          </button>
        </span>
      )}

      <button className="delete" onClick={() => onDelete(todo)} aria-label={`Delete "${todo.title}"`}>
        ✕
      </button>
    </li>
  )
}
