import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { PageHeader } from "@/components/PageHeader"
import { charColor } from "@/lib/charColor"
import type { CharacterListResponse, ProjectListResponse, CharacterWithMemberships } from "@oc-tools/contracts"

// ── Icons ────────────────────────────────────────────────────────────────────

function IcGrid() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
}

function IcList() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>
}

function IcGlobe() {
  return <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c-2 2-2 9 0 12M8 2c2 2 2 9 0 12"/></svg>
}

function IcLink() {
  return <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a3 3 0 0 0 4 0l2-2a3 3 0 0 0-4-4L6.5 3.5"/><path d="M10 8a3 3 0 0 0-4 0L4 10a3 3 0 0 0 4 4L9.5 12.5"/></svg>
}

function IcLock() {
  return <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="10" height="8" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>
}

function IcCopy() {
  return <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M2 10V3a1 1 0 0 1 1-1h7"/></svg>
}

function IcPencil() {
  return <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5L13.5 4.5L6 12l-3 .5.5-3 7.5-7Z"/></svg>
}

// ── Visibility config ─────────────────────────────────────────────────────────

const VIS_CONFIG = {
  public:   { label: "公開",    desc: "所有人可搜尋與查看", icon: <IcGlobe />,   color: "#1F6B43", bg: "var(--must-soft)",    border: "#CDE8D8" },
  unlisted: { label: "限連結",  desc: "有連結才能查看",     icon: <IcLink />,    color: "#6B3D00", bg: "var(--accent-soft)", border: "#ECDFA8" },
  private:  { label: "私人",    desc: "只有你能查看",       icon: <IcLock />,   color: "var(--text-faint)", bg: "var(--surface-2)",  border: "var(--border)" },
} as const

type Visibility = keyof typeof VIS_CONFIG

// ── Slug edit modal ──────────────────────────────────────────────────────────

function SlugEditModal({
  type,
  id,
  currentSlug,
  origin,
  prefix,
  onClose,
}: {
  type: "character" | "project"
  id: string
  currentSlug: string
  origin: string
  prefix: string
  onClose: () => void
}) {
  const [slug, setSlug] = useState(currentSlug)
  const [err, setErr] = useState("")
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      apiClient(`/api/app/${type === "character" ? "characters" : "projects"}/${id}`, {
        method: "PATCH",
        body: { slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: type === "character" ? ["characters"] : ["projects"] })
      onClose()
    },
    onError: (e: Error) => setErr(e.message || "網址已被使用，請換一個"),
  })

  const cleaned = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <h2>更改自訂網址</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="lbl">自訂網址</label>
            <div className="set-slugwrap">
              <span className="set-pfx" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{origin}/{prefix}/</span>
              <input
                className="inp"
                value={slug}
                onChange={e => { setSlug(e.target.value); setErr("") }}
                placeholder="my-character"
                autoFocus
                style={{ border: "none", borderRadius: 0, boxShadow: "none", fontFamily: "var(--font-mono)", fontSize: 13 }}
              />
            </div>
            {cleaned && cleaned !== slug && (
              <p style={{ fontSize: 11.5, color: "var(--text-faint)", margin: "4px 0 0" }}>
                會自動調整為：<code style={{ fontFamily: "var(--font-mono)" }}>{cleaned}</code>
              </p>
            )}
            {err && <p style={{ fontSize: 12, color: "var(--avoid)", margin: "4px 0 0" }}>{err}</p>}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--text-faint)", margin: 0 }}>
            更改後，舊的連結將失效。請確保已通知相關人員。
          </p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button
            className="btn btn-accent"
            disabled={mutation.isPending || !cleaned || cleaned === currentSlug}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "儲存中…" : "儲存"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Visibility change popover ────────────────────────────────────────────────

