import type { CSSProperties } from 'react'

type IconItem =
  | { t: 'circle'; cx: number; cy: number; r: number; f?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx?: number }
  | { t: 'path'; d: string }

const ICONS: Record<string, IconItem[]> = {
  // Navigation icons (AppLayout)
  home:    [{ t: 'path', d: 'M3 11l9-7 9 7' }, { t: 'path', d: 'M5 10v9h14v-9' }],
  mask:    [{ t: 'path', d: 'M4 5c0 8 4 13 8 13s8-5 8-13c-3 1-5 1-8 1s-5 0-8-1Z' }],
  box:     [{ t: 'path', d: 'M3 7l9-4 9 4-9 4-9-4Z' }, { t: 'path', d: 'M3 7v10l9 4 9-4V7' }, { t: 'path', d: 'M12 11v10' }],
  window:  [{ t: 'rect', x: 3, y: 4, w: 18, h: 16, rx: 2 }, { t: 'path', d: 'M3 9h18' }],
  star:    [{ t: 'path', d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' }],
  ruler:   [{ t: 'rect', x: 3, y: 8, w: 18, h: 8, rx: 1 }, { t: 'path', d: 'M7 8v3M11 8v4M15 8v3M19 8v4' }],
  grid:    [{ t: 'rect', x: 3, y: 3, w: 7, h: 7, rx: 1 }, { t: 'rect', x: 14, y: 3, w: 7, h: 7, rx: 1 }, { t: 'rect', x: 3, y: 14, w: 7, h: 7, rx: 1 }, { t: 'rect', x: 14, y: 14, w: 7, h: 7, rx: 1 }],
  globe:   [{ t: 'circle', cx: 12, cy: 12, r: 9 }, { t: 'path', d: 'M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18' }],
  nodes:   [{ t: 'circle', cx: 6, cy: 6, r: 2 }, { t: 'circle', cx: 18, cy: 7, r: 2 }, { t: 'circle', cx: 12, cy: 18, r: 2 }, { t: 'path', d: 'M8 7l8 .5M7 8l4 8M17 9l-4 7' }],
  book:    [{ t: 'path', d: 'M5 4h10a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2H5Z' }, { t: 'path', d: 'M5 4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2' }, { t: 'path', d: 'M9 8h5M9 11h5' }],
  gear:    [{ t: 'circle', cx: 12, cy: 12, r: 3 }, { t: 'path', d: 'M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.4-2.5H9.5l-.4 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.5h4.9l.4-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z' }],
  search:  [{ t: 'circle', cx: 11, cy: 11, r: 7 }, { t: 'path', d: 'M21 21l-4-4' }],
  clock:   [{ t: 'circle', cx: 12, cy: 12, r: 9 }, { t: 'path', d: 'M12 7v5l3 3' }],
  bulb:    [{ t: 'path', d: 'M9 21h6M12 3a6 6 0 0 1 6 6c0 2.5-1.3 4.7-3 6H9c-1.7-1.3-3-3.5-3-6a6 6 0 0 1 6-6Z' }, { t: 'path', d: 'M9 17h6' }],
  check2:  [{ t: 'path', d: 'M9 12l2 2 4-4' }, { t: 'rect', x: 3, y: 4, w: 18, h: 16, rx: 2 }],
  upload2: [{ t: 'path', d: 'M12 16V8M8 12l4-4 4 4' }, { t: 'rect', x: 3, y: 16, w: 18, h: 4, rx: 1 }],
  people:  [{ t: 'circle', cx: 9, cy: 7, r: 3 }, { t: 'path', d: 'M3 21v-1a6 6 0 0 1 6-6h0' }, { t: 'circle', cx: 16, cy: 9, r: 3 }, { t: 'path', d: 'M12 21v-1a6 6 0 0 1 6-6h3' }],
  // Component icons
  user: [
    { t: 'circle', cx: 12, cy: 8, r: 4 },
    { t: 'path', d: 'M5.5 21a7 7 0 0 1 13 0' },
  ],
  palette: [
    { t: 'circle', cx: 13.5, cy: 6.5, r: 1, f: 1 },
    { t: 'circle', cx: 17, cy: 11, r: 1, f: 1 },
    { t: 'circle', cx: 8, cy: 7, r: 1, f: 1 },
    { t: 'circle', cx: 6.5, cy: 12, r: 1, f: 1 },
    {
      t: 'path',
      d: 'M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-.9-.5-1.3-.3-.3-.5-.7-.5-1.2 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 22 10.4 10 10 0 0 0 12 2z',
    },
  ],
  images: [
    { t: 'rect', x: 8, y: 3, w: 13, h: 13, rx: 2 },
    { t: 'path', d: 'M4 8v11a2 2 0 0 0 2 2h11' },
  ],
  image: [
    { t: 'rect', x: 3, y: 3, w: 18, h: 18, rx: 2 },
    { t: 'circle', cx: 9, cy: 9, r: 2 },
    { t: 'path', d: 'm21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21' },
  ],
  type: [
    { t: 'path', d: 'M4 7V4h16v3' },
    { t: 'line', x1: 12, y1: 4, x2: 12, y2: 20 },
    { t: 'line', x1: 9, y1: 20, x2: 15, y2: 20 },
  ],
  quote: [
    { t: 'path', d: 'M8 7H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2 2 2 0 0 1-2 2' },
    { t: 'path', d: 'M19 7h-3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2 2 2 0 0 1-2 2' },
  ],
  list: [
    { t: 'line', x1: 8, y1: 6, x2: 21, y2: 6 },
    { t: 'line', x1: 8, y1: 12, x2: 21, y2: 12 },
    { t: 'line', x1: 8, y1: 18, x2: 21, y2: 18 },
    { t: 'circle', cx: 4, cy: 6, r: 0.6, f: 1 },
    { t: 'circle', cx: 4, cy: 12, r: 0.6, f: 1 },
    { t: 'circle', cx: 4, cy: 18, r: 0.6, f: 1 },
  ],
  alignLeft: [
    { t: 'line', x1: 4, y1: 6, x2: 20, y2: 6 },
    { t: 'line', x1: 4, y1: 12, x2: 14, y2: 12 },
    { t: 'line', x1: 4, y1: 18, x2: 18, y2: 18 },
  ],
  button: [{ t: 'rect', x: 3, y: 8, w: 18, h: 8, rx: 4 }],
  minus: [{ t: 'line', x1: 4, y1: 12, x2: 20, y2: 12 }],
  spacer: [
    { t: 'path', d: 'M8 6l4-3 4 3' },
    { t: 'path', d: 'M8 18l4 3 4-3' },
    { t: 'line', x1: 12, y1: 4, x2: 12, y2: 20 },
  ],
  droplet: [{ t: 'path', d: 'M12 3l5.66 6.66a8 8 0 1 1-11.31 0z' }],
  upload: [
    { t: 'path', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' },
    { t: 'path', d: 'M7 8l5-5 5 5' },
    { t: 'line', x1: 12, y1: 3, x2: 12, y2: 15 },
  ],
  rotate: [
    { t: 'path', d: 'M3 12a9 9 0 1 0 3-6.7L3 8' },
    { t: 'path', d: 'M3 3v5h5' },
  ],
  plus: [
    { t: 'line', x1: 12, y1: 5, x2: 12, y2: 19 },
    { t: 'line', x1: 5, y1: 12, x2: 19, y2: 12 },
  ],
  copy: [
    { t: 'rect', x: 9, y: 9, w: 11, h: 11, rx: 2 },
    { t: 'path', d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' },
  ],
  trash: [
    { t: 'path', d: 'M3 6h18' },
    { t: 'path', d: 'M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2' },
    { t: 'path', d: 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' },
    { t: 'line', x1: 10, y1: 11, x2: 10, y2: 17 },
    { t: 'line', x1: 14, y1: 11, x2: 14, y2: 17 },
  ],
  pin: [
    { t: 'path', d: 'M12 21s-6-5.7-6-10a6 6 0 0 1 12 0c0 4.3-6 10-6 10z' },
    { t: 'circle', cx: 12, cy: 11, r: 2 },
  ],
  layout: [
    { t: 'rect', x: 3, y: 3, w: 18, h: 18, rx: 2 },
    { t: 'line', x1: 3, y1: 9, x2: 21, y2: 9 },
    { t: 'line', x1: 9, y1: 21, x2: 9, y2: 9 },
  ],
  columns: [
    { t: 'rect', x: 3, y: 3, w: 18, h: 18, rx: 2 },
    { t: 'line', x1: 12, y1: 3, x2: 12, y2: 21 },
  ],
  chevUp: [{ t: 'path', d: 'M6 15l6-6 6 6' }],
  chevDown: [{ t: 'path', d: 'M6 9l6 6 6-6' }],
  save: [
    { t: 'path', d: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z' },
    { t: 'path', d: 'M17 21v-8H7v8' },
    { t: 'path', d: 'M7 3v5h8' },
  ],
  check: [{ t: 'path', d: 'M20 6L9 17l-5-5' }],
  arrowUp: [
    { t: 'line', x1: 12, y1: 19, x2: 12, y2: 5 },
    { t: 'path', d: 'M6 11l6-6 6 6' },
  ],
  arrowDown: [
    { t: 'line', x1: 12, y1: 5, x2: 12, y2: 19 },
    { t: 'path', d: 'M6 13l6 6 6-6' },
  ],
  monitor: [
    { t: 'rect', x: 2, y: 3, w: 20, h: 14, rx: 2 },
    { t: 'line', x1: 8, y1: 21, x2: 16, y2: 21 },
    { t: 'line', x1: 12, y1: 17, x2: 12, y2: 21 },
  ],
  tablet: [
    { t: 'rect', x: 5, y: 2, w: 14, h: 20, rx: 2 },
    { t: 'line', x1: 12, y1: 18, x2: 12, y2: 18 },
  ],
  phone: [
    { t: 'rect', x: 7, y: 2, w: 10, h: 20, rx: 2 },
    { t: 'line', x1: 11, y1: 18, x2: 13, y2: 18 },
  ],
  eye: [
    { t: 'path', d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z' },
    { t: 'circle', cx: 12, cy: 12, r: 3 },
  ],
  marquee: [
    { t: 'path', d: 'M2 12h13' },
    { t: 'path', d: 'M9 7l-4 5 4 5' },
    { t: 'path', d: 'M18 7l4 5-4 5' },
  ],
  sliders: [
    { t: 'line', x1: 4, y1: 8, x2: 20, y2: 8 },
    { t: 'line', x1: 4, y1: 16, x2: 20, y2: 16 },
    { t: 'circle', cx: 9, cy: 8, r: 2, f: 1 },
    { t: 'circle', cx: 15, cy: 16, r: 2, f: 1 },
  ],
}

export type IconName = keyof typeof ICONS

export function Icon({
  name,
  size = 18,
  sw = 2,
  style,
}: {
  name: IconName | string
  size?: number
  sw?: number
  style?: CSSProperties
}) {
  const items = ICONS[name] || []
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      {items.map((it, i) => {
        if (it.t === 'circle')
          return (
            <circle
              key={i}
              cx={it.cx}
              cy={it.cy}
              r={it.r}
              fill={it.f ? 'currentColor' : 'none'}
              stroke={it.f ? 'none' : 'currentColor'}
            />
          )
        if (it.t === 'line') return <line key={i} x1={it.x1} y1={it.y1} x2={it.x2} y2={it.y2} />
        if (it.t === 'rect')
          return <rect key={i} x={it.x} y={it.y} width={it.w} height={it.h} rx={it.rx || 0} />
        return <path key={i} d={it.d} />
      })}
    </svg>
  )
}

export const TYPE_ICON: Record<string, string> = {
  heading: 'type',
  avatar: 'user',
  cover: 'image',
  tagline: 'quote',
  section: 'list',
  palette: 'palette',
  album: 'images',
  text: 'alignLeft',
  marquee: 'marquee',
  button: 'button',
  divider: 'minus',
  spacer: 'spacer',
  columns: 'layout',
  pagebreak: 'spacer',
  nav: 'list',
  popup: 'button',
  badges: 'list',
}
