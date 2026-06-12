import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import type { AssetListResponse, Asset } from "@oc-tools/contracts"

interface Props {
  onSelect: (url: string) => void
  onClose: () => void
}

export function AssetPickerModal({ onSelect, onClose }: Props) {
  const [q, setQ] = useState("")

  const { data, status } = useQuery({
    queryKey: ["assets"],
    queryFn: () => apiClient<AssetListResponse>("/api/app/assets"),
    staleTime: 30_000,
  })

  const images = useMemo<Asset[]>(() => {
    const all = (data?.assets ?? []).filter(a => a.mimeType?.startsWith("image/"))
    if (!q.trim()) return all
    const lc = q.toLowerCase()
    return all.filter(a =>
      a.title.toLowerCase().includes(lc) ||
      (a.projectName ?? "").toLowerCase().includes(lc)
    )
  }, [data, q])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 680, maxHeight: "80vh", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-h">
          <h2>從圖庫選圖片</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: "var(--s3) var(--s5)", borderBottom: "1px solid var(--border)" }}>
          <div style={{ position: "relative" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "var(--text-faint)", pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              className="inp"
              style={{ paddingLeft: 32, fontSize: 13 }}
              placeholder="搜尋圖片…"
              value={q}
              onChange={e => setQ(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "var(--s4) var(--s5)" }}>
          {status === "pending" && (
            <p style={{ color: "var(--text-faint)", fontSize: 13, textAlign: "center", padding: "var(--s8) 0" }}>載入中⋯</p>
          )}
          {status === "error" && (
            <p style={{ color: "var(--avoid)", fontSize: 13, textAlign: "center", padding: "var(--s8) 0" }}>無法載入圖庫</p>
          )}
          {status === "success" && images.length === 0 && (
            <p style={{ color: "var(--text-faint)", fontSize: 13, textAlign: "center", padding: "var(--s8) 0" }}>
              {q ? "找不到符合的圖片" : "圖庫還沒有圖片"}
            </p>
          )}
          {status === "success" && images.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "var(--s3)" }}>
              {images.map(asset => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => { onSelect(asset.url); onClose() }}
                  style={{
                    all: "unset", cursor: "pointer", borderRadius: "var(--r-md)",
                    overflow: "hidden", border: "2px solid transparent",
                    transition: "border-color .15s, transform .15s",
                    display: "flex", flexDirection: "column",
                    background: "var(--surface-2)",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)" }}
                  title={asset.title}
                >
                  <div style={{ aspectRatio: "1", overflow: "hidden", background: "var(--surface-3)" }}>
                    <img
                      src={asset.url}
                      alt={asset.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      loading="lazy"
                    />
                  </div>
                  <div style={{ padding: "6px 8px", fontSize: 11, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {asset.title || "未命名"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
