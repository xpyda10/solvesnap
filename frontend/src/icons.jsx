// Small line icons drawn with SVG, so they stay sharp at any size and
// take their color from the surrounding text.

function Icon({ children, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const PlusIcon = (p) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const SearchIcon = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
)

export const CalendarIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </Icon>
)

export const FlagIcon = (p) => (
  <Icon {...p}>
    <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </Icon>
)

export const PencilIcon = (p) => (
  <Icon {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />
  </Icon>
)

export const TrashIcon = (p) => (
  <Icon {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icon>
)

export const ArrowUpIcon = (p) => (
  <Icon {...p}>
    <path d="m6 14 6-6 6 6" />
  </Icon>
)

export const ArrowDownIcon = (p) => (
  <Icon {...p}>
    <path d="m6 10 6 6 6-6" />
  </Icon>
)

export const GripIcon = (p) => (
  <Icon {...p}>
    <circle cx="9" cy="6" r="1" />
    <circle cx="15" cy="6" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="9" cy="18" r="1" />
    <circle cx="15" cy="18" r="1" />
  </Icon>
)

export const XIcon = (p) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)
