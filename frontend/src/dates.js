// Helpers for showing due dates in a friendly way ("Today", "Overdue", ...).
// Dates travel to and from the backend as "YYYY-MM-DD" strings.

const DAY = 24 * 60 * 60 * 1000

function parse(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d) // local midnight, so "today" means your today
}

export function toISODate(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function addDaysISO(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

// Whole days from today until the date (negative means it has passed).
export function daysUntil(isoDate) {
  const today = parse(todayISO())
  return Math.round((parse(isoDate) - today) / DAY)
}

// Returns { label, tone } where tone is 'overdue', 'soon' or 'later'.
export function describeDue(isoDate) {
  const days = daysUntil(isoDate)
  const date = parse(isoDate)
  if (days < 0) {
    return { label: days === -1 ? 'Yesterday' : `${-days} days overdue`, tone: 'overdue' }
  }
  if (days === 0) return { label: 'Today', tone: 'soon' }
  if (days === 1) return { label: 'Tomorrow', tone: 'soon' }
  if (days < 7) return { label: date.toLocaleDateString(undefined, { weekday: 'long' }), tone: 'later' }
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return {
    label: date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    }),
    tone: 'later',
  }
}

// Opens the browser's calendar popup when the date field is clicked anywhere.
export function openPicker(e) {
  try {
    e.currentTarget.showPicker()
  } catch {
    // older browsers: the normal date field behavior still works
  }
}
