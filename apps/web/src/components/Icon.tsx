import type { SVGProps } from 'react'

// Линейные иконки 24×24 в стиле макетов (stroke 1.8).
const PATHS = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9v11h5v-6h4v6h5V9" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  chart: <><path d="M4 20h16" /><path d="M7 16V9M12 16V5M17 16v-4" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5" /></>,
  shield: <path d="M12 3.5 5 6v5.5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6z" />,
  database: <><ellipse cx="12" cy="6" rx="7" ry="2.8" /><path d="M5 6v12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" /></>,
  briefcase: <><rect x="3.5" y="7.5" width="17" height="12" rx="2" /><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 13h17" /></>,
  list: <path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01" />,
  route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" /></>,
  swap: <path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></>,
  key: <><circle cx="8" cy="12" r="3.5" /><path d="M11.5 12H21M18 12v3M15 12v2" /></>,
  gift: <><rect x="4" y="9.5" width="16" height="10.5" rx="1.5" /><path d="M3 9.5h18M12 9.5V20M12 9.5C10.5 6 7 6.5 7.5 8.5c.3 1.2 2.4 1 4.5 1zm0 0c1.5-3.5 5-3 4.5-1-.3 1.2-2.4 1-4.5 1z" /></>,
  pencil: <path d="m4.5 19.5 1-4L16 5a2.1 2.1 0 0 1 3 3L8.5 18.5zM14.5 6.5l3 3" />,
  pauseBars: <path d="M9 5.5v13M15 5.5v13" />,
  play: <path d="M8.5 5.5v13l10-6.5z" />,
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  bell: <><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" /><path d="M10 20a2.2 2.2 0 0 0 4 0" /></>,
  table: <><rect x="3.5" y="4" width="17" height="16" rx="2" /><path d="M3.5 9.5h17M3.5 14.5h17M9 4v16" /></>,
  inbox: <><path d="M4 13.5 6.5 5h11l2.5 8.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
  alert: <><path d="M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0" /><path d="M12 9.5v4M12 17h.01" /></>,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  download: <><path d="M12 4v11M7 10.5l5 5 5-5" /><path d="M5 20h14" /></>,
  logout: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 16.5 14.5 12 10 7.5M14.5 12H4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.8" /><path d="m20.5 16-4.5-4.5L8 19.5" /></>,
  upload: <><path d="M12 15.5V4M7.5 8.5 12 4l4.5 4.5" /><path d="M4.5 15v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15" /></>,
  clipboard: <><rect x="5" y="4.5" width="14" height="16.5" rx="2.5" /><path d="M9 4.5V3.5h6v1M9 4.5h6v2.5H9zM9 12h6M9 16h4" /></>,
  pause: <><circle cx="12" cy="12" r="8.5" /><path d="M10 9v6M14 9v6" /></>,
  refresh: <><path d="M19.5 11A7.5 7.5 0 0 0 6 6.6L4.5 8" /><path d="M4.5 4v4h4" /><path d="M4.5 13A7.5 7.5 0 0 0 18 17.4l1.5-1.4" /><path d="M19.5 20v-4h-4" /></>,
  more: <><circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4M6.4 6.9C3.9 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.6 4.6-1.4" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-.9.8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3" /><circle cx="7.5" cy="11" r="1" /><circle cx="10.5" cy="7.5" r="1" /><circle cx="15" cy="7.5" r="1" /></>,
  send: <path d="M4 12 20 4l-5 16-3.5-6.5z" />,
  book: <><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z" /><path d="M5 20.5A2.5 2.5 0 0 0 7.5 23H19v-5" /><path d="M9 8h6M9 12h4" /></>,
} as const

export type IconName = keyof typeof PATHS

interface Props extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 18, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
