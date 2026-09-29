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

export const addTodo = (title) =>
  request('/todos', { method: 'POST', body: JSON.stringify({ title }) })

export const updateTodo = (id, changes) =>
  request(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })

export const deleteTodo = (id) => request(`/todos/${id}`, { method: 'DELETE' })

export const reorderTodos = (ids) =>
  request('/todos/order', { method: 'PUT', body: JSON.stringify({ ids }) })
