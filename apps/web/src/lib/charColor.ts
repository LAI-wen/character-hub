const PALETTE = ["#4A6FA5","#C0392B","#27AE60","#8E44AD","#E67E22","#16A085","#2C3E50","#7F8C8D","#D35400","#1A5276"]

export function charColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}
