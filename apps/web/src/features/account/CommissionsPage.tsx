import { useState, useRef, useEffect, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { ContextHeader } from "@/components/ContextHeader"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useDroppable } from "@dnd-kit/core"

// ─── types ────────────────────────────────────────────────────────────────────
interface Commission {
  id: string
  char: CharKey
  title: string
  artist: string
  status: StatusKey
  due: string
  budget: string
  usage: "personal" | "commercial"
  unread: number
  updated: string
  ago: number
  archived?: boolean
}

type CharKey = "yoi" | "tomori" | "hiru" | "nozomi"
type StatusKey = "talk" | "progress" | "done"

// ─── static data ──────────────────────────────────────────────────────────────
const CHARS: Record<CharKey, { name: string; sp: string; c: string }> = {
  yoi:    { name: "宵霧", sp: "妖狐",   c: "#8FA3B0" },
  tomori: { name: "燈守", sp: "付喪神", c: "#C8463C" },
  hiru:   { name: "晝",   sp: "半神",   c: "#E0A23B" },
  nozomi: { name: "望",   sp: "人類",   c: "#2E6F6A" },
}

const STATUS: Record<StatusKey, { t: string; en: string; c: string }> = {
  talk:     { t: "洽談中", en: "In talks",    c: "#A98B4E" },
  progress: { t: "進行中", en: "In progress", c: "#3B6FB0" },
  done:     { t: "已完成", en: "Delivered",   c: "#3E8E5A" },
}

const USAGE_LABEL: Record<"personal" | "commercial", string> = {
  personal: "個人",
  commercial: "商用",
}

const DEMO_COMMS: Commission[] = [
  { id: "cm2", char: "yoi",    title: "Q版表情貼圖 ×4",    artist: "",           status: "talk",     due: "2026.08.01", budget: "NT$3,200",  usage: "commercial", unread: 2, updated: "5 小時前",  ago: 5    },
  { id: "cm3", char: "tomori", title: "立繪翻新・全身",     artist: "@kuro_e",   status: "talk",     due: "未定",        budget: "洽談中",     usage: "personal",   unread: 1, updated: "昨天",      ago: 26   },
  { id: "cm1", char: "yoi",    title: "生日紀念・提燈半身", artist: "@hoshi_ame",status: "progress", due: "2026.07.15", budget: "NT$8,000",  usage: "personal",   unread: 0, updated: "2 天前",    ago: 48   },
  { id: "cm4", char: "hiru",   title: "主視覺・坐姿全身",   artist: "@rin_draws",status: "progress", due: "2026.06.30", budget: "NT$12,000", usage: "commercial", unread: 0, updated: "3 天前",    ago: 72   },
  { id: "cm5", char: "hiru",   title: "SD 配對掛畫",        artist: "@rin_draws",status: "progress", due: "2026.07.20", budget: "NT$5,000",  usage: "personal",   unread: 0, updated: "1 週前",    ago: 168  },
  { id: "cm6", char: "yoi",    title: "立繪・初版巫裝",      artist: "@momoko",   status: "done",     due: "2026.04.10", budget: "NT$9,500",  usage: "personal",   unread: 0, updated: "1 個月前",  ago: 720  },
  { id: "cm7", char: "nozomi", title: "頭像 icon",          artist: "@momoko",   status: "done",     due: "2026.03.02", budget: "NT$2,000",  usage: "personal",   unread: 0, updated: "2 個月前",  ago: 1440 },
]

const TODAY = new Date("2026-06-04")

function dueSoon(due: string): boolean {
  const m = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(due)
  if (!m) return false
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  const days = (d.getTime() - TODAY.getTime()) / 86400000
  return days >= 0 && days <= 30
}

function dueVal(due: string): number {
  const m = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(due)
  return m ? +new Date(+m[1], +m[2] - 1, +m[3]) : Infinity
}

// ─── CommissionCard ───────────────────────────────────────────────────────────
interface CardProps {
  comm: Commission
  onMove: (id: string, status: StatusKey) => void
  onArchive: (id: string) => void
  isDragging?: boolean
}

