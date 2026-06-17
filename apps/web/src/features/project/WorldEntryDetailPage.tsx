import { LoadingSpinner, PageLoading } from "@/components/LoadingSpinner"
import { useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useParams, useNavigate } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import { recordView } from "@/lib/recentlyViewed"
import { showConfirm } from "@/components/ConfirmModal"
import type { WorldEntryResponse } from "@oc-tools/contracts"
import { typeLabel, typeColor } from "@/lib/worldviewTypes"

export function WorldEntryDetailPage() {
  const { projectId, entryId } = useParams<{ projectId: string; entryId: string }>()
  const { project } = useProjectContext()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => apiClient(`/api/app/projects/${projectId}/world-entries/${entryId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId, "world-entries"] })
      navigate(`/p/${projectId}/worldview`)
    },
    onError: () => alert('刪除失敗，請稍後再試'),
  })

  const { data, status } = useQuery({
    queryKey: ["project", projectId, "world-entry", entryId],
    queryFn: () =>
      apiClient<WorldEntryResponse>(
        `/api/app/projects/${projectId}/world-entries/${entryId}`,
      ),
    enabled: !!projectId && !!entryId,
  })

  const entry = data?.entry
  useEffect(() => {
    if (!entry || !projectId || !entryId) return
    recordView({ type: "entry", id: entry.id, name: entry.title, path: `/p/${projectId}/worldview/${entryId}`, color: typeColor(entry.type) })
  }, [entry?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "pending") {
    return <PageLoading />
  }

  if (status === "error" || !data?.entry) {
    return (
      <div className="page">
        <div style={{ color: "var(--avoid)", marginBottom: "var(--s4)" }}>找不到條目。</div>
        <Link to={`/p/${projectId}/worldview`} className="lnk">← 回世界觀</Link>
      </div>
    )
  }

  const e = data.entry
  const color = typeColor(e.type)

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[{ label: project.name, href: `/p/${projectId}` }, { label: "世界觀", href: `/p/${projectId}/worldview` }, e.title]} />

      <div className="ch-head">
        <div className="av" style={{ background: color, fontSize: 28 }}>
          {e.title.slice(0, 1)}
        </div>

        <div className="id">
          <h1>{e.title}</h1>
          {e.summary && (
            <p className="tagline">
              {e.summary.slice(0, 120)}{e.summary.length > 120 ? "…" : ""}
            </p>
          )}
          <div className="meta">
            <span className="tag" style={{ background: color + "22", borderColor: color + "44", color }}>
              {typeLabel(e.type)}
            </span>
            <span className="tag">{e.visibility ?? "private"}</span>
          </div>
        </div>

        <div className="acts">
          <Link to={`/p/${projectId}/worldview`} className="btn btn-ghost">← 世界觀</Link>
          <Link to={`/p/${projectId}/worldview/${entryId}/edit`} className="btn">編輯條目</Link>
          <Link to={`/p/${projectId}/worldview/new?parent=${entryId}`} className="btn">＋ 子條目</Link>
          <button
            className="btn btn-ghost"
            style={{ color: "var(--avoid)" }}
            disabled={deleteMutation.isPending}
            onClick={async () => {
              if (!await showConfirm(`刪除「${e.title}」？此操作無法復原。`, { title: "刪除條目", confirmLabel: "刪除", danger: true })) return
              deleteMutation.mutate()
            }}
          >
            刪除
          </button>
        </div>
      </div>

      <div className="det-grid">
        <div>
          {e.summary && (
            <div className="block">
              <p className="bh">摘要 · SUMMARY</p>
              <p>{e.summary}</p>
            </div>
          )}

          {(e.content || e.body) && (
            <div className="block">
              <p className="bh">詳細內容 · CONTENT</p>
              <p style={{ whiteSpace: "pre-wrap" }}>{e.content ?? e.body}</p>
            </div>
          )}
        </div>

        <div>
          <div className="block">
            <p className="bh">基本資料 · INFO</p>
            <div className="kvs">
              <div className="r">
                <span className="k">類型</span>
                <span>{typeLabel(e.type)}</span>
              </div>
              <div className="r">
                <span className="k">可見性</span>
                <span>{e.visibility ?? "private"}</span>
              </div>
              <div className="r">
                <span className="k">建立</span>
                <span>{new Date(e.createdAt).toLocaleDateString("zh-TW")}</span>
              </div>
              <div className="r">
                <span className="k">更新</span>
                <span>{new Date(e.updatedAt).toLocaleDateString("zh-TW")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
