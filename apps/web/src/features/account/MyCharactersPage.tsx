import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { PageHeader } from "@/components/PageHeader"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { charColor } from "@/lib/charColor"
import { timeAgo } from "@/lib/formatDate"
import type { CharacterListResponse, CharacterWithMemberships } from "@oc-tools/contracts"

type ViewMode = "card" | "list"
type VisFilter = "all" | "public" | "unlisted" | "private"

const VIS_DOT: Record<string, { label: string; color: string }> = {
  public:   { label: "公開",   color: "#27AE60" },
  unlisted: { label: "限連結", color: "var(--accent)" },
  private:  { label: "私人",   color: "var(--border-strong)" },
}


type Group = {
  id: string
  name: string
  color: string
  chars: CharacterWithMemberships[]
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function IcGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}

function IcList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}

// ── Character card (existing style) ────────────────────────────────────────────

function CharCard({ character, onDelete }: { character: CharacterWithMemberships; onDelete: () => void }) {
  const color = character.themeColor ?? charColor(character.id)
  const memberships = character.memberships ?? []
  const vis = VIS_DOT[character.visibility] ?? VIS_DOT.private
  const gp = (character.generalProfile ?? {}) as Record<string, unknown>
  const albums = (gp.albums ?? []) as Array<{ images?: unknown[] }>
  const imgCount = albums.reduce((sum, a) => sum + (a.images?.length ?? 0), 0)
  const tagCount = (character.tags ?? []).length

  return (
    <div className="cc" style={{ "--char-color": color } as React.CSSProperties}>
      {/* Top overlay badges */}
      <div className="cc-badges">
        {/* Visibility badge — left */}
        <span className="cc-badge" style={{ marginRight: "auto" }}>
          <span className="d" style={{ background: vis.color }} />
          {vis.label}
        </span>
        {/* Project badges — right */}
        {memberships.slice(0, 1).map(m => (
          <span key={m.projectId} className="cc-badge">
            <span className="d" style={{ background: m.projectColor }} />
            {m.projectName}
          </span>
        ))}
      </div>
      <Link to={`/characters/${character.id}`} className="cc-inner">
        <div className="cc-pic">
          {character.avatarUrl
            ? <img src={character.avatarUrl} alt={character.name} className="cc-av-img" />
            : <div className="av" style={{ background: color }}>{character.name.slice(0, 1)}</div>
          }
        </div>
        <div className="cc-info">
          <div className="cc-nm">{character.name}</div>
          <div className="cc-sp">
            {character.romaji && <span style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>{character.romaji.toUpperCase()}</span>}
            {character.romaji && character.species && <span style={{ opacity: 0.5 }}> · </span>}
            {character.species && <span>{character.species}</span>}
          </div>
          {/* Stats row */}
          <div style={{ display: "flex", gap: 8, marginTop: 5, fontSize: 11, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
            {tagCount > 0 && <span>{tagCount}標籤</span>}
            {imgCount > 0 && <span>{imgCount}圖</span>}
            {character.updatedAt && <span style={{ marginLeft: "auto" }}>{timeAgo(character.updatedAt)}</span>}
          </div>
        </div>
      </Link>
      <div className="cc-acts">
        <Link to={`/characters/${character.id}`} className="qbtn">查看</Link>
        <Link to={`/characters/${character.id}/edit`} className="qbtn">編輯</Link>
        <button className="qbtn" onClick={onDelete}>刪除</button>
      </div>
    </div>
  )
}

// ── Character list row ──────────────────────────────────────────────────────────

function CharRow({ character, onDelete }: { character: CharacterWithMemberships; onDelete: () => void }) {
  const color = character.themeColor ?? charColor(character.id)
  const vis = VIS_DOT[character.visibility] ?? VIS_DOT.private

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "var(--s3)",
      padding: "10px 14px",
      border: "1px solid var(--border)", borderRadius: "var(--r-card)",
      background: "var(--surface)", marginBottom: "var(--s2)",
      transition: "box-shadow .15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "var(--sh-1)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
    >
      {/* Avatar */}
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: color, flexShrink: 0, overflow: "hidden", display: "grid", placeItems: "center" }}>
        {character.avatarUrl
          ? <img src={character.avatarUrl} alt={character.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 15, color: "#fff" }}>{character.name.slice(0, 1)}</span>
        }
      </div>

      {/* Name + romaji + species */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {character.name}
          {character.romaji && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, color: "var(--text-faint)", marginLeft: 6, letterSpacing: "0.05em" }}>{character.romaji.toUpperCase()}</span>}
        </div>
        {character.species && <div style={{ fontSize: 12, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{character.species}</div>}
      </div>

      {/* Tags */}
      {(character.tags ?? []).length > 0 && (
        <div style={{ display: "flex", gap: 4, flexShrink: 0, flexWrap: "wrap", maxWidth: 180 }}>
          {(character.tags ?? []).slice(0, 3).map(tag => (
            <span key={tag} style={{ fontSize: 11, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-pill)", padding: "1px 7px", color: "var(--text-dim)" }}>{tag}</span>
          ))}
        </div>
      )}

      {/* Visibility badge */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--text-faint)", flexShrink: 0 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: vis.color, flexShrink: 0 }} />
        {vis.label}
      </span>

      {/* Time */}
      {character.updatedAt && (
        <span style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
          {timeAgo(character.updatedAt)}
        </span>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "var(--s2)", flexShrink: 0 }}>
        <Link to={`/characters/${character.id}`} className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }}>查看</Link>
        <Link to={`/characters/${character.id}/edit`} className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }}>編輯</Link>
        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 10px", color: "var(--avoid)" }} onClick={onDelete}>刪除</button>
      </div>
    </div>
  )
}

