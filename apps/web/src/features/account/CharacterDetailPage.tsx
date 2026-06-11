import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useParams, useNavigate } from "react-router-dom"
import { recordView } from "@/lib/recentlyViewed"

function CopyUrlButton({ url, label = "複製網址" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="btn btn-ghost"
      style={{ fontSize: 13 }}
      onClick={() => {
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }}
    >
      {copied ? "✓ 已複製" : label}
    </button>
  )
}
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import type { CharacterResponse } from "@oc-tools/contracts"

const PALETTE = ["#4A6FA5","#C0392B","#27AE60","#8E44AD","#E67E22","#16A085","#2C3E50","#7F8C8D","#D35400","#1A5276"]
function charColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

const VIS: Record<string, { label: string; variant: string }> = {
  public:   { label: "公開",   variant: "public" },
  unlisted: { label: "限連結", variant: "unlisted" },
  private:  { label: "私人",   variant: "private" },
}

export function CharacterDetailPage() {
  const { charId } = useParams<{ charId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showDelete, setShowDelete] = useState(false)

  const { data, status } = useQuery({
    queryKey: ["character", charId],
    queryFn: () => apiClient<CharacterResponse>(`/api/app/characters/${charId}`),
    enabled: !!charId,
  })

  const deleteMutation = useMutation({
    mutationFn: () => apiClient(`/api/app/characters/${charId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["characters"] })
      navigate("/characters")
    },
  })

  const character = data?.character
  useEffect(() => {
    if (!character) return
    recordView({ type: "char", id: character.id, name: character.name, path: `/characters/${character.id}`, color: charColor(character.id), imgUrl: character.avatarUrl ?? undefined })
  }, [character?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "pending") return <div className="page"><p style={{ color: "var(--text-faint)" }}>載入中⋯</p></div>
  if (status === "error")   return <div className="page"><p style={{ color: "var(--avoid)" }}>找不到角色</p></div>
  if (!character) return null
  const color = charColor(character.id)
  const vis = VIS[character.visibility] ?? VIS.private

  return (
    <div className="page">
      <ContextHeader scope="account" crumbs={["我的角色", character.name]} />

      <div className="ch-head">
        <div className="av" style={{ background: color }}>
          {character.name.slice(0, 1)}
        </div>
        <div className="id">
          <h1>{character.name}</h1>
          {character.species && <p className="tagline">{character.species}</p>}
          <div className="meta">
            <span className={`vis-b ${vis.variant}`}>
              <span className="d" />{vis.label}
            </span>
            {(character.tags ?? []).map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </div>
        <div className="acts">
          <Link to={`/characters/${charId}/edit`} className="btn btn-accent">編輯角色</Link>
          {character.visibility !== "private" && (
            <CopyUrlButton url={`${window.location.origin}/c/${character.slug}`} label="複製公開網址" />
          )}
          <button className="btn btn-ghost" style={{ color: "var(--avoid)" }} onClick={() => setShowDelete(true)}>刪除</button>
        </div>
      </div>

      {character.summary && (
        <div className="block" style={{ marginBottom: "var(--s5)" }}>
          <div className="bh">簡介</div>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-dim)", whiteSpace: "pre-wrap" }}>
            {character.summary}
          </p>
        </div>
      )}

      {showDelete && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-h">
              <h2>刪除「{character.name}」？</h2>
              <button className="modal-close" onClick={() => setShowDelete(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "var(--text-dim)" }}>
                角色將被封存，企劃中的設定資料不會消失。
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowDelete(false)}>取消</button>
              <button
                className="btn"
                style={{ background: "var(--avoid)", color: "#fff" }}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
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