function CommissionCard({ comm, onMove, onArchive, isDragging = false }: CardProps) {
  const ch = CHARS[comm.char]
  const soon = dueSoon(comm.due)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // close menu on outside click or Esc
  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEsc)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEsc)
    }
  }, [menuOpen])

  const otherStatuses = (Object.keys(STATUS) as StatusKey[]).filter(k => k !== comm.status)

  return (
    <div
      role="article"
      tabIndex={0}
      aria-label={`${comm.title}，開啟委託`}
      style={{
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-btn)",
        padding: "13px 14px",
        boxShadow: isDragging ? "none" : "var(--sh-1)",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.4 : 1,
        transition: "box-shadow .16s, transform .16s, border-color .16s, opacity .16s",
        outline: "none",
      }}
      onMouseEnter={e => {
        if (!isDragging) {
          const el = e.currentTarget as HTMLDivElement
          el.style.boxShadow = "var(--sh-2)"
          el.style.transform = "translateY(-2px)"
          el.style.borderColor = "var(--border-strong)"
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = "var(--sh-1)"
        el.style.transform = ""
        el.style.borderColor = "var(--border)"
      }}
    >
      {/* Top line */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--text-dim)" }}>
          <span style={{
            width: 19, height: 19, borderRadius: "50%",
            background: ch.c,
            display: "grid", placeItems: "center",
            fontFamily: "var(--font-serif)", fontSize: 10, fontWeight: 700, color: "#fff",
            flexShrink: 0,
          }}>
            {ch.name[0]}
          </span>
          {ch.name}
        </span>
        {comm.unread > 0 && (
          <span style={{
            marginLeft: "auto",
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 11, fontWeight: 700,
            color: "var(--accent-ink)",
            background: "var(--accent-soft)",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            borderRadius: "var(--r-pill)",
            padding: "2px 8px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
            {comm.unread} 則新訊息
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 700, lineHeight: 1.3, marginBottom: 9 }}>
        {comm.title}
      </div>

      {/* Meta */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12.5, color: "var(--text-dim)" }}>
        {/* Artist */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-faint)", width: 38, flexShrink: 0 }}>
            繪師
          </span>
          <span style={{ fontWeight: comm.artist ? 600 : 500, color: comm.artist ? "var(--text)" : "var(--text-faint)" } as React.CSSProperties}>
            {comm.artist || "尚未指定"}
          </span>
        </div>

        {/* Due */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-faint)", width: 38, flexShrink: 0 }}>
            截止
          </span>
          <span style={{ fontWeight: 600, color: soon ? "var(--avoid)" : "var(--text)" }}>
            {comm.due}
          </span>
          {soon && (
            <span style={{
              fontSize: 10.5, fontWeight: 700,
              color: "var(--avoid)",
              background: "var(--avoid-soft)",
              borderRadius: "var(--r-pill)",
              padding: "1px 8px",
              whiteSpace: "nowrap",
            }}>
              即將到期
            </span>
          )}
        </div>

        {/* Budget */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-faint)", width: 38, flexShrink: 0 }}>
            預算
          </span>
          <span style={{ fontWeight: 600, color: "var(--text)" }}>
            {comm.budget}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginTop: 11, paddingTop: 10,
        borderTop: "1px solid var(--border)",
      }}>
        {/* Usage tag */}
        <span style={{
          fontSize: 11, fontWeight: 600,
          padding: "2px 9px", borderRadius: "var(--r-pill)",
          whiteSpace: "nowrap", flexShrink: 0,
          background: comm.usage === "personal" ? "var(--bg-tint)" : "#F3E7CE",
          color: comm.usage === "personal" ? "var(--text-dim)" : "#7A5A12",
        }}>
          {USAGE_LABEL[comm.usage]}
        </span>

        {/* Updated */}
        <span style={{
          fontSize: 11, color: "var(--text-faint)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
        }}>
          {comm.updated}
        </span>

        {/* Action button */}
        {comm.status === "done" ? (
          comm.archived ? (
            <span style={{
              marginLeft: "auto",
              fontSize: 11.5, fontWeight: 600,
              color: "#1F7A4D", background: "#E6F2EA",
              borderRadius: "var(--r-pill)",
              padding: "3px 11px",
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
              ✓ 已回存相簿
            </span>
          ) : (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onArchive(comm.id) }}
              style={{
                marginLeft: "auto",
                fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                color: "var(--accent-ink)", background: "var(--accent-soft)",
                border: "1px solid var(--accent)",
                borderRadius: "var(--r-pill)",
                padding: "3px 11px",
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              ↓ 回存作品
            </button>
          )
        ) : (
          <div ref={menuRef} style={{ marginLeft: "auto", position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
              aria-haspopup="true"
              aria-label="移動到其他階段"
              style={{
                fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                color: "var(--text-dim)", background: "var(--bg-tint)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-pill)",
                padding: "3px 10px",
                cursor: "pointer", whiteSpace: "nowrap",
                transition: "border-color .14s, color .14s",
              }}
            >
              移至 ▾
            </button>

            {menuOpen && (
              <div style={{
                position: "absolute",
                right: 0,
                bottom: "calc(100% + 6px)",
                zIndex: 20,
                background: "var(--surface)",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--r-btn)",
                boxShadow: "var(--sh-pop)",
                padding: 5,
                display: "flex", flexDirection: "column", gap: 2,
                minWidth: 156,
              }}>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: ".1em",
                  textTransform: "uppercase", color: "var(--text-faint)",
                  padding: "5px 9px 4px",
                }}>
                  移至階段
                </div>
                {otherStatuses.map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onMove(comm.id, key)
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 9,
                      fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                      color: "var(--text)", background: "none",
                      border: "none", borderRadius: 7,
                      padding: "8px 9px",
                      cursor: "pointer", textAlign: "left", whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tint)" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none" }}
                  >
                    <span style={{
                      width: 9, height: 9, borderRadius: 3,
                      background: STATUS[key].c,
                      flexShrink: 0,
                    }} />
                    {STATUS[key].t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* View link */}
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent)", whiteSpace: "nowrap", flexShrink: 0 }}>
          查看 →
        </span>
      </div>
    </div>
  )
}

