import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { PageHeader } from "@/components/PageHeader"
import { charColor } from "@/lib/charColor"
import type { CharacterListResponse, ProjectListResponse } from "@oc-tools/contracts"

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button className="btn btn-sm btn-ghost" onClick={copy} style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
      {copied ? "已複製 ✓" : "複製連結"}
    </button>
  )
}

const VIS_LABEL: Record<string, { label: string; color: string }> = {
  public:   { label: "公開", color: "var(--must)" },
  unlisted: { label: "不列於搜尋", color: "var(--text-faint)" },
}

export function PublicPagesPage() {
  const { data: charData } = useQuery({
    queryKey: ["characters"],
    queryFn: () => apiClient<CharacterListResponse>("/api/app/characters"),
  })
  const { data: projData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiClient<ProjectListResponse>("/api/app/projects"),
  })

  const chars  = (charData?.characters  ?? []).filter(c => c.visibility !== "private" && c.slug)
  const projs  = (projData?.projects    ?? []).filter(p => p.visibility !== "private" && p.slug)
  const origin = window.location.origin

  return (
    <div className="page narrow">
      <ContextHeader scope="account" crumbs={["我的公開頁"]} />
      <PageHeader
        title="我的公開頁"
        eyebrow="Public Pages"
        sub="所有公開或不列於搜尋的角色與企劃，可直接複製連結分享。"
      />

      {chars.length === 0 && projs.length === 0 && (
        <div className="block" style={{ textAlign: "center", padding: "var(--s7) var(--s5)" }}>
          <p style={{ color: "var(--text-faint)", marginBottom: "var(--s4)" }}>
            還沒有公開的角色或企劃。
          </p>
          <p style={{ fontSize: 13, color: "var(--text-faint)" }}>
            在角色編輯頁或企劃設定頁將能見度改為「公開」即可分享。
          </p>
        </div>
      )}

      {chars.length > 0 && (
        <section style={{ marginBottom: "var(--s8)" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 800, marginBottom: "var(--s4)" }}>
            角色
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
            {chars.map(c => {
              const url = `${origin}/c/${c.slug}`
              const vis = VIS_LABEL[c.visibility] ?? { label: c.visibility, color: "var(--text-faint)" }
              return (
                <div key={c.id} className="block" style={{ display: "flex", alignItems: "center", gap: "var(--s4)", padding: "var(--s3) var(--s4)" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0, overflow: "hidden",
                    background: charColor(c.id), display: "grid", placeItems: "center",
                  }}>
                    {c.avatarUrl
                      ? <img src={c.avatarUrl} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ color: "#fff", fontFamily: "var(--font-serif)", fontWeight: 800, fontSize: 16 }}>{c.name.slice(0, 1)}</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: vis.color, fontWeight: 600 }}>{vis.label}</span>
                      <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: "var(--font-mono)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>
                        /c/{c.slug}
                      </a>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "var(--s2)", flexShrink: 0 }}>
                    <Link to={`/characters/${c.id}/edit`} className="btn btn-sm btn-ghost">編輯</Link>
                    <CopyButton url={url} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {projs.length > 0 && (
        <section>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 800, marginBottom: "var(--s4)" }}>
            企劃
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
            {projs.map(p => {
              const url = `${origin}/page/${p.slug}`
              const vis = VIS_LABEL[p.visibility] ?? { label: p.visibility, color: "var(--text-faint)" }
              return (
                <div key={p.id} className="block" style={{ display: "flex", alignItems: "center", gap: "var(--s4)", padding: "var(--s3) var(--s4)" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: p.themeColor ?? "var(--accent)", display: "grid", placeItems: "center",
                  }}>
                    <span style={{ color: "#fff", fontFamily: "var(--font-serif)", fontWeight: 800, fontSize: 16 }}>{p.name.slice(0, 1)}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: vis.color, fontWeight: 600 }}>{vis.label}</span>
                      <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: "var(--font-mono)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>
                        /page/{p.slug}
                      </a>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "var(--s2)", flexShrink: 0 }}>
                    <Link to={`/p/${p.id}/settings`} className="btn btn-sm btn-ghost">設定</Link>
                    <CopyButton url={url} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