function VisPopover({
  type,
  id,
  current,
  onClose,
}: {
  type: "character" | "project"
  id: string
  current: Visibility
  onClose: () => void
}) {
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (vis: Visibility) =>
      apiClient(`/api/app/${type === "character" ? "characters" : "projects"}/${id}`, {
        method: "PATCH",
        body: { visibility: vis },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: type === "character" ? ["characters"] : ["projects"] })
      onClose()
    },
  })

  return (
    <div
      style={{
        position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 80,
        background: "var(--surface)", border: "1px solid var(--border-strong)",
        borderRadius: "var(--r-card)", boxShadow: "var(--sh-pop)", padding: 6,
        minWidth: 220,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-faint)", padding: "4px 8px 8px", textTransform: "uppercase" }}>
        更改可見性
      </div>
      {(["public", "unlisted", "private"] as Visibility[]).map(v => {
        const cfg = VIS_CONFIG[v]
        return (
          <button
            key={v}
            onClick={() => mutation.mutate(v)}
            disabled={mutation.isPending}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "8px 10px", borderRadius: "var(--r-btn)", border: "none",
              background: v === current ? "var(--bg-tint)" : "none",
              cursor: mutation.isPending ? "wait" : "pointer",
              textAlign: "left", fontFamily: "inherit",
              transition: "background .12s",
            }}
            onMouseEnter={e => { if (v !== current) e.currentTarget.style.background = "var(--bg-tint)" }}
            onMouseLeave={e => { if (v !== current) e.currentTarget.style.background = "none" }}
          >
            <span style={{ color: cfg.color }}>{cfg.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: v === current ? cfg.color : "var(--text)" }}>{cfg.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{cfg.desc}</div>
            </div>
            {v === current && <span style={{ fontSize: 11, color: "var(--text-faint)" }}>✓</span>}
          </button>
        )
      })}
      <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />
      <button
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: "var(--r-btn)", border: "none", background: "none", cursor: "not-allowed", opacity: 0.5, fontFamily: "inherit", textAlign: "left" }}
        disabled
        title="密碼保護即將推出"
      >
        <IcLock />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>密碼保護</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>即將推出</div>
        </div>
      </button>
    </div>
  )
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyBtn({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="btn btn-sm btn-ghost"
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
      title="複製連結"
      style={{ gap: 5, display: "inline-flex", alignItems: "center" }}
    >
      <IcCopy />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{copied ? "已複製 ✓" : "複製"}</span>
    </button>
  )
}

// ── Vis badge ─────────────────────────────────────────────────────────────────

function VisBadge({ vis }: { vis: Visibility }) {
  const cfg = VIS_CONFIG[vis]
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 700, padding: "2px 8px",
      borderRadius: "var(--r-pill)",
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.color, whiteSpace: "nowrap",
    }}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ── Character card ────────────────────────────────────────────────────────────

