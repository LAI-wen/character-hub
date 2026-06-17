import { useEffect, useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import { ContextHeader } from "@/components/ContextHeader"
import { apiClient } from "@/lib/api/client"
import { compressImage } from "@/lib/compressImage"
import type { AssetListResponse, Asset } from "@oc-tools/contracts"
import { Icon } from "@/components/Icon"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { fmtDate } from "@/lib/formatDate"

// ── Detail Drawer ────────────────────────────────────────────────────────────

function AssetDrawer({
  asset,
  onClose,
  onOpenLightbox,
  onDelete,
}: {
  asset: Asset
  onClose: () => void
  onOpenLightbox: () => void
  onDelete: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const sizeKB = asset.sizeBytes ? `${Math.round(asset.sizeBytes / 1024)} KB` : null
  const dims   = asset.width && asset.height ? `${asset.width}×${asset.height}` : null

  return (
    <>
      <div className="ad-scrim in" onClick={onClose} />
      <aside className="ad-drawer in" role="dialog" aria-modal aria-label={asset.title}>
        <div className="dh">
          <div className="t">{asset.title}</div>
          <button className="x" aria-label="關閉" onClick={onClose}>✕</button>
        </div>

        <div className="db">
          {/* big preview — click to open lightbox */}
          <div
            className="ad-big"
            role="img"
            aria-label={asset.title}
            onClick={onOpenLightbox}
            style={{ cursor: "zoom-in", background: "var(--bg-tint)", overflow: "hidden" }}
          >
            <img
              src={asset.url}
              alt={asset.title}
              style={{ width: "100%", maxHeight: 220, objectFit: "contain", display: "block", borderRadius: "var(--r-img)" }}
            />
          </div>

          <div className="ad-field">
            <div className="k">標題</div>
            <div className="v">{asset.title}</div>
          </div>

          {(dims || asset.mimeType || sizeKB) && (
            <div className="ad-field">
              <div className="k">尺寸／格式／大小</div>
              <div className="v">{[dims, asset.mimeType, sizeKB].filter(Boolean).join(" · ")}</div>
            </div>
          )}

          <div className="ad-attr">
            <div className="b">
              <div className="k">Creator 作者</div>
              <div className="v">
                {asset.authorName || <span style={{ color: "var(--accent-ink)" }}>未署名</span>}
              </div>
            </div>
            <div className="b">
              <div className="k">Type 分類</div>
              <div className="v">{asset.assetType || "—"}</div>
            </div>
            <div className="b">
              <div className="k">上傳時間</div>
              <div className="v">{fmtDate(asset.createdAt)}</div>
            </div>
          </div>

          {asset.sourceUrl && (
            <div className="ad-field">
              <div className="k">原始來源</div>
              <div className="v">
                <a href={asset.sourceUrl} target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--accent-ink)", wordBreak: "break-all", fontSize: 13 }}>
                  {asset.sourceUrl}
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="df">
          <button
            className="btn btn-sm"
            style={{ borderColor: "var(--avoid)", color: "var(--avoid)" }}
            onClick={onDelete}
          >
            刪除圖片
          </button>
          <span style={{ flex: 1 }} />
          <button className="btn btn-sm" onClick={onOpenLightbox}>
            全螢幕查看
          </button>
        </div>
      </aside>
    </>
  )
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  list,
  startIdx,
  onClose,
}: {
  list: Asset[]
  startIdx: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(startIdx)
  const a = list[idx]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowLeft")  setIdx(i => (i - 1 + list.length) % list.length)
      else if (e.key === "ArrowRight") setIdx(i => (i + 1) % list.length)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, list.length])

  return (
    <div className="lb-scrim in" onClick={onClose}>
      <button className="lb-close" aria-label="關閉" onClick={onClose}>✕</button>
      {list.length > 1 && (
        <>
          <button className="lb-nav prev" aria-label="上一張"
            onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + list.length) % list.length) }}>
            ‹
          </button>
          <button className="lb-nav next" aria-label="下一張"
            onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % list.length) }}>
            ›
          </button>
        </>
      )}
      <div className="lb-stage" onClick={e => e.stopPropagation()}>
        <img
          src={a.url}
          alt={a.title}
          style={{ maxWidth: "86vw", maxHeight: "70vh", objectFit: "contain", borderRadius: "var(--r-img)", display: "block" }}
        />
        <div className="lb-cap">
          {a.title}
          {a.authorName ? ` · ${a.authorName}` : ""}
          {list.length > 1 ? ` · ${idx + 1}/${list.length}` : ""}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function GalleryPage() {
  const { project } = useProjectContext()
  const qc = useQueryClient()
  const pid = project.id
  const fileRef = useRef<HTMLInputElement>(null)

  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [q,           setQ]           = useState("")
  const [layout,      setLayout]      = useState<"grid" | "masonry">("grid")
  const [filterType,  setFilterType]  = useState("*")

  const [multi,    setMulti]    = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const [drawerAsset,  setDrawerAsset]  = useState<Asset | null>(null)
  const [lightboxIdx,  setLightboxIdx]  = useState<number | null>(null)
  const [deleteId,     setDeleteId]     = useState<string | null>(null)

  const { data, status } = useQuery({
    queryKey: ["project", pid, "assets"],
    queryFn: () => apiClient<AssetListResponse>(`/api/app/projects/${pid}/assets`),
  })
  const assets = data?.assets ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/api/app/projects/${pid}/assets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", pid, "assets"] })
      if (drawerAsset?.id === deleteId) setDrawerAsset(null)
      setDeleteId(null)
    },
  })

  // derive type filter options
  const typeCounts: Record<string, number> = {}
  assets.forEach(a => { typeCounts[a.assetType] = (typeCounts[a.assetType] || 0) + 1 })

  const filtered = assets.filter(a => {
    if (filterType !== "*" && a.assetType !== filterType) return false
    if (q.trim() && !a.title.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  const selCount = Object.values(selected).filter(Boolean).length

  function toggleSel(id: string) {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function openLightbox(a: Asset) {
    const i = filtered.findIndex(f => f.id === a.id)
    setLightboxIdx(i >= 0 ? i : 0)
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadError(null)
    setUploading(true)
    try {
      for (const rawFile of Array.from(files)) {
        const file = await compressImage(rawFile)
        const form = new FormData()
        form.append("file", file)
        form.append("title", file.name.replace(/\.[^.]+$/, ""))
        await apiClient(`/api/app/projects/${pid}/assets`, { method: "POST", body: form })
      }
      qc.invalidateQueries({ queryKey: ["project", pid, "assets"] })
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "上傳失敗")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[project.name, "圖庫"]} />

      <div className="pageh">
        <div className="ht">
          <h1>圖庫 <span className="en">Gallery</span></h1>
          <p className="sub">{project.name} 的圖片資產與關聯。</p>
        </div>
        <div className="acts">
          <button
            className="btn btn-accent"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="upload" size={15} />
            {uploading ? "上傳中…" : "＋ 上傳圖片"}
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        style={{ display: "none" }}
        onChange={e => handleFiles(e.target.files)}
      />

      {uploadError && (
        <div style={{ background: "var(--avoid-soft)", color: "var(--avoid)", borderRadius: "var(--r-card)", padding: "var(--s3) var(--s4)", fontSize: 13, marginBottom: "var(--s4)" }}>
          {uploadError}
        </div>
      )}

      {status === "pending" && <LoadingSpinner />}
      {status === "error"   && <p style={{ color: "var(--avoid)"  }}>無法載入圖庫</p>}

      {status === "success" && assets.length === 0 && (
        <div
          className="gal-drop"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        >
          <div style={{ opacity: .4, marginBottom: "var(--s3)" }}><Icon name="image" size={48} /></div>
          <p style={{ fontWeight: 600 }}>點擊或拖曳圖片上傳</p>
          <p style={{ fontSize: 12, marginTop: "var(--s2)" }}>支援 JPEG、PNG、WebP、GIF，最大 10 MB</p>
        </div>
      )}

      {status === "success" && assets.length > 0 && (
        <div className="gl-cols">
          {/* ── Filter sidebar ── */}
          <div className="gl-filter">
            <div className="fg">
              <div className="ft">資產類型</div>
              <button className={"opt" + (filterType === "*" ? " on" : "")} onClick={() => setFilterType("*")}>
                全部 <span className="ct">{assets.length}</span>
              </button>
              {Object.entries(typeCounts).map(([type, count]) => (
                <button
                  key={type}
                  className={"opt" + (filterType === type ? " on" : "")}
                  onClick={() => setFilterType(type)}
                >
                  {type || "其他"} <span className="ct">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Main area ── */}
          <div className="gl-main">
            {/* Toolbar */}
            <div className="gl-toolbar">
              <div className="searchf">
                <Icon name="search" size={15} />
                <input
                  type="search"
                  placeholder="搜尋圖片…"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />
              </div>

              <div className="ac-view">
                <button className={layout === "grid"    ? "on" : ""} title="網格"   onClick={() => setLayout("grid")}>
                  <Icon name="grid" size={15} />
                </button>
                <button className={layout === "masonry" ? "on" : ""} title="瀑布流" onClick={() => setLayout("masonry")}>
                  <Icon name="columns" size={15} />
                </button>
              </div>

              <div className="spacer" />

              <button
                className="btn btn-sm"
                style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                onClick={() => { setMulti(m => !m); setSelected({}) }}
              >
                <Icon name="checkbox" size={13} />
                {multi ? "結束多選" : "多選"}
              </button>

              <span className="gl-count">{filtered.length} 張</span>
            </div>

            {/* Grid */}
            <div
              className={"gl-grid" + (layout === "masonry" ? " masonry" : "")}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
            >
              {filtered.map(a => (
                <button
                  key={a.id}
                  className={"acard" + (selected[a.id] ? " sel" : "")}
                  aria-label={a.title}
                  onClick={() => multi ? toggleSel(a.id) : setDrawerAsset(a)}
                >
                  {multi && (
                    <span className="sel-check">
                      {selected[a.id] && <Icon name="check" size={11} />}
                    </span>
                  )}
                  <div className="thumb">
                    <img src={a.url} alt={a.title} loading="lazy" />
                  </div>
                  <div className="pad">
                    <div className="t">{a.title}</div>
                    <div className="meta">{a.authorName || "無署名"}</div>
                  </div>
                  {!multi && (
                    <button
                      className="acard-del"
                      title="刪除"
                      onClick={e => { e.stopPropagation(); setDeleteId(a.id) }}
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  )}
                </button>
              ))}

              {/* Upload tile */}
              <button className="acard acard-add" onClick={() => fileRef.current?.click()}>
                <div className="thumb">
                  <Icon name="upload" size={28} />
                  <span style={{ fontSize: 12 }}>上傳圖片</span>
                </div>
              </button>
            </div>

            {/* Bulk action bar */}
            {multi && selCount > 0 && (
              <div className="bulk-bar">
                <span className="n">已選 {selCount} 張</span>
                <span className="spacer" />
                <button onClick={() => {}}>設定可見性</button>
                <button onClick={() => {}}>補作者</button>
                <button className="exit" onClick={() => { setMulti(false); setSelected({}) }}>✕</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Detail Drawer ── */}
      {drawerAsset && (
        <AssetDrawer
          asset={drawerAsset}
          onClose={() => setDrawerAsset(null)}
          onOpenLightbox={() => { openLightbox(drawerAsset); setDrawerAsset(null) }}
          onDelete={() => { setDeleteId(drawerAsset.id); setDrawerAsset(null) }}
        />
      )}

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && (
        <Lightbox
          list={filtered}
          startIdx={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      {/* ── Delete confirm modal ── */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-h">
              <h2>刪除圖片？</h2>
              <button className="modal-close" onClick={() => setDeleteId(null)}>
                <Icon name="x" size={15} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "var(--text-dim)" }}>
                圖片將從圖庫永久移除，所有關聯也會解除。
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
