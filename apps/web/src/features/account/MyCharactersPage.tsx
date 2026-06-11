import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { PageHeader } from "@/components/PageHeader"
import { charColor } from "@/lib/charColor"
import { CharHoverCard } from "@/components/CharHoverCard"
import type { CharacterListResponse, ProjectListResponse } from "@oc-tools/contracts"

export function MyCharactersPage() {
  const qc = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [q, setQ] = useState("")
  const [scope, setScope] = useState<"*" | "none" | string>("*")

  const { data, status } = useQuery({
    queryKey: ["characters"],
    queryFn: () => apiClient<CharacterListResponse>("/api/app/characters"),
  })
  const { data: projData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiClient<ProjectListResponse>("/api/app/projects"),
  })
  const all = data?.characters ?? []
  const projects = projData?.projects ?? []

  const visible = useMemo(() => {
    let list = all.slice()
    if (scope === "none") list = list.filter(c => !c.memberships?.length)
    else if (scope !== "*") list = list.filter(c => c.memberships?.some(m => m.projectId === scope))
    if (q.trim()) {
      const lc = q.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(lc) ||
        (c.species ?? "").toLowerCase().includes(lc) ||
        (c.summary ?? "").toLowerCase().includes(lc) ||
        (c.tags ?? []).some(t => t.toLowerCase().includes(lc))
      )
    }
    return list
  }, [all, scope, q])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/api/app/characters/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["characters"] })
      setDeleteId(null)
    },
  })

  return (
    <div className="page">
      <ContextHeader scope="account" crumbs={["我的角色"]} />
      <PageHeader
        title="我的角色"
        eyebrow="Characters"
        sub="你所有的角色，可跨企劃使用。角色本體永遠屬於你。"
        action={<Link to="/characters/new" className="btn btn-accent">＋ 新角色</Link>}
      />

      {status === "pending" && <p style={{ color: "var(--text-faint)" }}>載入中⋯</p>}
      {status === "error"   && <p style={{ color: "var(--avoid)" }}>無法載入角色</p>}

      {status === "success" && all.length === 0 && (
        <div className="block" style={{ textAlign: "center", padding: "var(--s7) var(--s5)" }}>
          <p style={{ color: "var(--text-faint)", marginBottom: "var(--s4)" }}>還沒有角色，先建立第一隻吧。</p>
          <Link to="/characters/new" className="btn btn-accent">＋ 建立角色</Link>
        </div>
      )}

      {status === "success" && all.length > 0 && (
        <>
          {/* Search */}
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
          </div>

          {/* Project filter */}
          <div className="filterbar" style={{ marginBottom: "var(--s5)" }}>
            <button className={"fbtn" + (scope === "*" ? " on" : "")} onClick={() => setScope("*")}>
              全部 <span className="ct">{all.length}</span>
            </button>
            <button className={"fbtn" + (scope === "none" ? " on" : "")} onClick={() => setScope("none")}>
              未加入企劃 <span className="ct">{all.filter(c => !c.memberships?.length).length}</span>
            </button>
            {projects.map(p => {
              const ct = all.filter(c => c.memberships?.some(m => m.projectId === p.id)).length
              return (
                <button key={p.id} className={"fbtn" + (scope === p.id ? " on" : "")} onClick={() => setScope(p.id)}>
                  <span className="dot" style={{ background: p.themeColor ?? "#8A857C" }} />
                  {p.name}
                  <span className="ct">{ct}</span>
                </button>
              )
            })}
          </div>

          {visible.length === 0 && (
            <p style={{ color: "var(--text-faint)", fontSize: 14 }}>找不到符合的角色。</p>
          )}

          <div className="cc-grid">
            {visible.map(character => {
              const color = charColor(character.id)
              const memberships = character.memberships ?? []
              return (
                <div key={character.id} className="cc">
                  {/* floating project badges */}
                  {memberships.length > 0 && (
                    <div className="cc-badges">
                      {memberships.slice(0, 2).map(m => (
                        <span key={m.projectId} className="cc-badge">
                          <span className="d" style={{ background: m.projectColor }} />
                          {m.projectName}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* clickable portrait area */}
                  <CharHoverCard character={character}>
                  <Link to={`/characters/${character.id}`} className="cc-inner">
                    <div className="cc-pic">
                      {character.avatarUrl
                        ? <img src={character.avatarUrl} alt={character.name} className="cc-av-img" />
                        : <div className="av" style={{ background: color }}>{character.name.slice(0, 1)}</div>
                      }
                    </div>
                    <div className="cc-info">
                      <div className="cc-nm">{character.name}</div>
                      {character.species && <div className="cc-sp">{character.species}</div>}
                    </div>
                  </Link>
                  </CharHoverCard>

                  {/* action bar — slides up on hover */}
                  <div className="cc-acts" style={{ background: color }}>
                    <Link to={`/characters/${character.id}`} className="qbtn">查看</Link>
                    <Link to={`/characters/${character.id}/edit`} className="qbtn">編輯</Link>
                    <button
                      className="qbtn"
                      onClick={() => { setDeleteId(character.id); setDeleteName(character.name) }}
                    >刪除</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-h">
              <h2>刪除「{deleteName}」？</h2>
              <button className="modal-close" onClick={() => setDeleteId(null)}>✕</button>
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
