import { useState, useEffect, useCallback } from "react"

export type RecentItem = {
  type: "char" | "entry" | "project"
  id: string
  name: string
  path: string
  color: string
  imgUrl?: string
  ts: number
}

const KEY = "rv_items"
const MAX = 12

function read(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]")
  } catch {
    return []
  }
}

export function recordView(item: Omit<RecentItem, "ts">) {
  const next: RecentItem = { ...item, ts: Date.now() }
  const existing = read().filter(i => i.path !== next.path)
  const capped = [next, ...existing].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(capped))
  window.dispatchEvent(new Event("rv_update"))
}

export function useRecentItems(): RecentItem[] {
  const [items, setItems] = useState<RecentItem[]>(read)

  const sync = useCallback(() => setItems(read()), [])

  useEffect(() => {
    window.addEventListener("rv_update", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("rv_update", sync)
      window.removeEventListener("storage", sync)
    }
  }, [sync])

  return items
}