function CharCard({
  char,
  origin,
  onEditSlug,
}: {
  char: CharacterWithMemberships
  origin: string
  onEditSlug: () => void
}) {
  const [showVis, setShowVis] = useState(false)
  const color = char.themeColor ?? charColor(char.id)
  const vis = (char.visibility ?? "private") as Visibility
  const url = char.slug ? `${origin}/c/${char.slug}` : null

  return (
    <div className="block" style={{ padding: "var(--s3) var(--s4)", display: "flex", alignItems: "center", gap: "var(--s4)" }}>
      {/* Avatar */}
      <div style={{ width: 40, height: 40, borderRadius: 12, background: color, flexShrink: 0, overflow: "hidden", display: "grid", placeItems: "center" }}>
        {char.avatarUrl
          ? <img src={char.avatarUrl} alt={char.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ color: "#fff", fontFamily: "var(--font-serif)", fontWeight: 800, fontSize: 17 }}>{char.name.slice(0, 1)}</span>
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{char.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <VisBadge vis={vis} />
          {url && vis !== "private" ? (
            <a
              href={url} target="_blank" rel="noreferrer"
              style={{ fontSize: 11.5, color: "var(--text-faint)", fontFamily: "var(--font-mono)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}
              onClick={e => e.stopPropagation()}
            >
              /c/{char.slug}
            </a>
          ) : (
            <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
              {char.slug ? <span style={{ fontFamily: "var(--font-mono)" }}>/c/{char.slug}</span> : "尚無連結"}
            </span>
          )}
          {vis !== "private" && !char.slug && (
            <button
              onClick={onEditSlug}
              style={{ padding: "2px 8px", borderRadius: "var(--r-btn)", border: "1px solid var(--warn, #e0a83c)", background: "var(--warn-soft, #fdf6e3)", color: "var(--warn-text, #9a6f00)", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
            >
              請設定連結
            </button>
          )}
          {char.slug && (
            <button
              onClick={onEditSlug}
              title="更改連結"
              style={{ padding: "2px 5px", borderRadius: "var(--r-btn)", border: "none", background: "none", color: "var(--text-faint)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11 }}
            >
              <IcPencil />
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)", flexShrink: 0 }}>
        {url && vis !== "private" && <CopyBtn url={url} />}
        <Link to={`/characters/${char.id}/edit`} className="btn btn-sm btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <IcPencil /> 編輯
        </Link>
        <div style={{ position: "relative" }}>
          <button
            className={"btn btn-sm" + (showVis ? " btn-accent" : " btn-ghost")}
            onClick={e => { e.stopPropagation(); setShowVis(v => !v) }}
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            {VIS_CONFIG[vis].icon}
            <span style={{ fontSize: 12 }}>{VIS_CONFIG[vis].label}</span>
            <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 8,11 13,6"/></svg>
          </button>
          {showVis && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 70 }} onClick={() => setShowVis(false)} />
              <VisPopover type="character" id={char.id} current={vis} onClose={() => setShowVis(false)} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Character row (list mode) ─────────────────────────────────────────────────

function CharRow({
  char,
  origin,
  onEditSlug,
}: {
  char: CharacterWithMemberships
  origin: string
  onEditSlug: () => void
}) {
  const [showVis, setShowVis] = useState(false)
  const color = char.themeColor ?? charColor(char.id)
  const vis = (char.visibility ?? "private") as Visibility
  const url = char.slug && vis !== "private" ? `${origin}/c/${char.slug}` : null

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "var(--s3)",
      padding: "10px 14px",
      border: "1px solid var(--border)", borderRadius: "var(--r-card)",
      background: "var(--surface)", marginBottom: "var(--s2)",
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: color, flexShrink: 0, overflow: "hidden", display: "grid", placeItems: "center" }}>
        {char.avatarUrl
          ? <img src={char.avatarUrl} alt={char.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ color: "#fff", fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 14 }}>{char.name.slice(0, 1)}</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{char.name}</div>
        {url && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
            <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: "var(--font-mono)", textDecoration: "none" }}>
              /c/{char.slug}
            </a>
            <button onClick={onEditSlug} title="更改連結" style={{ padding: 0, border: "none", background: "none", color: "var(--text-faint)", cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
              <IcPencil />
            </button>
          </div>
        )}
      </div>
      <VisBadge vis={vis} />
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {url && <CopyBtn url={url} />}
        <Link to={`/characters/${char.id}/edit`} className="btn btn-sm btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }}>編輯</Link>
        <div style={{ position: "relative" }}>
          <button
            className={"btn btn-sm" + (showVis ? " btn-accent" : " btn-ghost")}
            onClick={e => { e.stopPropagation(); setShowVis(v => !v) }}
            style={{ fontSize: 12, padding: "5px 10px" }}
          >
            可見性
          </button>
          {showVis && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 70 }} onClick={() => setShowVis(false)} />
              <VisPopover type="character" id={char.id} current={vis} onClose={() => setShowVis(false)} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, en, count }: { title: string; en: string; count: number }) {
  return (
    <div className="sec-head" style={{ marginBottom: "var(--s3)" }}>
      <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 800, margin: 0 }}>{title}</h2>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)" }}>{en}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>{count}</span>
      <div className="sec-rule" />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type VisFilter = "all" | Visibility
type ViewMode = "card" | "list"

export function PublicPagesPage() {
  const [filter, setFilter] = useState<VisFilter>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("card")
  const [slugEdit, setSlugEdit] = useState<{ type: "character" | "project"; id: string; slug: string; prefix: string } | null>(null)

  const { data: charData, status: charStatus } = useQuery({
    queryKey: ["characters"],
    queryFn: () => apiClient<CharacterListResponse>("/api/app/characters"),
  })
  const { data: projData, status: projStatus } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiClient<ProjectListResponse>("/api/app/projects"),
  })

  const origin = window.location.origin
  const allChars = charData?.characters ?? []
  const allProjs = projData?.projects ?? []

  const filteredChars = useMemo(() => {
    if (filter === "all") return allChars
    return allChars.filter(c => c.visibility === filter)
  }, [allChars, filter])

  const filteredProjs = useMemo(() => {
    if (filter === "all") return allProjs
    return allProjs.filter(p => p.visibility === filter)
  }, [allProjs, filter])

  const counts = useMemo(() => ({
    all: allChars.length + allProjs.length,
    public: allChars.filter(c => c.visibility === "public").length + allProjs.filter(p => p.visibility === "public").length,
    unlisted: allChars.filter(c => c.visibility === "unlisted").length + allProjs.filter(p => p.visibility === "unlisted").length,
    private: allChars.filter(c => c.visibility === "private").length + allProjs.filter(p => p.visibility === "private").length,
  }), [allChars, allProjs])

  const isEmpty = allChars.length === 0 && allProjs.length === 0

  return (
    <div className="page narrow">
      <ContextHeader scope="account" crumbs={["我的公開頁"]} />
      <PageHeader
        title="我的公開頁"
        eyebrow="Public Pages"
        sub="管理所有角色與企劃的可見性、連結與隱私設定。"
      />

      {(charStatus === "pending" || projStatus === "pending") && (
        <p style={{ color: "var(--text-faint)", fontSize: 14 }}>載入中…</p>
      )}
      {(charStatus === "error" || projStatus === "error") && (
        <p style={{ color: "var(--avoid)" }}>無法載入公開頁資料，請稍後再試</p>
      )}
      {charStatus === "success" && projStatus === "success" && isEmpty ? (
        <div className="block" style={{ textAlign: "center", padding: "var(--s7) var(--s5)" }}>
          <p style={{ color: "var(--text-faint)", marginBottom: "var(--s3)" }}>還沒有角色或企劃。</p>
          <Link to="/characters/new" className="btn btn-accent">＋ 建立第一個角色</Link>
        </div>
      ) : charStatus === "success" && projStatus === "success" ? (
        <>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)", marginBottom: "var(--s5)", flexWrap: "wrap" }}>
            {/* Filter pills */}
            <div className="filterbar">
              {([
                ["all",      "全部",   counts.all],
                ["public",   "公開",   counts.public],
                ["unlisted", "限連結", counts.unlisted],
                ["private",  "私人",   counts.private],
              ] as [VisFilter, string, number][]).map(([v, label, ct]) => (
                <button
                  key={v}
                  className={"fbtn" + (filter === v ? " on" : "")}
                  onClick={() => setFilter(v)}
                >
                  {v !== "all" && (
                    <span className="dot" style={{
                      background: v === "public" ? "#27AE60" : v === "unlisted" ? "var(--accent)" : "var(--border-strong)"
                    }} />
                  )}
                  {label}
                  <span className="ct">{ct}</span>
                </button>
              ))}
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 2, background: "var(--surface-2)", padding: 3, borderRadius: "var(--r-md)" }}>
              {(["card", "list"] as ViewMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  title={m === "card" ? "卡片" : "列表"}
                  style={{
                    width: 30, height: 26, border: "none", borderRadius: "var(--r-sm)", cursor: "pointer",
                    display: "grid", placeItems: "center",
                    background: viewMode === m ? "var(--surface)" : "transparent",
                    color: viewMode === m ? "var(--text)" : "var(--text-faint)",
                    boxShadow: viewMode === m ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                    transition: "all .15s",
                  }}
                >
                  {m === "card" ? <IcGrid /> : <IcList />}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy info banner */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "var(--s3) var(--s4)", marginBottom: "var(--s5)",
            background: "var(--accent-soft)", border: "1px solid #ECDFA8",
            borderRadius: "var(--r-card)", fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
            <div>
              點選右側「可見性」按鈕可即時更改隱私。
              <b style={{ color: "var(--accent-ink)" }}>公開</b>可被搜尋，
              <b style={{ color: "var(--accent-ink)" }}>限連結</b>只有拿到網址的人可見，
              <b style={{ color: "var(--accent-ink)" }}>私人</b>只有你可見。
            </div>
          </div>

          {/* Characters section */}
          {filteredChars.length > 0 && (
            <section style={{ marginBottom: "var(--s8)" }}>
              <SectionHeader title="角色" en="Characters" count={filteredChars.length} />
              {viewMode === "card" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
                  {filteredChars.map(c => (
                    <CharCard
                      key={c.id} char={c} origin={origin}
                      onEditSlug={() => c.slug && setSlugEdit({ type: "character", id: c.id, slug: c.slug, prefix: "c" })}
                    />
                  ))}
                </div>
              ) : (
                <div>
                  {filteredChars.map(c => (
                    <CharRow
                      key={c.id} char={c} origin={origin}
                      onEditSlug={() => c.slug && setSlugEdit({ type: "character", id: c.id, slug: c.slug, prefix: "c" })}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Projects section */}
          {filteredProjs.length > 0 && (
            <section>
              <SectionHeader title="企劃" en="Projects" count={filteredProjs.length} />
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
                {filteredProjs.map(p => (
                  <ProjCard
                    key={p.id}
                    proj={p}
                    origin={origin}
                    onEditSlug={() => p.slug && setSlugEdit({ type: "project", id: p.id, slug: p.slug!, prefix: "page" })}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty filter state */}
          {filteredChars.length === 0 && filteredProjs.length === 0 && (
            <div style={{ textAlign: "center", padding: "var(--s8) var(--s5)", color: "var(--text-faint)", fontSize: 14 }}>
              沒有符合篩選條件的項目。
            </div>
          )}
        </>
      ) : null}

      {/* Slug edit modal */}
      {slugEdit && (
        <SlugEditModal
          type={slugEdit.type}
          id={slugEdit.id}
          currentSlug={slugEdit.slug}
          origin={origin}
          prefix={slugEdit.prefix}
          onClose={() => setSlugEdit(null)}
        />
      )}
    </div>
  )
}

// ── Project card ─────────────────────────────────────────────────────────────

function ProjCard({
  proj,
  origin,
  onEditSlug,
}: {
  proj: { id: string; name: string; slug?: string | null; visibility: string; themeColor?: string | null }
  origin: string
  onEditSlug: () => void
}) {
  const [showVis, setShowVis] = useState(false)
  const vis = (proj.visibility ?? "private") as Visibility
  const url = proj.slug && vis !== "private" ? `${origin}/page/${proj.slug}` : null

  return (
    <div className="block" style={{ padding: "var(--s3) var(--s4)", display: "flex", alignItems: "center", gap: "var(--s4)" }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: proj.themeColor ?? "var(--accent)", display: "grid", placeItems: "center",
      }}>
        <span style={{ color: "#fff", fontFamily: "var(--font-serif)", fontWeight: 800, fontSize: 17 }}>{proj.name.slice(0, 1)}</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{proj.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <VisBadge vis={vis} />
          {url ? (
            <a
              href={url} target="_blank" rel="noreferrer"
              style={{ fontSize: 11.5, color: "var(--text-faint)", fontFamily: "var(--font-mono)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}
            >
              /page/{proj.slug}
            </a>
          ) : (
            <span style={{ fontSize: 11.5, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
              {proj.slug ? `/page/${proj.slug}` : "尚無連結"}
            </span>
          )}
          {vis !== "private" && !proj.slug && (
            <button
              onClick={onEditSlug}
              style={{ padding: "2px 8px", borderRadius: "var(--r-btn)", border: "1px solid var(--warn, #e0a83c)", background: "var(--warn-soft, #fdf6e3)", color: "var(--warn-text, #9a6f00)", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
            >
              請設定連結
            </button>
          )}
          {proj.slug && (
            <button
              onClick={onEditSlug}
              title="更改連結"
              style={{ padding: "2px 5px", border: "none", background: "none", color: "var(--text-faint)", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
            >
              <IcPencil />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)", flexShrink: 0 }}>
        {url && <CopyBtn url={url} />}
        <Link to={`/p/${proj.id}/settings`} className="btn btn-sm btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <IcPencil /> 設定
        </Link>
        <div style={{ position: "relative" }}>
          <button
            className={"btn btn-sm" + (showVis ? " btn-accent" : " btn-ghost")}
            onClick={e => { e.stopPropagation(); setShowVis(v => !v) }}
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            {VIS_CONFIG[vis].icon}
            <span style={{ fontSize: 12 }}>{VIS_CONFIG[vis].label}</span>
            <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 8,11 13,6"/></svg>
          </button>
          {showVis && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 70 }} onClick={() => setShowVis(false)} />
              <VisPopover type="project" id={proj.id} current={vis} onClose={() => setShowVis(false)} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
