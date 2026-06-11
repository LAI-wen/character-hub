import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { PageHeader } from "@/components/PageHeader"
import type { ProjectListResponse, ProjectResponse } from "@oc-tools/contracts"

const VIS_LABELS: Record<string, string> = {
  public: "公開", unlisted: "限連結", private: "私人",
}
const THEME_COLORS = [
  "#8A857C","#3B5E6B","#5E7E55","#8B5E3C","#7B5EA7",
  "#B5654A","#9E332B","#4A7B8C","#6B4A1E","#C9A24B",
]

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

export function MyProjectsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [name, setName]       = useState("")
  const [desc, setDesc]       = useState("")
  const [color, setColor]     = useState(THEME_COLORS[0])
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, status } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiClient<ProjectListResponse>("/api/app/projects"),
  })
  const projects = data?.projects ?? []

  const createMutation = useMutation({
    mutationFn: () => {
      const s = slugify(name.trim())
      return apiClient<ProjectResponse>("/api/app/projects", {
        method: "POST",
        body: { name: name.trim(), ...(s ? { slug: s } : {}), description: desc.trim() || undefined, themeColor: color },
      })
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["projects"] })
      setShowModal(false)
      setName(""); setDesc(""); setColor(THEME_COLORS[0])
      navigate(`/p/${res.project.id}/overview`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/api/app/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] })
      setDeleteId(null)
    },
  })

  return (
    <div className="page">
      <ContextHeader scope="account" crumbs={["我的企劃"]} />
      <PageHeader
        title="我的企劃"
        eyebrow="Projects"
        sub="每個企劃是一個獨立的宇宙——角色、世界觀、關係、故事都歸屬其中。"
        action={
          <button className="btn btn-accent" onClick={() => setShowModal(true)}>＋ 建立企劃</button>
        }
      />

      {status === "pending" && <p style={{ color: "var(--text-faint)" }}>載入中⋯</p>}
      {status === "error"   && <p style={{ color: "var(--avoid)" }}>無法載入企劃</p>}

      {status === "success" && projects.length === 0 && (
        <button className="newp" onClick={() => setShowModal(true)}>
          <span className="plus">＋</span>
          建立第一個企劃
        </button>
      )}

      {status === "success" && projects.length > 0 && (
        <div className="mp-grid">
          {projects.map(project => {
            const col = project.themeColor ?? "#8A857C"
            const visLabel = VIS_LABELS[project.visibility] ?? project.visibility
            const visClass = project.visibility === "public" ? "badge public" : "badge"
            const visDot = project.visibility === "public" ? "var(--must)" : "var(--text-faint)"
            const collabLabel = project.collaborationMode === "open" ? "公開招募"
              : project.collaborationMode === "closed" ? "私人共創" : "個人企劃"
            return (
              <div key={project.id} className="mp">
                <div className="mp-cv" style={{ background: col }}>
                  <span className="mp-mk" style={{ background: col }}>{project.name.slice(0, 1)}</span>
                </div>
                <div className="mp-bd">
                  <div className="mp-hh">
                    <span className="mp-nm">{project.name}</span>
                    <span className="mp-en">{project.slug}</span>
                  </div>
                  {project.description
                    ? <div className="mp-bl">{project.description}</div>
                    : <div className="mp-bl" style={{ color: "var(--text-faint)", fontStyle: "italic" }}>尚無說明</div>
                  }
                  <div className="mp-badges">
                    <span className={visClass}>
                      <span className="d" style={{ background: visDot }} />{visLabel}
                    </span>
                    <span className="badge">{collabLabel}</span>
                  </div>
                  <div className="mp-go">
                    <Link to={`/p/${project.id}/overview`} className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>進入企劃</Link>
                    <Link to={`/p/${project.id}/settings`} className="btn btn-ghost">設定</Link>
                    <button className="btn btn-ghost" style={{ color: "var(--avoid)" }} onClick={() => setDeleteId(project.id)}>刪除</button>
                  </div>
                </div>
              </div>
            )
          })}
          <button className="newp" onClick={() => setShowModal(true)}>
            <span className="plus">＋</span>
            建立新企劃
          </button>
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-h">
              <h2>建立新企劃</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="set-row set-row-compact" style={{ paddingTop: 0 }}>
                <label className="set-lab">企劃名稱</label>
                <div className="set-ctl">
                  <input
                    className="inp"
                    autoFocus
                    placeholder="我的企劃"
                    value={name}
                    maxLength={100}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && name.trim()) createMutation.mutate() }}
                  />
                </div>
              </div>
              <div className="set-row" style={{ borderBottom: "none" }}>
                <label className="set-lab">說明（選填）</label>
                <div className="set-ctl">
                  <textarea
                    className="inp"
                    rows={2}
                    placeholder="簡短介紹這個企劃…"
                    value={desc}
                    maxLength={200}
                    onChange={e => setDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="set-row set-row-compact" style={{ borderBottom: "none" }}>
                <label className="set-lab">主題色</label>
                <div className="set-ctl">
                  <div className="set-swatches">
                    {THEME_COLORS.map(c => (
                      <button
                        key={c}
                        className={"set-swatch" + (color === c ? " on" : "")}
                        style={{ background: c }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {createMutation.isError && (
                <p style={{ color: "var(--avoid)", fontSize: 13 }}>建立失敗，請再試一次。</p>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>取消</button>
              <button
                className="btn btn-accent"
                disabled={!name.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "建立中…" : "建立企劃"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-h">
              <h2>刪除企劃？</h2>
              <button className="modal-close" onClick={() => setDeleteId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "var(--text-dim)" }}>
                企劃將被封存，角色與世界觀資料不會消失。此動作目前無法復原。
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
