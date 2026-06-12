import { useState, useRef, useEffect } from "react"
import { useParams } from "react-router-dom"
import { ContextHeader } from "@/components/ContextHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"

const STORAGE_KEY = "inspiration_v1"

type InspType = "text" | "link" | "image" | "color_palette" | "quote" | "scene" | "dialogue" | "character_idea"
type InspStatus = "inbox" | "organizing" | "converted" | "archived"

type InspirationItem = {
  id: string
  type: InspType
  content: string
  sourceUrl?: string
  colors?: string[]
  status: InspStatus
  tags: string[]
  projectId: string | null
  createdAt: string
}

const TYPE_META: Record<InspType, { label: string; glyph: string }> = {
  text:           { label: "文字",    glyph: "📝" },
  link:           { label: "連結",    glyph: "🔗" },
  image:          { label: "圖片",    glyph: "🖼" },
  color_palette:  { label: "色盤",    glyph: "🎨" },
  quote:          { label: "引用",    glyph: "💬" },
  scene:          { label: "場景",    glyph: "🌆" },
  dialogue:       { label: "對白",    glyph: "🗨" },
  character_idea: { label: "角色點子", glyph: "✦" },
}

const ALL_TYPES = Object.entries(TYPE_META) as [InspType, { label: string; glyph: string }][]

const STATUS_META: { value: InspStatus | "*"; label: string; icon: string }[] = [
  { value: "*",          label: "全部",  icon: "·" },
  { value: "inbox",      label: "待整理", icon: "⏱" },
  { value: "organizing", label: "整理中", icon: "·" },
  { value: "converted",  label: "已轉換", icon: "✓" },
  { value: "archived",   label: "已封存", icon: "▦" },
]

function loadItems(): InspirationItem[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") }
  catch { return [] }
}
function saveItems(items: InspirationItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-TW", { month: "short", day: "numeric" })
}
function detectType(text: string): InspType {
  if (/^https?:\/\//i.test(text.trim())) return "link"
  if (/#([0-9a-f]{6})/i.test(text.trim())) return "color_palette"
  if (text.startsWith("「") || text.startsWith("“")) return "quote"
  return "text"
}

// ── Quick capture box ─────────────────────────────────────────────────────────

function QuickCapture({
  projectId,
  projectName,
  projectColor,
  onCapture,
}: {
  projectId: string
  projectName: string
  projectColor: string
  onCapture: (item: Omit<InspirationItem, "id" | "createdAt">) => void
}) {
  const [text, setText] = useState("")
  const [type, setType] = useState<InspType>("text")
  const [assignedProjectId, setAssignedProjectId] = useState<string | null>(projectId)
  const [preview, setPreview] = useState<{ kind: "link" | "image"; url?: string } | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const detected = detectType(text)
    setType(detected)
    if (/^https?:\/\//i.test(text.trim())) {
      setPreview({ kind: "link", url: text.trim() })
    } else {
      setPreview(null)
    }
  }, [text])

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image")) {
        setType("image")
        setPreview({ kind: "image" })
        break
      }
    }
  }

  function doCapture() {
    const v = text.trim()
    if (!v) { taRef.current?.focus(); return }
    onCapture({
      type,
      content: v,
      status: "inbox",
      tags: [],
      projectId: assignedProjectId,
      ...(preview?.kind === "link" ? { sourceUrl: v } : {}),
    })
    setText("")
    setPreview(null)
    taRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      doCapture()
    }
  }

  return (
    <div className="qc-box">
      <label htmlFor="qcInput" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        記下一個靈感
      </label>
      <textarea
        id="qcInput"
        ref={taRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder="記下一個角色點子、對白、場景或參考連結……（Enter 建立，Shift+Enter 換行）"
        aria-label="記下一個靈感"
      />
      {preview && (
        <div className="qc-preview">
          <span className="pv-thumb" style={{ background: preview.kind === "link" ? "#4B7BB5" : "#B5654A" }}>
            {preview.kind === "link" ? "🔗" : "🖼"}
          </span>
          <div className="pv-info">
            <div className="pv-t">{preview.kind === "link" ? "Link Preview" : "圖片（建立 Asset）"}</div>
            <div className="pv-u">{preview.url ?? "處理中…"}</div>
          </div>
        </div>
      )}
      <div className="qc-row">
        <select
          className="select"
          value={type}
          onChange={e => setType(e.target.value as InspType)}
          aria-label="類型"
          style={{ width: "auto", padding: "6px 26px 6px 10px", fontSize: "12.5px" }}
        >
          {ALL_TYPES.map(([v, m]) => (
            <option key={v} value={v}>{m.glyph} {m.label}</option>
          ))}
        </select>
        <button
          type="button"
          className="qc-chip"
          onClick={() => setAssignedProjectId(p => p ? null : projectId)}
        >
          <span className="pc" style={{ background: assignedProjectId ? projectColor : "var(--text-faint)" }} />
          <span>{assignedProjectId ? projectName : "未選企劃"}</span>
        </button>
        <span className="hint" id="qcHint">Enter 建立 · 之後可再整理</span>
        <span className="spacer" />
        <button className="btn btn-accent btn-sm" onClick={doCapture}>捕捉</button>
      </div>
    </div>
  )
}

