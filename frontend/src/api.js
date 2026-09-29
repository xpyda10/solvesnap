// Small helpers for talking to the FastAPI backend.

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }
  return res.status === 204 ? null : res.json()
}

export const getTodos = () => request('/todos')

// todo is { title, priority, due_date }; only title is required.
export const addTodo = (todo) =>
  request('/todos', { method: 'POST', body: JSON.stringify(todo) })

export const updateTodo = (id, changes) =>
  request(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })

// keepalive lets the request finish even if the page is closing.
export const deleteTodo = (id) =>
  request(`/todos/${id}`, { method: 'DELETE', keepalive: true })

export const reorderTodos = (ids) =>
  request('/todos/order', { method: 'PUT', body: JSON.stringify({ ids }) })
