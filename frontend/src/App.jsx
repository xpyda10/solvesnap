import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from './api'
import { daysUntil } from './dates'
import Composer from './Composer'
import TodoItem from './TodoItem'
import { SearchIcon, XIcon } from './icons'

const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'active', label: 'Active', test: (t) => !t.completed },
  { id: 'done', label: 'Done', test: (t) => t.completed },
]

const UNDO_SECONDS = 5

export default function App() {
  const [todos, setTodos] = useState([])
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null) // { message } while an undo is possible
  const [today] = useState(() => new Date())

  const composerRef = useRef(null)
  const searchRef = useRef(null)

  // Deletions wait a few seconds before reaching the server, so they can be undone.
  // pending = { items: [{ todo, index }], timer }
  const pending = useRef(null)

  // Load the list once when the page opens.
  useEffect(() => {
    api
      .getTodos()
      .then(setTodos)
      .catch(() => setError('Could not reach the backend. Start it with "uvicorn main:app --reload" and refresh.'))
      .finally(() => setLoading(false))
  }, [])

  // Runs an API call and shows a friendly message if it fails.
  // Returns true when the call worked.
  const run = useCallback(async (action) => {
    try {
      setError('')
      await action()
      return true
    } catch {
      setError('That change could not be saved. Check that the backend is running and try again.')
      return false
    }
  }, [])

  // Sends any waiting deletions to the server right away.
  const commitPending = useCallback(async () => {
    const p = pending.current
    if (!p) return
    pending.current = null
    clearTimeout(p.timer)
    setToast(null)
    await run(() => Promise.all(p.items.map(({ todo }) => api.deleteTodo(todo.id))))
  }, [run])

  // If the page is closed during the undo window, still delete.
  useEffect(() => {
    const flush = () => {
      pending.current?.items.forEach(({ todo }) => api.deleteTodo(todo.id).catch(() => {}))
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  // Keyboard shortcuts: N = new todo, / = search.
  useEffect(() => {
    function onKey(e) {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'n') {
        e.preventDefault()
        composerRef.current?.focus()
      } else if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleAdd(todo) {
    return run(async () => {
      const created = await api.addTodo(todo)
      setTodos((prev) => [...prev, created])
      // Make sure the new todo is visible.
      if (filter === 'done') setFilter('all')
      setQuery('')
    })
  }

  // Updates fields on screen right away, then saves; undoes the change if saving fails.
  function handleChange(todo, changes) {
    const apply = (fields) =>
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, ...fields } : t)))
    const before = Object.fromEntries(Object.keys(changes).map((k) => [k, todo[k]]))

    apply(changes)
    run(async () => {
      try {
        await api.updateTodo(todo.id, changes)
      } catch (err) {
        apply(before)
        throw err
      }
    })
  }

  async function removeWithUndo(toRemove, message) {
    await commitPending() // only one undo at a time
    const ids = new Set(toRemove.map((t) => t.id))
    const items = todos.map((todo, index) => ({ todo, index })).filter(({ todo }) => ids.has(todo.id))
    setTodos((prev) => prev.filter((t) => !ids.has(t.id)))
    pending.current = { items, timer: setTimeout(commitPending, UNDO_SECONDS * 1000) }
    setToast({ message, key: Date.now() })
  }

  function handleUndo() {
    const p = pending.current
    if (!p) return
    pending.current = null
    clearTimeout(p.timer)
    setToast(null)
    setTodos((prev) => {
      const next = [...prev]
      for (const { todo, index } of p.items) next.splice(index, 0, todo) // back where it was
      return next
    })
  }

  // Moves the todo with id `fromId` to where `toId` currently is.
  async function handleMove(fromId, toId) {
    if (fromId == null || toId == null || fromId === toId) return
    await commitPending() // the server must agree on which todos exist
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
        setTodos(previous)
        throw err
      }
    })
  }

  const q = query.trim().toLowerCase()
  const activeFilter = FILTERS.find((f) => f.id === filter)
  const visible = todos.filter((t) => activeFilter.test(t) && t.title.toLowerCase().includes(q))
  const canReorder = filter === 'all' && !q

  const doneCount = todos.filter((t) => t.completed).length
  const overdueCount = todos.filter((t) => !t.completed && t.due_date && daysUntil(t.due_date) < 0).length
  const dueTodayCount = todos.filter((t) => !t.completed && t.due_date && daysUntil(t.due_date) === 0).length

  return (
    <div className="page">
      <main className="app">
        <header className="header">
          <div className="header-text">
            <p className="eyebrow">
              {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1>My Todos</h1>
            <p className="summary">{summaryText(todos.length - doneCount, dueTodayCount, overdueCount)}</p>
          </div>
          <ProgressRing done={doneCount} total={todos.length} />
        </header>

        <Composer ref={composerRef} onAdd={handleAdd} />

        {error && (
          <div className="error" role="alert">
            <span>{error}</span>
            <button className="icon-btn" onClick={() => setError('')} aria-label="Dismiss message">
              <XIcon size={14} />
            </button>
          </div>
        )}

        <div className="toolbar">
          <div className="segmented" role="tablist" aria-label="Show">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={f.id === filter}
                className={f.id === filter ? 'is-active' : ''}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                <span className="segmented-count">{todos.filter(f.test).length}</span>
              </button>
            ))}
          </div>
          <label className="search">
            <SearchIcon size={15} />
            <input
              id="search"
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && (setQuery(''), e.currentTarget.blur())}
              placeholder="Search"
              aria-label="Search todos"
            />
            <kbd>/</kbd>
          </label>
        </div>

        {loading ? (
          <ul className="list" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="item skeleton" />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <EmptyState hasTodos={todos.length > 0} filter={filter} query={query} />
        ) : (
          <ul className="list">
            {visible.map((todo, i) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                canReorder={canReorder}
                prevId={visible[i - 1]?.id}
                nextId={visible[i + 1]?.id}
                onChange={handleChange}
                onDelete={(t) => removeWithUndo([t], `Deleted “${truncate(t.title)}”`)}
                onMove={handleMove}
              />
            ))}
          </ul>
        )}

        <footer className="footer">
          <span className="hint">
            <kbd>N</kbd> new todo · <kbd>/</kbd> search · double-click to edit
            {canReorder && todos.length > 1 ? ' · drag to reorder' : ''}
          </span>
          {doneCount > 0 && (
            <button
              className="text-btn"
              onClick={() =>
                removeWithUndo(
                  todos.filter((t) => t.completed),
                  `Cleared ${doneCount} completed ${doneCount === 1 ? 'todo' : 'todos'}`,
                )
              }
            >
              Clear completed
            </button>
          )}
        </footer>
      </main>

      {toast && (
        <div className="toast" role="status" key={toast.key}>
          <span>{toast.message}</span>
          <button onClick={handleUndo}>Undo</button>
          <span className="toast-timer" style={{ animationDuration: `${UNDO_SECONDS}s` }} />
        </div>
      )}
    </div>
  )
}