// ── Group header ────────────────────────────────────────────────────────────────

function GroupHeader({ name, color, count }: { name: string; color: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)", marginBottom: "var(--s4)", marginTop: "var(--s2)" }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 15 }}>{name}</span>
      <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{count} 個</span>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────────

export function MyCharactersPage() {
  const qc = useQueryClient()
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [q, setQ]                   = useState("")
  const [viewMode, setViewMode]     = useState<ViewMode>("card")
  const [visFilter, setVisFilter]   = useState<VisFilter>("all")
  const [sortBy, setSortBy]         = useState<"name" | "updated">("updated")

  const { data, status } = useQuery({
    queryKey: ["characters"],
    queryFn: () => apiClient<CharacterListResponse>("/api/app/characters"),
  })
  const all = data?.characters ?? []

  const visible = useMemo(() => {
    let result = all
    if (q.trim()) {
      const lc = q.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(lc) ||
        (c.species ?? "").toLowerCase().includes(lc) ||
        (c.summary ?? "").toLowerCase().includes(lc) ||
        (c.tags ?? []).some(t => t.toLowerCase().includes(lc))
      )
    }
    if (visFilter !== "all") {
      result = result.filter(c => c.visibility === visFilter)
    }
    if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, "zh-TW"))
    }
    return result
  }, [all, q, visFilter, sortBy])

  const visCounts = useMemo(() => ({
    all: all.length,
    public: all.filter(c => c.visibility === "public").length,
    unlisted: all.filter(c => c.visibility === "unlisted").length,
    private: all.filter(c => c.visibility === "private").length,
  }), [all])

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const char of visible) {
      const memberships = char.memberships ?? []
      if (memberships.length === 0) {
        if (!map.has("__none__")) map.set("__none__", { id: "__none__", name: "未加入企劃", color: "#8A857C", chars: [] })
        map.get("__none__")!.chars.push(char)
      } else {
        for (const m of memberships) {
          if (!map.has(m.projectId)) map.set(m.projectId, { id: m.projectId, name: m.projectName, color: m.projectColor, chars: [] })
          map.get(m.projectId)!.chars.push(char)
        }
      }
    }
    const result = [...map.entries()].filter(([k]) => k !== "__none__").map(([, v]) => v)
    if (map.has("__none__")) result.push(map.get("__none__")!)
    return result
  }, [visible])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/api/app/characters/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["characters"] })
      setDeleteId(null)
    },
  })

  function confirmDelete(id: string, name: string) {
    setDeleteId(id)
    setDeleteName(name)
  }

  return (
    <div className="page">
      <ContextHeader scope="account" crumbs={["我的角色"]} />
      <PageHeader
        title="我的角色"
        eyebrow="Characters"
        sub="你所有的角色，可跨企劃使用。角色本體永遠屬於你。"
        action={<Link to="/characters/new" className="btn btn-accent">＋ 新角色</Link>}
      />

      {status === "pending" && <LoadingSpinner />}
      {status === "error"   && <p style={{ color: "var(--avoid)" }}>無法載入角色</p>}

      {status === "success" && all.length === 0 && (
        <div className="block" style={{ textAlign: "center", padding: "var(--s7) var(--s5)" }}>
          <p style={{ color: "var(--text-faint)", marginBottom: "var(--s4)" }}>還沒有角色，先建立第一隻吧。</p>
          <Link to="/characters/new" className="btn btn-accent">＋ 建立角色</Link>
        </div>
      )}

      {status === "success" && all.length > 0 && (
        <>
          {/* Visibility filter pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "var(--s4)" }}>
            {([
              ["all",      "全部",   visCounts.all      ],
              ["public",   "公開",   visCounts.public   ],
              ["unlisted", "限連結", visCounts.unlisted ],
              ["private",  "私人",   visCounts.private  ],
            ] as [VisFilter, string, number][]).map(([v, label, ct]) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisFilter(v)}
                style={{
                  fontFamily: "inherit", fontSize: 13, fontWeight: visFilter === v ? 700 : 500,
                  padding: "6px 14px", borderRadius: "var(--r-pill)",
                  border: visFilter === v ? "1.5px solid var(--text)" : "1.5px solid var(--border)",
                  background: visFilter === v ? "var(--text)" : "var(--surface)",
                  color: visFilter === v ? "#fff" : "var(--text-dim)",
                  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                  transition: "all .14s",
                }}
              >
                {label}
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                  background: visFilter === v ? "rgba(255,255,255,.25)" : "var(--surface-2)",
                  borderRadius: "var(--r-pill)", padding: "1px 6px",
                }}>{ct}</span>
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="cc-toolbar">
            <div className="cc-search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                type="search"
                placeholder="搜尋角色…"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>
            <span className="cc-count">{visible.length} / {all.length}</span>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as "name" | "updated")}
              style={{
                fontFamily: "inherit", fontSize: 12.5, padding: "6px 10px",
                border: "1px solid var(--border)", borderRadius: "var(--r-md)",
                background: "var(--surface)", color: "var(--text-dim)",
                cursor: "pointer", outline: "none",
              }}
            >
              <option value="updated">排序：最近編輯</option>
              <option value="name">排序：名稱</option>
            </select>

            {/* View toggle */}
            <div style={{ display: "flex", gap: 2, background: "var(--surface-2)", padding: 3, borderRadius: "var(--r-md)", marginLeft: "auto" }}>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                title="卡片檢視"
                style={{
                  width: 32, height: 28, border: "none", borderRadius: "var(--r-sm)", cursor: "pointer",
                  display: "grid", placeItems: "center",
                  background: viewMode === "card" ? "var(--surface)" : "transparent",
                  color: viewMode === "card" ? "var(--text)" : "var(--text-faint)",
                  boxShadow: viewMode === "card" ? "0 1px 4px rgba(0,0,0,.08)" : "none",
                  transition: "all .15s",
                }}
              ><IcGrid /></button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="列表檢視"
                style={{
                  width: 32, height: 28, border: "none", borderRadius: "var(--r-sm)", cursor: "pointer",
                  display: "grid", placeItems: "center",
                  background: viewMode === "list" ? "var(--surface)" : "transparent",
                  color: viewMode === "list" ? "var(--text)" : "var(--text-faint)",
                  boxShadow: viewMode === "list" ? "0 1px 4px rgba(0,0,0,.08)" : "none",
                  transition: "all .15s",
                }}
              ><IcList /></button>
            </div>
          </div>

          {visible.length === 0 && (
            <p style={{ color: "var(--text-faint)", fontSize: 14 }}>找不到符合的角色。</p>
          )}

          {/* Grouped sections */}
          {groups.map(group => (
            <div key={group.id} style={{ marginBottom: "var(--s8)" }}>
              <GroupHeader name={group.name} color={group.color} count={group.chars.length} />
              {viewMode === "card" ? (
                <div className="cc-grid">
                  {group.chars.map(char => (
                    <CharCard key={char.id} character={char} onDelete={() => confirmDelete(char.id, char.name)} />
                  ))}
                </div>
              ) : (
                <div>
                  {group.chars.map(char => (
                    <CharRow key={char.id} character={char} onDelete={() => confirmDelete(char.id, char.name)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* Delete modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-h">
              <h2>刪除「{deleteName}」？</h2>
              <button className="modal-close" aria-label="關閉" onClick={() => setDeleteId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "var(--text-dim)" }}>
                角色將被封存。企劃中的設定資料不會消失，但角色將從所有企劃移除。
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>取消</button>
              <button
                className="btn"
                style={{ background: "var(--avoid)", color: "#fff" }}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId)}
              >
                {deleteMutation.isPending ? "刪除中…" : "確認刪除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