// ── Inspiration card ──────────────────────────────────────────────────────────

function InspirationCard({
  item,
  projectName,
  projectColor,
  onClick,
}: {
  item: InspirationItem
  projectName?: string
  projectColor?: string
  onClick: () => void
}) {
  const meta = TYPE_META[item.type] ?? { label: item.type, glyph: "·" }
  const statLabel = STATUS_META.find(s => s.value === item.status)?.label ?? item.status

  return (
    <button
      className="icard"
      data-i={item.id}
      tabIndex={0}
      aria-label={`${meta.label}：${(item.content || "").slice(0, 40)}`}
      onClick={onClick}
    >
      <div className="ih">
        <span className="ty">
          <span className="g">{meta.glyph}</span>
          {meta.label}
        </span>
        <span className={`in-st ${item.status}`}>{statLabel}</span>
      </div>

      {item.type === "color_palette" ? (
        <div className="palette">
          {(item.colors ?? item.content.split(",")).map((c, i) => (
            <span key={i} className="sw" style={{ background: c.trim() }} />
          ))}
        </div>
      ) : item.type === "image" ? (
        <div className="imgprev" style={{ background: "linear-gradient(135deg,#8A857C,#5E7E55)" }}>
          {item.content || "圖片"}
        </div>
      ) : (
        <div className="body">{item.content}</div>
      )}

      {item.type === "link" && (
        <div className="linkprev">🔗 {item.sourceUrl || item.content}</div>
      )}

      <div className="foot">
        {item.projectId && projectName ? (
          <span className="proj">
            <span className="pc" style={{ background: projectColor }} />
            {projectName}
          </span>
        ) : (
          <span className="proj" style={{ color: "var(--text-faint)" }}>未選企劃</span>
        )}
        {item.tags.slice(0, 2).map(t => (
          <span key={t} className="tag">#{t}</span>
        ))}
        <span className="when">{fmtDate(item.createdAt)}</span>
      </div>
    </button>
  )
}

