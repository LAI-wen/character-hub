import type { ThemeKey } from '../types'

export interface Theme {
  label: string
  swatch: [string, string, string]
  vars: Record<string, string>
}

// Ported from THEMES in the original DC, recolored to a 黑/白/黃/灰 system.
// The accent stays dark (so white-on-accent stays legible); yellow shows through
// accent-soft (chips, soft buttons, selection fills) for the brand pop.
export const THEMES: Record<ThemeKey, Theme> = {
  cream: {
    label: '亮 Light',
    swatch: ['#ffffff', '#1a1a1a', '#f5c518'],
    vars: {
      '--bg': '#f6f6f4',
      '--bg-2': '#ffffff',
      '--bg-3': '#ececea',
      '--text': '#161616',
      '--text-2': '#6e6e6e',
      '--accent': '#1a1a1a',
      '--accent-soft': '#fbe6a8',
      '--border': '#e4e4e0',
    },
  },
  cocoa: {
    label: '暗 Dark',
    swatch: ['#1a1a18', '#f5c518', '#a3a39c'],
    vars: {
      '--bg': '#191917',
      '--bg-2': '#232321',
      '--bg-3': '#2d2d2a',
      '--text': '#f3f3ef',
      '--text-2': '#a3a39c',
      '--accent': '#6b6b62',
      '--accent-soft': '#4a4327',
      '--border': '#3a3a36',
    },
  },
  mist: {
    label: '黃 Pop',
    swatch: ['#ffffff', '#1a1a1a', '#f5c518'],
    vars: {
      '--bg': '#fbf8ef',
      '--bg-2': '#ffffff',
      '--bg-3': '#f3eede',
      '--text': '#1a1a1a',
      '--text-2': '#6e6a5e',
      '--accent': '#1a1a1a',
      '--accent-soft': '#f7df8e',
      '--border': '#ece4cf',
    },
  },
}

export const THEME_ORDER: ThemeKey[] = ['cream', 'cocoa', 'mist']

// Font keys used by a template's `design.font`, mapped to real CSS stacks.
// Some CJK display fonts (霞鶩文楷 / Chiron GoRound) are not on Google Fonts —
// they fall back gracefully. Swap in @font-face or a webfont CDN if you have them.
export const FONT_FAMILY: Record<string, string> = {
  'noto-serif': "'Noto Serif TC', serif",
  'noto-sans': "'Noto Sans TC', system-ui, sans-serif",
  wenkai: "'LXGW WenKai TC', 'Noto Serif TC', serif",
  goround: "'Chiron GoRound TC', 'Noto Sans TC', sans-serif",
  newsreader: "'Newsreader', serif",
  outfit: "'Outfit', system-ui, sans-serif",
}

export const FONT_OPTS = [
  { key: 'noto-serif', label: '思源宋體' },
  { key: 'noto-sans', label: '思源黑體' },
  { key: 'wenkai', label: '霞鶩文楷' },
  { key: 'goround', label: 'Chiron GoRound' },
  { key: 'newsreader', label: 'Newsreader（英）' },
  { key: 'outfit', label: 'Outfit（英）' },
]

export const WIDTH_PX: Record<string, number> = {
  narrow: 420,
  normal: 560,
  wide: 760,
}

export function fontStack(key?: string): string {
  return (key && FONT_FAMILY[key]) || FONT_FAMILY['noto-serif']
}
