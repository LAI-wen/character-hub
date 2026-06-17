export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("zh-TW", { year: "numeric", month: "short", day: "numeric" })
}

export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("zh-TW", { month: "short", day: "numeric" })
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ""
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${Math.max(1, min)}分鐘前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}小時前`
  const days = Math.floor(hr / 24)
  if (days < 30) return `${days}天前`
  return fmtDate(iso)
}