// ── Detail drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({
  item,
  open,
  onClose,
  onStatusChange,
  onArchive,
  onDelete,
}: {
  item: InspirationItem | null
  open: boolean
  onClose: () => void
  onStatusChange: (id: string, s: InspStatus) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (open) document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  if (!item) return null

  const meta = TYPE_META[item.type] ?? { label: item.type, glyph: "·" }

  return (
    <>
      <div className={"in-scrim" + (open ? " open" : "")} onClick={onClose} />
      <aside
        className={"in-drawer" + (open ? " open" : "")}
        role="dialog"
        aria-modal="true"
        aria-label="靈感詳情"
      >
        <div className="dh">
          <div className="t">靈感詳情</div>
          <button className="x" ref={closeRef} onClick={onClose} aria-label="關閉">✕</button>
        </div>
        <div className="db">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--s3)" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
              color: "var(--text-dim)", padding: "3px 9px", borderRadius: "var(--r-pill)",
              background: "var(--surface-2)", border: "1px solid var(--border)"
            }}>
              {meta.glyph} {meta.label}
            </span>
            <span className={`in-st ${item.status}`}>
              {STATUS_META.find(s => s.value === item.status)?.label ?? item.status}
            </span>
          </div>

          {item.type === "color_palette" && (
            <div className="palette" style={{ margin: "0 0 var(--s3)" }}>
              {(item.colors ?? item.content.split(",")).map((c, i) => (
                <span key={i} style={{
                  width: 36, height: 36, borderRadius: 8, display: "inline-block",
                  border: "1px solid rgba(0,0,0,.1)", background: c.trim()
                }} />
              ))}
            </div>
          )}

          <div className="in-field">
            <div className="k">原始內容</div>
            <div className="v" style={{ whiteSpace: "pre-wrap" }}>{item.content}</div>
          </div>

          {item.sourceUrl && (
            <div className="in-field">
              <div className="k">來源</div>
              <div className="v">
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent-ink)", wordBreak: "break-all" }}>
                  {item.sourceUrl}
                </a>
              </div>
            </div>
          )}

          <div className="in-field">
            <div className="k">捕捉時間</div>
            <div className="v">{new Date(item.createdAt).toLocaleString("zh-TW")}</div>
          </div>

          <div className="in-field">
            <div className="k">所屬企劃</div>
            <div className="v">{item.projectId ? item.projectId : "未指定（我的靈感）"}</div>
          </div>

          <div className="in-field">
            <div className="k">標籤</div>
            <div className="v">{item.tags.length ? item.tags.map(t => "#" + t).join("　") : "—"}</div>
          </div>

          <div className="in-field">
            <div className="k">更改狀態</div>
            <div style={{ display: "flex", gap: "var(--s2)", flexWrap: "wrap", marginTop: 4 }}>
              {(STATUS_META.filter(s => s.value !== "*") as { value: InspStatus; label: string }[]).map(o => (
                <button
                  key={o.value}
                  className={"btn btn-sm" + (item.status === o.value ? " btn-accent" : "")}
                  onClick={() => onStatusChange(item.id, o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="in-field">
            <div className="k">已轉換為 · 0</div>
            <div style={{ fontSize: "12.5px", color: "var(--text-faint)" }}>
              尚未轉換。原始靈感會在轉換後保留。
            </div>
          </div>
        </div>

        <div className="df">
          <button className="btn btn-sm btn-accent">轉換為…</button>
          {item.status !== "archived" && (
            <button className="btn btn-sm" onClick={() => { onArchive(item.id); onClose() }}>封存</button>
          )}
          <span style={{ flex: 1 }} />
          <button
            className="btn btn-sm"
            style={{ borderColor: "var(--avoid)", color: "var(--avoid)" }}
            onClick={() => { onDelete(item.id); onClose() }}
          >
            刪除
          </button>
        </div>
      </aside>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function InspirationPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useProjectContext()

  const [scope, setScope] = useState<"account" | "project">("project")
  const [items, setItemsState] = useState<InspirationItem[]>(() => loadItems())
  const [filter, setFilter] = useState<InspStatus | "*">("*")
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [drawerItem, setDrawerItem] = useState<InspirationItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const projectColor = project.themeColor ?? "var(--accent)"

  function mutate(next: InspirationItem[]) {
    setItemsState(next)
    saveItems(next)
  }

  function handleCapture(partial: Omit<InspirationItem, "id" | "createdAt">) {
    const item: InspirationItem = {
      ...partial,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    mutate([item, ...items])
  }

  function openDrawer(item: InspirationItem) {
    setDrawerItem(item)
    setDrawerOpen(true)
  }
  function closeDrawer() {
    setDrawerOpen(false)
    setTimeout(() => setDrawerItem(null), 250)
  }

  function updateStatus(id: string, status: InspStatus) {
    mutate(items.map(i => i.id === id ? { ...i, status } : i))
    if (drawerItem?.id === id) setDrawerItem(d => d ? { ...d, status } : d)
  }

  function archiveItem(id: string) {
    updateStatus(id, "archived")
  }

  function deleteItem(id: string) {
    mutate(items.filter(i => i.id !== id))
  }

  const scopeItems = scope === "project"
    ? items.filter(i => i.projectId === projectId)
    : items

  const visible = filter === "*"
    ? scopeItems.filter(i => i.status !== "archived")
    : scopeItems.filter(i => i.status === filter)

  function count(v: InspStatus | "*") {
    return v === "*" ? scopeItems.length : scopeItems.filter(i => i.status === v).length
  }

  const crumbs = scope === "account"
    ? ["我的靈感"] as const
    : [{ label: project.name, href: `/p/${projectId}` }, "靈感匣"] as const

  return (
    <div className="page">
      <ContextHeader scope={scope === "account" ? "account" : "project"} crumbs={crumbs as any} />

      <div className="pageh">
        <div className="ht">
          <h1>靈感匣 <span className="en">Inspiration</span></h1>
          <p className="sub">
            低門檻捕捉你的點子、對白、場景與參考——之後再整理、連到企劃或轉成正式內容。
            <b>靈感不是正式角色／世界觀／故事的替代品。</b>
          </p>
        </div>
        <div className="acts">
          <div className="st-toggle">
            <button
              type="button"
              className={scope === "account" ? "on" : ""}
              onClick={() => { setScope("account"); setFilter("*") }}
            >
              我的靈感
            </button>
            <button
              type="button"
              className={scope === "project" ? "on" : ""}
              onClick={() => { setScope("project"); setFilter("*") }}
            >
              {project.name}
            </button>
          </div>
        </div>
      </div>

      <QuickCapture
        projectId={projectId!}
        projectName={project.name}
        projectColor={projectColor}
        onCapture={handleCapture}
      />

      <div className="in-cols">
        {/* Filter sidebar */}
        <div className="in-filter">
          <div className="scope-t">
            {scope === "account" ? "我的靈感（私人）" : `${project.name} 靈感`}
          </div>
          {STATUS_META.map(({ value, label, icon }) => (
            <div
              key={value}
              className={"opt" + (filter === value ? " on" : "")}
              onClick={() => setFilter(value as InspStatus | "*")}
            >
              <span className="ic">{icon}</span>
              {label}
              <span className="ct">{count(value as InspStatus | "*")}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div>
          <div className="in-toolbar">
            <div className="ac-view">
              <button
                className={viewMode === "card" ? "on" : ""}
                title="卡片"
                onClick={() => setViewMode("card")}
              >
                ⊞
              </button>
              <button
                className={viewMode === "list" ? "on" : ""}
                title="列表"
                onClick={() => setViewMode("list")}
              >
                ≡
              </button>
            </div>
            <span className="spacer" />
            <span className="in-count">{visible.length} 則</span>
          </div>

          {visible.length === 0 ? (
            <div className="state" style={{ marginTop: "var(--s6)" }}>
              <span className="ti">
                {filter === "*"
                  ? (scope === "account" ? "我的靈感是空的。" : "這個企劃的靈感匣是空的。")
                  : `沒有「${STATUS_META.find(s => s.value === filter)?.label}」的靈感。`}
              </span>
              <p className="bd">
                {filter === "*" || filter === "inbox"
                  ? "用上方的快速捕捉記下第一個念頭——不用先選企劃或填欄位。"
                  : "換個篩選看看。"}
              </p>
            </div>
          ) : (
            <div className={"in-grid" + (viewMode === "list" ? " list" : "")}>
              {visible.map(item => (
                <InspirationCard
                  key={item.id}
                  item={item}
                  projectName={project.name}
                  projectColor={projectColor}
                  onClick={() => openDrawer(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        type="button"
        className="in-fab"
        aria-label="快速新增靈感"
        onClick={() => {
          const ta = document.getElementById("qcInput")
          if (ta) { ta.scrollIntoView({ behavior: "smooth" }); (ta as HTMLTextAreaElement).focus() }
        }}
      >
        ＋
      </button>

      <DetailDrawer
        item={drawerItem}
        open={drawerOpen}
        onClose={closeDrawer}
        onStatusChange={updateStatus}
        onArchive={archiveItem}
        onDelete={deleteItem}
      />
    </div>
  )
}