function summaryText(open, dueToday, overdue) {
  if (open === 0) return 'Nothing left to do. Enjoy it.'
  const parts = [`${open} open`]
  if (dueToday) parts.push(`${dueToday} due today`)
  if (overdue) parts.push(`${overdue} overdue`)
  return parts.join(' · ')
}

function truncate(text, max = 32) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function ProgressRing({ done, total }) {
  const r = 26
  const circumference = 2 * Math.PI * r
  const ratio = total ? done / total : 0
  return (
    <div className="ring" role="img" aria-label={`${done} of ${total} todos completed`}>
      <svg viewBox="0 0 64 64" width="72" height="72">
        <circle className="ring-track" cx="32" cy="32" r={r} />
        <circle
          className="ring-value"
          cx="32"
          cy="32"
          r={r}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <div className="ring-label">
        <strong>{Math.round(ratio * 100)}%</strong>
        <span>
          {done}/{total}
        </span>
      </div>
    </div>
  )
}

function EmptyState({ hasTodos, filter, query }) {
  let title = 'Your list is empty'
  let text = 'Add your first todo above. Press N to jump there from anywhere.'
  if (hasTodos && query.trim()) {
    title = 'No matches'
    text = `Nothing matches “${query.trim()}”. Try a different word.`
  } else if (hasTodos && filter === 'active') {
    title = 'All done'
    text = 'Every todo is checked off.'
  } else if (hasTodos && filter === 'done') {
    title = 'Nothing completed yet'
    text = 'Todos you check off will show up here.'
  }
  return (
    <div className="empty">
      <div className="empty-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="48" height="48">
          <rect x="8" y="10" width="32" height="30" rx="6" />
          <path d="M16 22l5 5 11-11" />
        </svg>
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )
}
