export interface PalettePreset {
  name: string
  colors: { label: string; hex: string }[]
}

export const PRESETS: PalettePreset[] = [
  {
    name: '暖陽',
    colors: [
      { label: '主色', hex: '#e8a04b' },
      { label: '副色', hex: '#c2683a' },
      { label: '點綴', hex: '#f3d9a8' },
      { label: '深', hex: '#5a3825' },
    ],
  },
  {
    name: '霜夜',
    colors: [
      { label: '主色', hex: '#6c8db0' },
      { label: '副色', hex: '#aebfdc' },
      { label: '點綴', hex: '#e0a93b' },
      { label: '深', hex: '#2b3550' },
    ],
  },
  {
    name: '森林',
    colors: [
      { label: '主色', hex: '#6f8f5c' },
      { label: '副色', hex: '#b6c79a' },
      { label: '點綴', hex: '#caa05a' },
      { label: '深', hex: '#33402a' },
    ],
  },
  {
    name: '莓果',
    colors: [
      { label: '主色', hex: '#b1577e' },
      { label: '副色', hex: '#e6a5b8' },
      { label: '點綴', hex: '#7a9a6b' },
      { label: '深', hex: '#4a2536' },
    ],
  },
]
