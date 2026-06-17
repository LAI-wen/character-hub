import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { ContextHeader } from "@/components/ContextHeader"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import { useAuth } from "@/lib/auth/context"
import { apiClient } from "@/lib/api/client"

type PublicPage = {
  id: string
  projectId: string
  slug: string
  status: "draft" | "published" | "disabled"
  draftJson: Record<string, unknown>
  settings: Record<string, unknown>
  theme: Record<string, unknown>
  publishedVersionId: string | null
  publishedAt: string | null
  updatedAt: string
}

const BASE_URL = "https://oc-tools-8g5.pages.dev"

export function PublicPagePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useProjectContext()
  const { viewer } = useAuth()
  const queryClient = useQueryClient()

  const isOwner = project.ownerUserId === viewer?.id

  const { data, status } = useQuery({
    queryKey: ["project", projectId, "public-page"],
    queryFn: () =>
      apiClient<{ publicPage: PublicPage; projectSlug: string }>(`/api/app/projects/${projectId}/public-page`),
    enabled: !!projectId,
  })

  const patchMutation = useMutation({
    mutationFn: (body: { status?: string; draftJson?: Record<string, unknown>; settings?: Record<string, unknown>; theme?: Record<string, unknown> }) =>
      apiClient(`/api/app/projects/${projectId}/public-page`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "public-page"] })
    },
  })

  const page = data?.publicPage
  const projectSlug = data?.projectSlug ?? project.slug ?? ""
  const publicUrl = `${BASE_URL}/page/${projectSlug}`

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[{ label: project.name, href: `/p/${projectId}` }, "公開頁"]} />

      <div className="pageh">
        <div className="ht">
          <h1 style={{ fontFamily: "var(--font-serif)" }}>公開頁 <span className="en">Public Page</span></h1>
          <p className="sub">此企劃的對外展示頁，訪客可以在這裡瀏覽企劃資訊</p>
        </div>
        {isOwner && page && page.status !== "published" && (
          <div className="acts">
            <button
              className="btn btn-accent"
              onClick={() => patchMutation.mutate({ status: "published" })}
              disabled={patchMutation.isPending}
            >
              發布公開頁
            </button>
          </div>
        )}
      </div>

      {status === "pending" && (
        <LoadingSpinner />
      )}

      {status === "error" && (
        <div className="state">
          <span className="ti">無法載入公開頁資訊</span>
          <p className="bd">請稍後再試</p>
        </div>
      )}

      {status === "success" && page && (
        <>
          {/* Status banner */}
          {page.status === "published" && (
            <div className="pub-banner">
              <span style={{ fontSize: 18 }}>🌐</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>公開頁已發布</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                  訪客可透過連結瀏覽此企劃
                </div>
              </div>
              <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn-sm">
                前往公開頁 ↗
              </a>
              {isOwner && (
                <button
                  className="btn btn-sm"
                  style={{ borderColor: "var(--avoid)", color: "var(--avoid)" }}
                  onClick={() => patchMutation.mutate({ status: "disabled" })}
                  disabled={patchMutation.isPending}
                >
                  停用
                </button>
              )}
            </div>
          )}

          {page.status === "disabled" && isOwner && (
            <div className="pub-banner" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "var(--text-dim)" }}>公開頁已停用</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                  訪客目前無法瀏覽此企劃
                </div>
              </div>
              <button
                className="btn btn-sm btn-accent"
                onClick={() => patchMutation.mutate({ status: "published" })}
                disabled={patchMutation.isPending}
              >
                啟用
              </button>
            </div>
          )}

          {page.status === "draft" && isOwner && (
            <div className="pub-banner" style={{ background: "#FFFDE7", borderColor: "#F9E044" }}>
              <span style={{ fontSize: 18 }}>✏️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#5D4A00" }}>草稿狀態</div>
                <div style={{ fontSize: 12, color: "#7A6400", marginTop: 2 }}>
                  設定完成後點擊「發布公開頁」讓訪客可以瀏覽
                </div>
              </div>
            </div>
          )}

          {/* Info cards */}
          <div className="pp-grid">
            {/* URL card */}
            <div className="ppcard">
              <div className="cv" style={{ background: project.themeColor ?? "var(--accent)" }} />
              <div className="pad">
                <div className="nm">{project.name}</div>
                <div className="meta">
                  <span className={`ppcard pp-st ${page.status}`} style={{ padding: "2px 8px" }}>
                    {page.status === "published" ? "已發布" : page.status === "draft" ? "草稿" : "已停用"}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--r-pill)",
                    background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text-faint)",
                  }}>
                    {project.visibility === "public" ? "公開" : project.visibility === "unlisted" ? "限連結" : "私人"}
                  </span>
                </div>
                <div className="url">{publicUrl}</div>
              </div>
              <div className="foot">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                  onClick={e => page.status !== "published" && e.preventDefault()}
                  style={{ opacity: page.status !== "published" ? 0.5 : 1, cursor: page.status !== "published" ? "not-allowed" : undefined }}
                >
                  前往公開頁 ↗
                </a>
                {isOwner && (
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(publicUrl)
                        .catch(() => {})
                    }}
                  >
                    複製連結
                  </button>
                )}
              </div>
            </div>

            {/* Settings card */}
            {isOwner && (
              <div className="ppcard">
                <div className="cv" style={{ background: "var(--surface-2)" }} />
                <div className="pad">
                  <div className="nm" style={{ fontFamily: "var(--font-serif)" }}>企劃設定</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)", marginTop: "var(--s3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--text-faint)" }}>加入方式</span>
                      <span>{{
                        closed: "不開放",
                        invite: "邀請制",
                        application: "申請制",
                        open: "公開加入",
                      }[project.joinPolicy as string] ?? project.joinPolicy}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--text-faint)" }}>合作模式</span>
                      <span>{{
                        solo:          "個人",
                        collaborative: "協作",
                      }[project.collaborationMode as string] ?? project.collaborationMode}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--text-faint)" }}>作品投稿</span>
                      <span>{project.submissionsEnabled ? "開放" : "關閉"}</span>
                    </div>
                  </div>
                </div>
                <div className="foot">
                  <a href={`/p/${projectId}/settings`} className="btn btn-sm">前往設定 →</a>
                </div>
              </div>
            )}
          </div>

          {/* Published date */}
          {page.publishedAt && (
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: "var(--s5)" }}>
              最後發布於 {new Date(page.publishedAt).toLocaleString("zh-TW")}
            </p>
          )}

          <div style={{
            marginTop: "var(--s6)",
            padding: "var(--s4) var(--s5)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-card)",
            fontSize: 13,
            color: "var(--text-faint)",
          }}>
            視覺化公開頁編輯器（區塊拖曳、版面設計）即將推出。
          </div>
        </>
      )}
    </div>
  )
}
