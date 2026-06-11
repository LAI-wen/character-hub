import { useState, useMemo, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { charColor } from "@/lib/charColor"
import type { CharacterListResponse, ProjectListResponse } from "@oc-tools/contracts"

const ICONS: Record<string, string> = {
  home:   '<path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/>',
  mask:   '<path d="M4 5c0 8 4 13 8 13s8-5 8-13c-3 1-5 1-8 1s-5 0-8-1Z"/>',
  box:    '<path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
  window: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
  star:   '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  ruler:  '<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
  gear:   '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.4-2.5H9.5l-.4 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.5h4.9l.4-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  globe:  '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>',
}

const ENTRY_COLORS: Record<string, string> = {
  nation: "#3B5E6B", place: "#5E7E55", org: "#B5654A", event: "#9E332B",
  race: "#8A6FA0", item: "#C9A24B", faction: "#4A7B8C", concept: "#7B5EA7",
  lore: "#6B4A1E", location: "#5E7E55", other: "#8A857C",
}

function SvgIcon({ k }: { k: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONS[k] ?? "" }} />
  )
}

type CmdItem = {
  group: string
  label: string
  sub?: string
  av?: string
  imgUrl?: string
  color?: string
  icon?: string
  to: string
}

type SearchResult = {
  type: "character" | "project" | "entry"
  id: string
  name: string
  sub: string
  path: string
  color: string | null
  imgUrl: string | null
}

const NAV_ITEMS: CmdItem[] = [
  { group: "前往", label: "工作台",    icon: "home",   to: "/workspace" },
  { group: "前往", label: "我的角色",  icon: "mask",   to: "/characters" },
  { group: "前往", label: "我的企劃",  icon: "box",    to: "/projects" },
  { group: "前往", label: "我的公開頁", icon: "window", to: "/public-pages" },
  { group: "前往", label: "委託",      icon: "star",   to: "/commissions" },
  { group: "前往", label: "身高比較",  icon: "ruler",  to: "/height-compare" },
  { group: "前往", label: "帳號設定",  icon: "gear",   to: "/settings" },
]

const GROUP_LABEL: Record<string, string> = {
  character: "角色", project: "企劃", entry: "世界觀",
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState("")
  const [debouncedQ, setDebouncedQ] = useState("")
  const [selIdx, setSelIdx] = useState(0)

  // Debounce search query 250ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])

  // Prefetch cached lists (so they're available instantly)
  const { data: charData } = useQuery({
    queryKey: ["characters"],
    queryFn: () => apiClient<CharacterListResponse>("/api/app/characters"),
    staleTime: 60_000,
  })
  const { data: projData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiClient<ProjectListResponse>("/api/app/projects"),
    staleTime: 60_000,
  })

  // Server-side search (fires only when query is non-empty)
  const { data: searchData, isFetching: searching } = useQuery({
    queryKey: ["search", debouncedQ],
    queryFn: () => apiClient<{ results: SearchResult[] }>(`/api/app/search?q=${encodeURIComponent(debouncedQ)}`),
    enabled: debouncedQ.length >= 1,
    staleTime: 10_000,
  })

  // Client-side items for instant filtering while server responds
  const clientItems = useMemo<CmdItem[]>(() => {
    const chars: CmdItem[] = (charData?.characters ?? []).map(c => ({
      group: "角色", label: c.name,
      sub: c.species ?? (c.memberships?.map(m => m.projectName).join("、") ?? ""),
      av: c.name.slice(0, 1), imgUrl: c.avatarUrl ?? undefined,
      color: charColor(c.id), to: `/characters/${c.id}`,
    }))
    const projs: CmdItem[] = (projData?.projects ?? []).map(p => ({
      group: "企劃", label: p.name, sub: p.description ?? p.slug,
      av: p.name.slice(0, 1), color: p.themeColor ?? "#8A857C",
      to: `/p/${p.id}/overview`,
    }))
    return [...chars, ...projs]
  }, [charData, projData])

  const filtered = useMemo<CmdItem[]>(() => {
    const lq = q.trim().toLowerCase()
    if (!lq) return NAV_ITEMS

    // Use server results if available; otherwise fall back to client cache
    if (searchData?.results?.length !== undefined) {
      return searchData.results.map(r => ({
        group: GROUP_LABEL[r.type] ?? r.type,
        label: r.name,
        sub: r.sub,
        av: r.name.slice(0, 1),
        imgUrl: r.imgUrl ?? undefined,
        color: r.color ?? (r.type === "character" ? charColor(r.id) : ENTRY_COLORS[r.sub] ?? "#8A857C"),
        to: r.path,
      }))
    }

    // While server is loading, show client results
    return clientItems.filter(it =>
      it.label.toLowerCase().includes(lq) ||
      (it.sub ?? "").toLowerCase().includes(lq)
    )
  }, [q, debouncedQ, searchData, clientItems])

  // Reset + focus when opened
  useEffect(() => {
    if (open) {
      setQ("")
      setDebouncedQ("")
      setSelIdx(0)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [open])

  // Clamp selIdx when filtered changes
  useEffect(() => {
    setSelIdx(i => Math.min(i, Math.max(filtered.length - 1, 0)))
  }, [filtered.length])

  function go(item: CmdItem) {
    navigate(item.to)
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelIdx(i => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filtered[selIdx]) go(filtered[selIdx])
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  if (!open) return null

  // Group consecutive items
  const groups: { label: string; items: CmdItem[] }[] = []
  for (const item of filtered) {
    const last = groups[groups.length - 1]
    if (last && last.label === item.group) last.items.push(item)
    else groups.push({ label: item.group, items: [item] })
  }

  let globalIdx = 0

  return (
    <div className="cmdk" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="box">
        <div className="field">
          <span className="ic"><SvgIcon k="search" /></span>
          <input
            ref={inputRef}
            placeholder="搜尋角色、世界觀、企劃…"
            autoComplete="off"
            value={q}
            onChange={e => { setQ(e.target.value); setSelIdx(0) }}
            onKeyDown={handleKeyDown}
          />
          {searching
            ? <span className="esc" style={{ opacity: .5 }}>搜尋中</span>
            : <span className="esc">esc</span>
          }
        </div>

        <div className="results">
          {filtered.length === 0 && q && !searching ? (
            <div className="none">找不到「{q}」</div>
          ) : (
            groups.map(group => (
              <div key={group.label}>
                <div className="grp">{group.label}</div>
                {group.items.map(item => {
                  const idx = globalIdx++
                  return (
                    <div
                      key={`${item.group}-${item.to}`}
                      className={"row" + (idx === selIdx ? " sel" : "")}
                      onMouseEnter={() => setSelIdx(idx)}
                      onClick={() => go(item)}
                    >
                      {item.imgUrl ? (
                        <span className="av" style={{ background: item.color, padding: 0, overflow: "hidden" }}>
                          <img src={item.imgUrl} alt={item.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </span>
                      ) : item.av != null ? (
                        <span className="av" style={{ background: item.color }}>{item.av}</span>
                      ) : (
                        <span className="ico"><SvgIcon k={item.icon ?? "globe"} /></span>
                      )}
                      <span className="tx">
                        <span className="lb">{item.label}</span>
                        {item.sub && <span className="sub">{item.sub}</span>}
                      </span>
                      <span className="go">↵</span>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
