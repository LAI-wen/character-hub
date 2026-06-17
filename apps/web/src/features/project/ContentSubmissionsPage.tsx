import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { ContextHeader } from "@/components/ContextHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import { useAuth } from "@/lib/auth/context"
import { apiClient } from "@/lib/api/client"
import { fmtDate } from "@/lib/formatDate"

type Submission = {
  id: string
  submitterUserId: string | null
  type: string
  title: string
  message: string | null
  textContent: string | null
  status: string
  submittedAt: string
  reviewedAt: string | null
  reviewMessage: string | null
}

const TYPE_LABELS: Record<string, string> = {
  image:  "圖片",
  text:   "文章",
  video:  "影片",
  other:  "其他",
}

const STATUS_LABELS: Record<string, string> = {
  submitted:         "審核中",
  changes_requested: "要求修改",
  approved:          "已通過",
  rejected:          "已拒絕",
  withdrawn:         "已撤回",
  draft:             "草稿",
}

const TYPE_COLOR: Record<string, string> = {
  image: "#5B6ECC",
  text:  "#3D8B5A",
  video: "#B8480C",
  other: "#7A6B4A",
}


export function ContentSubmissionsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useProjectContext()
  const { viewer } = useAuth()
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<"mine" | "review">("mine")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newType, setNewType] = useState<string>("image")
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newMessage, setNewMessage] = useState("")

  const isOwner = project.ownerUserId === viewer?.id

  const { data, status: queryStatus } = useQuery({
    queryKey: ["project", projectId, "submissions"],
    queryFn: () =>
      apiClient<{ submissions: Submission[]; viewerIsOwner: boolean }>(`/api/app/projects/${projectId}/submissions/content`),
    enabled: !!projectId,
  })

  const submissions = data?.submissions ?? []
  const mySubmissions = submissions.filter(s => s.submitterUserId === viewer?.id)
  const reviewSubmissions = submissions.filter(s => s.status === "submitted" || s.status === "changes_requested")

  const displayList = (tab === "mine" ? mySubmissions : reviewSubmissions)
    .filter(s => typeFilter === "all" || s.type === typeFilter)

  const selected = displayList.find(s => s.id === selectedId) ?? displayList[0] ?? null

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient(`/api/app/projects/${projectId}/submissions/content`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "submissions"] })
      setShowNew(false)
      setNewTitle("")
      setNewContent("")
      setNewMessage("")
    },
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, status, reviewMessage }: { id: string; status: string; reviewMessage?: string }) =>
      apiClient(`/api/app/projects/${projectId}/submissions/content/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, reviewMessage }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "submissions"] })
    },
  })

  function handleCreate() {
    if (!newTitle.trim()) return
    createMutation.mutate({
      type: newType,
      title: newTitle.trim(),
      textContent: newContent.trim() || null,
      message: newMessage.trim() || null,
    })
  }

  function StatusBadge({ status }: { status: string }) {
    const cls = {
      submitted:         "pending",
      changes_requested: "changes_requested",
      approved:          "active",
      rejected:          "rejected",
      withdrawn:         "rejected",
      draft:             "draft",
    }[status] ?? "draft"
    return <span className={`ap-st ${cls}`}>{STATUS_LABELS[status] ?? status}</span>
  }

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[{ label: project.name, href: `/p/${projectId}` }, "作品投稿"]} />

      <div className="pageh">
        <div className="ht">
          <h1 style={{ fontFamily: "var(--font-serif)" }}>作品投稿 <span className="en">Submissions</span></h1>
          <p className="sub">投稿圖片與文章到「{project.name}」，由主持人審核後收錄</p>
        </div>
      </div>

      {queryStatus === "error" && (
        <div className="state">
          <span className="ti">無法載入投稿</span>
          <p className="bd">請稍後再試</p>
        </div>
      )}

      {(queryStatus === "success" || queryStatus === "pending") && (
        <>
          <div className="ap-tabs">
            <button className={"ap-tab" + (tab === "mine" ? " on" : "")} onClick={() => setTab("mine")}>
              我的投稿
            </button>
            {isOwner && (
              <button className={"ap-tab" + (tab === "review" ? " on" : "")} onClick={() => setTab("review")}>
                主持人審核
                {reviewSubmissions.length > 0 && <span className="ct">{reviewSubmissions.length}</span>}
              </button>
            )}
          </div>

          {/* Type filter */}
          <div className="cs-typetabs">
            {[
              { value: "all",   label: "全部" },
              { value: "image", label: "圖片" },
              { value: "text",  label: "文章" },
              { value: "video", label: "影片" },
              { value: "other", label: "其他" },
            ].map(o => (
              <button
                key={o.value}
                className={"cs-typetab" + (typeFilter === o.value ? " on" : "")}
                onClick={() => setTypeFilter(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="ap-cols">
            {/* Left: list */}
            <div>
              <div className="ap-list">
                <div className="lh">{tab === "mine" ? `我的投稿 · ${mySubmissions.length}` : `待審核 · ${reviewSubmissions.length}`}</div>
                {displayList.map(s => (
                  <button
                    key={s.id}
                    className={"ap-item" + (selectedId === s.id || (!selectedId && s === selected) ? " sel" : "")}
                    onClick={() => setSelectedId(s.id)}
                  >
                    <div
                      className="cs-thumb"
                      style={{ background: TYPE_COLOR[s.type] ?? "#8A857C", width: 34, height: 34, fontSize: 13, borderRadius: 8 }}
                    >
                      {TYPE_LABELS[s.type]?.[0] ?? "?"}
                    </div>
                    <div className="b">
                      <div className="nm">{s.title}</div>
                      <div className="meta">{TYPE_LABELS[s.type] ?? s.type} · {fmtDate(s.submittedAt)}</div>
                    </div>
                    <StatusBadge status={s.status} />
                  </button>
                ))}
                {displayList.length === 0 && (
                  <div style={{ padding: "var(--s5)", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
                    目前沒有投稿
                  </div>
                )}
                {tab === "mine" && (
                  <div style={{ padding: "var(--s3)" }}>
                    <button
                      className="btn btn-accent btn-sm"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => setShowNew(true)}
                    >
                      ＋ 新投稿
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Center */}
            <div>
              {showNew ? (
                <div className="cs-new-form">
                  <div style={{ fontWeight: 700, fontSize: 16, fontFamily: "var(--font-serif)" }}>新投稿</div>

                  <div className="ap-field">
                    <label>類型</label>
                    <select className="select" value={newType} onChange={e => setNewType(e.target.value)}>
                      <option value="image">圖片</option>
                      <option value="text">文章</option>
                      <option value="video">影片</option>
                      <option value="other">其他</option>
                    </select>
                  </div>

                  <div className="ap-field">
                    <label>標題 <span className="reqd">必填</span></label>
                    <input className="input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="作品名稱" />
                  </div>

                  {newType === "text" && (
                    <div className="ap-field">
                      <label>內容</label>
                      <textarea className="input" rows={6} value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="在此貼上或撰寫文章內容" />
                    </div>
                  )}

                  <div className="ap-field">
                    <label>備注說明</label>
                    <textarea className="input" rows={2} value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="給主持人的說明（選填）" />
                  </div>

                  <div style={{ display: "flex", gap: "var(--s2)", justifyContent: "flex-end" }}>
                    <button className="btn btn-sm" onClick={() => setShowNew(false)}>取消</button>
                    <button
                      className="btn btn-sm btn-accent"
                      onClick={handleCreate}
                      disabled={!newTitle.trim() || createMutation.isPending}
                    >
                      {createMutation.isPending ? "投稿中…" : "提交投稿"}
                    </button>
                  </div>
                </div>
              ) : selected ? (
                <div className="ap-main">
                  <div className="mh">
                    <div className="top">
                      <h2>{selected.title}</h2>
                      <StatusBadge status={selected.status} />
                    </div>
                    <div className="sub">
                      {TYPE_LABELS[selected.type] ?? selected.type} · 投稿於 {fmtDate(selected.submittedAt)}
                    </div>
                  </div>

                  <div className="ap-body">
                    {selected.reviewMessage && (
                      <div className={`ap-msg${selected.status === "rejected" ? " rej" : ""}`}>
                        <div className="lbl">
                          {selected.status === "rejected" ? "已拒絕" : "主持人留言"}
                        </div>
                        {selected.reviewMessage}
                      </div>
                    )}

                    {selected.message && (
                      <div className="ap-sec">
                        <div className="ap-sec-h">投稿說明</div>
                        <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{selected.message}</p>
                      </div>
                    )}

                    {selected.textContent && (
                      <div className="ap-sec">
                        <div className="ap-sec-h">內容</div>
                        <div className="cs-textbody">{selected.textContent}</div>
                      </div>
                    )}
                  </div>

                  {isOwner && tab === "review" && (selected.status === "submitted" || selected.status === "changes_requested") && (
                    <div className="ap-foot">
                      <span style={{ fontSize: 13, color: "var(--text-faint)" }}>作為主持人審核</span>
                      <span className="spacer" />
                      <button
                        className="btn btn-sm"
                        style={{ borderColor: "var(--avoid)", color: "var(--avoid)" }}
                        onClick={() => {
                          const msg = prompt("拒絕原因（可留空）")
                          if (msg !== null) patchMutation.mutate({ id: selected.id, status: "rejected", reviewMessage: msg || undefined })
                        }}
                        disabled={patchMutation.isPending}
                      >
                        拒絕
                      </button>
                      <button
                        className="btn btn-sm btn-accent"
                        onClick={() => patchMutation.mutate({ id: selected.id, status: "approved" })}
                        disabled={patchMutation.isPending}
                      >
                        通過
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="ap-main" style={{ padding: "var(--s8)", textAlign: "center" }}>
                  <p style={{ color: "var(--text-faint)", fontSize: 14 }}>
                    {tab === "mine"
                      ? "還沒有投稿。點擊「＋ 新投稿」開始。"
                      : "目前沒有待審核的投稿。"}
                  </p>
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="ap-side">
              {selected && !showNew && (
                <div className="ap-panel">
                  <div className="ph">投稿進度</div>
                  <div className="ap-timeline">
                    <div className="ap-tl done">
                      <span className="dot" />
                      <div><div>提交</div><div className="when">{fmtDate(selected.submittedAt)}</div></div>
                    </div>
                    <div className={`ap-tl ${["approved", "rejected", "changes_requested"].includes(selected.status) ? "done" : ""}`}>
                      <span className="dot" />
                      <div>
                        <div>審核</div>
                        {selected.reviewedAt && <div className="when">{fmtDate(selected.reviewedAt)}</div>}
                      </div>
                    </div>
                    <div className={`ap-tl ${["approved", "rejected"].includes(selected.status) ? "done" : ""}`}>
                      <span className="dot" />
                      <div>
                        <div>結果</div>
                        {selected.status === "approved" && <span style={{ fontSize: 12, color: "#1B5E20" }}>已通過</span>}
                        {selected.status === "rejected" && <span style={{ fontSize: 12, color: "#6B1A0F" }}>已拒絕</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