// ─── SortableCard wrapper ─────────────────────────────────────────────────────
function SortableCard({ comm, onMove, onArchive }: Omit<CardProps, "isDragging">) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: comm.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CommissionCard comm={comm} onMove={onMove} onArchive={onArchive} isDragging={isDragging} />
    </div>
  )
}

// ─── DroppableColumn ──────────────────────────────────────────────────────────
interface ColumnProps {
  statusKey: StatusKey
  comms: Commission[]
  onMove: (id: string, status: StatusKey) => void
  onArchive: (id: string) => void
  isOver: boolean
}

function DroppableColumn({ statusKey, comms, onMove, onArchive, isOver }: ColumnProps) {
  const st = STATUS[statusKey]
  const { setNodeRef } = useDroppable({ id: statusKey })

  return (
    <div
      style={{
        background: isOver ? "var(--accent-soft)" : "var(--surface-2)",
        border: `1px solid ${isOver ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--r-card)",
        padding: "var(--s4)",
        minHeight: 200,
        transition: "background .15s, border-color .15s",
      }}
    >
      {/* Column header */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 6px var(--s4)" }}>
        <span style={{ width: 9, height: 9, borderRadius: 3, background: st.c, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>{st.t}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-faint)" }}>
          {st.en}
        </span>
        <span style={{
          marginLeft: "auto",
          fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-faint)",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r-pill)", padding: "1px 9px",
        }}>
          {comms.length}
        </span>
      </div>

      {/* Cards */}
      <div ref={setNodeRef} style={{
        display: "flex", flexDirection: "column", gap: "var(--s3)",
        ...(isOver ? {
          outline: "2px dashed color-mix(in srgb, var(--accent) 45%, transparent)",
          outlineOffset: 5,
          borderRadius: "var(--r-btn)",
          minHeight: 60,
        } : {}),
      }}>
        <SortableContext items={comms.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {comms.length === 0 ? (
            <div style={{ textAlign: "center", padding: "var(--s8) var(--s4)", color: "var(--text-faint)", fontSize: 13 }}>
              這個階段沒有委託
            </div>
          ) : (
            comms.map(comm => (
              <SortableCard key={comm.id} comm={comm} onMove={onMove} onArchive={onArchive} />
            ))
          )}
        </SortableContext>
      </div>

      {/* Add button for talk column */}
      {statusKey === "talk" && (
        <button
          type="button"
          onClick={() => {/* coming soon */}}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: 11, marginTop: "var(--s2)",
            border: "1.5px dashed var(--border-strong)",
            borderRadius: "var(--r-btn)",
            color: "var(--text-dim)", fontSize: 13, fontWeight: 600,
            cursor: "pointer", background: "none", width: "100%",
            fontFamily: "inherit",
            transition: "all .15s",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.borderColor = "var(--accent)"
            el.style.color = "var(--accent)"
            el.style.background = "var(--accent-soft)"
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.borderColor = "var(--border-strong)"
            el.style.color = "var(--text-dim)"
            el.style.background = "none"
          }}
        >
          ＋ 新委託洽談
        </button>
      )}
    </div>
  )
}

// ─── CommissionsPage ──────────────────────────────────────────────────────────
export function CommissionsPage() {
  const [comms, setComms] = useState<Commission[]>(DEMO_COMMS)
  const [charFilter, setCharFilter] = useState<CharKey | "*">("*")
  const [sortBy, setSortBy] = useState<"due" | "updated">("due")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<StatusKey | null>(null)

  // Stub useQuery to match the API pattern
  const { status } = useQuery({
    queryKey: ["commissions"],
    queryFn: () => Promise.resolve({ commissions: DEMO_COMMS }),
    staleTime: Infinity,
  })

  // Computed stats
  const active = comms.filter(c => c.status !== "done").length
  const unreadCount = comms.filter(c => c.unread > 0).length
  const soonCount = comms.filter(c => c.status !== "done" && dueSoon(c.due)).length

  // Character filter counts
  const charCounts = {
    "*": comms.length,
    ...Object.fromEntries(
      (Object.keys(CHARS) as CharKey[]).map(id => [id, comms.filter(c => c.char === id).length])
    ),
  } as Record<CharKey | "*", number>

  const filtered = charFilter === "*" ? comms : comms.filter(c => c.char === charFilter)

  function getSortedColumn(statusKey: StatusKey) {
    const col = filtered.filter(c => c.status === statusKey)
    return [...col].sort((a, b) =>
      sortBy === "due" ? dueVal(a.due) - dueVal(b.due) : a.ago - b.ago
    )
  }

  const handleMove = useCallback((id: string, newStatus: StatusKey) => {
    setComms(prev => prev.map(c =>
      c.id === id
        ? { ...c, status: newStatus, ago: 0, updated: "剛剛", unread: newStatus === "done" ? 0 : c.unread }
        : c
    ))
  }, [])

  const handleArchive = useCallback((id: string) => {
    setComms(prev => prev.map(c => c.id === id ? { ...c, archived: true } : c))
  }, [])

  // dnd-kit setup
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragOver(event: { over: { id: string } | null }) {
    const overId = event.over?.id as string | undefined
    if (overId && overId in STATUS) {
      setOverColumn(overId as StatusKey)
    } else {
      setOverColumn(null)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    setOverColumn(null)

    if (!over) return
    const overId = over.id as string

    // If dropped on a column
    if (overId in STATUS) {
      const comm = comms.find(c => c.id === active.id)
      if (comm && comm.status !== overId) {
        handleMove(active.id as string, overId as StatusKey)
      }
      return
    }

    // If dropped on another card — move to that card's column
    const targetComm = comms.find(c => c.id === overId)
    const sourceComm = comms.find(c => c.id === active.id)
    if (targetComm && sourceComm && targetComm.status !== sourceComm.status) {
      handleMove(active.id as string, targetComm.status)
    }
  }

  const activeComm = activeId ? comms.find(c => c.id === activeId) : null

  return (
    <div className="page" style={{ paddingBottom: 0 }}>
      <ContextHeader scope="account" crumbs={["委託收件匣"]} />

      {/* Page header */}
      <div style={{ padding: "var(--s12) var(--s8) var(--s5)", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--s4)", flexWrap: "wrap" }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 38, margin: 0, fontWeight: 700 }}>
            委託收件匣
          </h1>
          <div style={{ flex: 1 }} />

          {/* Summary stats */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s5)", fontSize: 13, color: "var(--text-dim)", paddingBottom: 7, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B6FB0", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 19, color: "var(--text)", fontWeight: 700 }}>{active}</span>
              件進行中
            </span>
            <span style={{ width: 1, height: 22, background: "var(--border)", flexShrink: 0 }} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 19, color: "var(--text)", fontWeight: 700 }}>{unreadCount}</span>
              件待回覆
            </span>
            <span style={{ width: 1, height: 22, background: "var(--border)", flexShrink: 0 }} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8463C", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 19, color: "var(--text)", fontWeight: 700 }}>{soonCount}</span>
              件即將到期
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        maxWidth: 1280, margin: "0 auto",
        padding: "0 var(--s8) var(--s6)",
        display: "flex", alignItems: "center", gap: "var(--s3)", flexWrap: "wrap",
      }}>
        {/* Character filter pills */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {/* All */}
          <button
            type="button"
            onClick={() => setCharFilter("*")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              fontSize: 13, fontWeight: 600,
              padding: "5px 12px 5px 13px",
              borderRadius: "var(--r-pill)",
              border: `1px solid ${charFilter === "*" ? "var(--text)" : "var(--border)"}`,
              background: charFilter === "*" ? "var(--text)" : "var(--surface)",
              color: charFilter === "*" ? "#fff" : "var(--text-dim)",
              cursor: "pointer", transition: "all .14s",
              fontFamily: "inherit",
            }}
          >
            全部委託 {charCounts["*"]}
          </button>

          {/* Per-character pills */}
          {(Object.keys(CHARS) as CharKey[])
            .filter(id => charCounts[id] > 0)
            .map(id => {
              const ch = CHARS[id]
              const on = charFilter === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCharFilter(id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    fontSize: 13, fontWeight: 600,
                    padding: "5px 12px 5px 6px",
                    borderRadius: "var(--r-pill)",
                    border: `1px solid ${on ? "var(--text)" : "var(--border)"}`,
                    background: on ? "var(--text)" : "var(--surface)",
                    color: on ? "#fff" : "var(--text-dim)",
                    cursor: "pointer", transition: "all .14s",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: ch.c,
                    display: "grid", placeItems: "center",
                    fontFamily: "var(--font-serif)", fontSize: 10, fontWeight: 700, color: "#fff",
                    flexShrink: 0,
                  }}>
                    {ch.name[0]}
                  </span>
                  {ch.name} {charCounts[id]}
                </button>
              )
            })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Drag hint */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-faint)" }}>
          <span style={{ fontSize: 13, letterSpacing: -1 }}>⠿</span>
          拖曳，或點卡片「移至」換階段
        </span>

        {/* Sort button */}
        <button
          type="button"
          onClick={() => setSortBy(v => v === "due" ? "updated" : "due")}
          style={{
            marginLeft: 14,
            fontSize: 13, fontWeight: 600, color: "var(--text-faint)",
            background: "none", border: "none", fontFamily: "inherit", cursor: "pointer",
          }}
        >
          排序：{sortBy === "due" ? "截止日" : "最近更新"} ▾
        </button>
      </div>

      {/* Loading / error states */}
      {status === "pending" && (
        <LoadingSpinner />
      )}
      {status === "error" && (
        <p style={{ color: "var(--avoid)", padding: "0 var(--s8)" }}>無法載入委託</p>
      )}

      {/* Kanban board */}
      {status === "success" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver as never}
          onDragEnd={handleDragEnd}
        >
          <div style={{
            maxWidth: 1280, margin: "0 auto",
            padding: "0 var(--s8) var(--s16)",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--s5)",
            alignItems: "start",
          }}
            className="cm-board"
          >
            {(Object.keys(STATUS) as StatusKey[]).map(key => (
              <DroppableColumn
                key={key}
                statusKey={key}
                comms={getSortedColumn(key)}
                onMove={handleMove}
                onArchive={handleArchive}
                isOver={overColumn === key}
              />
            ))}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeComm && (
              <div style={{ transform: "rotate(1.5deg)", opacity: 0.95 }}>
                <CommissionCard
                  comm={activeComm}
                  onMove={handleMove}
                  onArchive={handleArchive}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 980px) {
          .cm-board { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
