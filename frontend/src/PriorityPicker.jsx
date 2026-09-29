import { FlagIcon } from './icons'
import { PRIORITIES } from './priorities'

// Three toggle chips; clicking the selected one again clears the priority.
export default function PriorityPicker({ value, onChange }) {
  return (
    <div className="priority-picker" role="group" aria-label="Priority">
      <FlagIcon size={14} />
      {PRIORITIES.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`chip prio-${p.id} ${value === p.id ? 'is-on' : ''}`}
          aria-pressed={value === p.id}
          onClick={() => onChange(value === p.id ? null : p.id)}
        >
          <span className="dot" aria-hidden="true" />
          {p.label}
        </button>
      ))}
    </div>
  )
}
