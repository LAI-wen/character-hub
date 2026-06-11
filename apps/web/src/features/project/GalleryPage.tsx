import { useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import { PageHeader } from "@/components/PageHeader"
import { ContextHeader } from "@/components/ContextHeader"
import { apiClient } from "@/lib/api/client"
import type { AssetListResponse, Asset } from "@oc-tools/contracts"

function Ic({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: size, height: size, display: "block", flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: d }} />
  )
}
const IC = {
  image:  '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 16l-5-5-7 7"/>',
  upload: '<path d="M12 3v13"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M8 8l4-5 4 5"/>',
  plus:   '<path d="M12 5v14M5 12h14"/>',
  x:      '<path d="M18 6L6 18M6 6l12 12"/>',
  trash:  '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
}

export function GalleryPage() {
  const { project } = useProjectContext()
  const qc = useQueryClient()
  const pid = project.id
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Asset | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [q, setQ] = useState("")

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
      if (preview?.id === deleteId) setPreview(null)
      setDeleteId(null)
    },
  })

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadError(null)
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
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

  const filtered = q.trim()
    ? assets.filter(a => a.title.toLowerCase().includes(q.toLowerCase()))
    : assets

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[project.name, "圖庫"]} />
      <PageHeader
        eyebrow="Gallery"
        title="圖庫"
        sub="上傳並管理此企劃的圖片素材。"
        action={
          <button className="btn btn-accent" onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            {uploading ? "上傳中…" : <><Ic d={IC.upload} size={15} /> 上傳圖片</>}
          </button>
        }
      />

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

      {status === "pending" && <p style={{ color: "var(--text-faint)" }}>載入中⋯</p>}
      {status === "error" && <p style={{ color: "var(--avoid)" }}>無法載入圖庫</p>}

      {status === "success" && assets.length === 0 && (
        <div
          className="gal-drop"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        >
          <div style={{ opacity: .4, marginBottom: "var(--s3)" }}><Ic d={IC.image} size={48} /></div>
          <p style={{ fontWeight: 600 }}>點擊或拖曳圖片上傳</p>
          <p style={{ fontSize: 12, marginTop: "var(--s2)" }}>支援 JPEG、PNG、WebP、GIF，最大 10 MB</p>
        </div>
      )}

      {status === "success" && assets.length > 0 && (
        <div className="gl-cols">
          {/* Filter sidebar */}
          <div className="gl-filter">
            <div className="fg">
              <div className="ft">類別</div>
              <button className="opt on">
                全部
                <span className="ct">{assets.length}</span>
              </button>
            </div>
          </div>

          {/* Main area */}
          <div className="gl-main">
            {/* Toolbar */}
            <div className="gl-toolbar">
              <div className="searchf">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: 11, width: 15, height: 15, color: "var(--text-faint)", pointerEvents: "none" }}
                  dangerouslySetInnerHTML={{ __html: IC.search }} />
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

            <div
              className="gl-grid"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
            >
              {filtered.map(a => (
                <button
                  key={a.id}
                  className="acard"
                  onClick={() => setPreview(a)}
                >
                  <div className="thumb">
                    <img src={a.url} alt={a.title} loading="lazy" />
                  </div>
                  <div className="pad">
                    <div className="t">{a.title}</div>
                  </div>
                  <button
                    className="acard-del"
                    onClick={e => { e.stopPropagation(); setDeleteId(a.id) }}
                    title="刪除"
                  >
                    <Ic d={IC.trash} size={12} />
                  </button>
                </button>
              ))}

              {/* Upload tile */}
              <button
                className="acard acard-add"
                onClick={() => fileRef.current?.click()}
              >
                <div className="thumb">
                  <Ic d={IC.upload} size={28} />
                  <span style={{ fontSize: 12 }}>上傳圖片</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview lightbox */}
      {preview && (
        <div className="gal-lb" onClick={() => setPreview(null)}>
          <div className="gal-lb-box" onClick={e => e.stopPropagation()}>
            <button className="gal-lb-close" onClick={() => setPreview(null)}><Ic d={IC.x} size={16} /></button>
            <img src={preview.url} alt={preview.title} />
            <div className="gal-lb-foot">
              <span>{preview.title}</span>
              <button
                className="btn btn-sm"
                style={{ color: "var(--avoid)" }}
                onClick={() => setDeleteId(preview.id)}
              >
                刪除
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
              <h2>刪除圖片？</h2>
              <button className="modal-close" onClick={() => setDeleteId(null)}><Ic d={IC.x} size={15} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "var(--text-dim)" }}>圖片將從圖庫永久移除。</p>
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
