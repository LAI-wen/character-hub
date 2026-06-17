import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { ContextHeader } from "@/components/ContextHeader"
import { PageHeader } from "@/components/PageHeader"
import { apiClient } from "@/lib/api/client"
import type { AssetListResponse, Asset } from "@oc-tools/contracts"
import { Icon } from "@/components/Icon"

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export function GlobalGalleryPage() {
  const [q, setQ] = useState("")
  const [scopeFilter, setScopeFilter] = useState<string>("*")
  const [preview, setPreview] = useState<Asset | null>(null)

  const { data, status } = useQuery({
    queryKey: ["assets", "global"],
    queryFn: () => apiClient<AssetListResponse>("/api/app/assets"),
  })

  const assets = data?.assets ?? []
  const totalBytes = data?.totalBytes ?? assets.reduce((s, a) => s + (a.sizeBytes ?? 0), 0)

  const projects = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of assets) {
      if (a.projectId && a.projectName) map.set(a.projectId, a.projectName)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [assets])

  const filtered = useMemo(() => {
    let list = assets
    if (scopeFilter !== "*") list = list.filter(a => a.projectId === scopeFilter || (scopeFilter === "__none" && !a.projectId))
    if (q.trim()) {
      const lc = q.toLowerCase()
      list = list.filter(a => a.title.toLowerCase().includes(lc))
    }
    return list
  }, [assets, scopeFilter, q])

  return (
    <div className="page">
      <ContextHeader scope="account" crumbs={["全域圖庫"]} />
      <PageHeader
        eyebrow="Gallery"
        title="全域圖庫"
        sub="你所有企劃的圖片一覽。"
        action={
          totalBytes > 0
            ? <span style={{ fontSize: 13, color: "var(--text-faint)" }}>已使用 {fmtBytes(totalBytes)}</span>
            : undefined
        }
      />

      {status === "pending" && <LoadingSpinner />}
      {status === "error" && <p style={{ color: "var(--avoid)" }}>無法載入圖庫</p>}

      {status === "success" && assets.length === 0 && (
        <div className="block" style={{ textAlign: "center", padding: "var(--s7) var(--s5)" }}>
          <p style={{ color: "var(--text-faint)", marginBottom: "var(--s4)" }}>還沒有任何圖片。在企劃圖庫或角色頭像上傳圖片後會出現在這裡。</p>
          <Link to="/projects" className="btn btn-accent">前往我的企劃</Link>
        </div>
      )}

      {status === "success" && assets.length > 0 && (
        <div className="gl-cols">
          {/* Filter sidebar */}
          <div className="gl-filter">
            <div className="fg">
              <div className="ft">來源企劃</div>
              <button className={"opt" + (scopeFilter === "*" ? " on" : "")} onClick={() => setScopeFilter("*")}>
                全部 <span className="ct">{assets.length}</span>
              </button>
              {projects.map(p => (
                <button
                  key={p.id}
                  className={"opt" + (scopeFilter === p.id ? " on" : "")}
                  onClick={() => setScopeFilter(p.id)}
                >
                  {p.name}
                  <span className="ct">{assets.filter(a => a.projectId === p.id).length}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main area */}
          <div className="gl-main">
            <div className="gl-toolbar">
              <div className="searchf" style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Icon name="search" size={15} style={{ position: "absolute", left: 11, color: "var(--text-faint)", pointerEvents: "none" }} />
                <input
                  type="search"
                  placeholder="搜尋圖片…"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />
              </div>
              <div className="spacer" />
              <span className="gl-count">{filtered.length} 張</span>
            </div>

            <div className="gl-grid">
              {filtered.map(a => (
                <button key={a.id} className="acard" onClick={() => setPreview(a)}>
                  <div className="thumb">
                    <img src={a.url} alt={a.title} loading="lazy" />
                  </div>
                  <div className="pad">
                    <div className="t">{a.title}</div>
                    {a.projectName && (
                      <div className="sub" style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{a.projectName}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {preview && (
        <div className="gal-lb" onClick={() => setPreview(null)}>
          <div className="gal-lb-box" onClick={e => e.stopPropagation()}>
            <button className="gal-lb-close" onClick={() => setPreview(null)}><Icon name="x" size={16} /></button>
            <img src={preview.url} alt={preview.title} />
            <div className="gal-lb-foot">
              <div>
                <div style={{ fontWeight: 600 }}>{preview.title}</div>
                {preview.projectName && (
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{preview.projectName}</div>
                )}
                {preview.sizeBytes && (
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{fmtBytes(preview.sizeBytes)}</div>
                )}
              </div>
              {preview.projectId && (
                <Link
                  to={`/p/${preview.projectId}/gallery`}
                  className="btn btn-sm"
                  onClick={() => setPreview(null)}
                >
                  前往企劃圖庫
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
