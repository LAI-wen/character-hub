import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import { PageHeader } from "@/components/PageHeader"
import { ContextHeader } from "@/components/ContextHeader"
import { apiClient } from "@/lib/api/client"
import type { StoryListResponse, StoryDetailResponse, Story, Chapter } from "@oc-tools/contracts"

function Ic({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: size, height: size, display: "inline-block", flexShrink: 0, verticalAlign: "middle" }}
      dangerouslySetInnerHTML={{ __html: d }} />
  )
}
const IC = {
  book:  '<path d="M5 4h10a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2H5Z"/><path d="M5 4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2"/><path d="M9 8h5M9 11h5"/>',
  x:     '<path d="M18 6L6 18M6 6l12 12"/>',
  plus:  '<path d="M12 5v14M5 12h14"/>',
  chevD: '<path d="M6 9l6 6 6-6"/>',
  chevU: '<path d="M18 15l-6-6-6 6"/>',
}

export function StoryPage() {
  const { project } = useProjectContext()
  const qc = useQueryClient()
  const pid = project.id

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState("")
  const [createDesc, setCreateDesc] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, status } = useQuery({
    queryKey: ["project", pid, "stories"],
    queryFn: () => apiClient<StoryListResponse>(`/api/app/projects/${pid}/stories`),
  })
  const stories = data?.stories ?? []

  const { data: detail, status: detailStatus } = useQuery({
    queryKey: ["project", pid, "story", selectedId],
    queryFn: () => apiClient<StoryDetailResponse>(`/api/app/projects/${pid}/stories/${selectedId}`),
    enabled: !!selectedId,
  })

  const createMutation = useMutation({
    mutationFn: (body: { title: string; description?: string }) =>
      apiClient(`/api/app/projects/${pid}/stories`, { method: "POST", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", pid, "stories"] })
      setCreateOpen(false)
      setCreateTitle("")
      setCreateDesc("")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/api/app/projects/${pid}/stories/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["project", pid, "stories"] })
      if (selectedId === id) setSelectedId(null)
      setDeleteId(null)
    },
  })

  const selectedStory = stories.find(s => s.id === selectedId) ?? null

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[project.name, "故事"]} />
      <PageHeader
        eyebrow="Story"
        title="故事"
        sub="管理你的故事、章節與創作草稿。"
        action={<button className="btn btn-accent" onClick={() => setCreateOpen(true)}>＋ 新增故事</button>}
      />

      {status === "pending" && <p style={{ color: "var(--text-faint)" }}>載入中⋯</p>}
      {status === "error" && <p style={{ color: "var(--avoid)" }}>無法載入故事</p>}

      {status === "success" && stories.length === 0 && (
        <div className="ph-empty">
          <div className="ph-icon"><Ic d={IC.book} size={40} /></div>
          <p>還沒有故事。建立第一個吧。</p>
          <button className="btn btn-accent" style={{ marginTop: "var(--s4)" }} onClick={() => setCreateOpen(true)}>
            ＋ 新增故事
          </button>
        </div>
      )}

      {status === "success" && stories.length > 0 && (
        <div className="st-layout">
          {/* Left: story list */}
          <div className="st-sidebar">
            {stories.map(s => (
              <div
                key={s.id}
                className={"st-card" + (s.id === selectedId ? " on" : "")}
                onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
              >
                <div className="st-card-body">
                  <div className="st-card-title">{s.title}</div>
                  {s.description && <div className="st-card-desc">{s.description}</div>}
                  <div className="st-card-meta">{s.chapterCount} 章節</div>
                </div>
                <button
                  className="st-del"
                  onClick={e => { e.stopPropagation(); setDeleteId(s.id) }}
                  title="刪除故事"
                ><Ic d={IC.x} size={13} /></button>
              </div>
            ))}
          </div>

          {/* Right: story detail */}
          <div className="st-main">
            {!selectedId && (
              <div style={{ color: "var(--text-faint)", fontSize: 14, padding: "var(--s7) var(--s5)", textAlign: "center" }}>
                ← 選一個故事
              </div>
            )}
            {selectedId && (
              <StoryDetail
                key={selectedId}
                pid={pid}
                storyId={selectedId}
                story={selectedStory}
                detail={detail}
                detailStatus={detailStatus}
              />
            )}
          </div>
        </div>
      )}

      {/* Create story modal */}
      {createOpen && (
        <div className="modal-overlay" onClick={() => setCreateOpen(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-h">
              <h2>新增故事</h2>
              <button className="modal-close" onClick={() => setCreateOpen(false)}><Ic d={IC.x} size={15} /></button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
              <div>
                <label className="field-label">標題</label>
                <input
                  className="field-input"
                  placeholder="故事名稱"
                  value={createTitle}
                  onChange={e => setCreateTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="field-label">說明（選填）</label>
                <input
                  className="field-input"
                  placeholder="簡短說明"
                  value={createDesc}
                  onChange={e => setCreateDesc(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setCreateOpen(false)}>取消</button>
              <button
                className="btn btn-accent"
                disabled={!createTitle.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({ title: createTitle.trim(), description: createDesc.trim() || undefined })}
              >
                {createMutation.isPending ? "建立中…" : "建立"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete story confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-h">
              <h2>刪除「{stories.find(s => s.id === deleteId)?.title}」？</h2>
              <button className="modal-close" onClick={() => setDeleteId(null)}><Ic d={IC.x} size={15} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "var(--text-dim)" }}>故事和所有章節將被封存，無法復原。</p>
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

// ─── Story detail panel ────────────────────────────────────────────────────────

function StoryDetail({
  pid,
  storyId,
  story,
  detail,
  detailStatus,
}: {
  pid: string
  storyId: string
  story: Story | null
  detail: StoryDetailResponse | undefined
  detailStatus: string
}) {
  const qc = useQueryClient()
  const [editId, setEditId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addTitle, setAddTitle] = useState("")

  const chapters = detail?.chapters ?? []

  const createChapterMutation = useMutation({
    mutationFn: (title: string) =>
      apiClient<{ chapter: Chapter }>(`/api/app/projects/${pid}/stories/${storyId}/chapters`, {
        method: "POST",
        json: { title },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", pid, "story", storyId] })
      setAddOpen(false)
      setAddTitle("")
    },
  })

  const patchChapterMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; title?: string; content?: string }) =>
      apiClient(`/api/app/projects/${pid}/stories/${storyId}/chapters/${id}`, {
        method: "PATCH",
        json: body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", pid, "story", storyId] }),
  })

  const deleteChapterMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/api/app/projects/${pid}/stories/${storyId}/chapters/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", pid, "story", storyId] })
      setEditId(null)
    },
  })

  return (
    <div className="st-detail">
      <div className="st-detail-h">
        <div>
          <div className="st-detail-title">{story?.title ?? "…"}</div>
          {story?.description && <div className="st-detail-desc">{story.description}</div>}
        </div>
        <button className="btn btn-sm" onClick={() => setAddOpen(true)}>＋ 新增章節</button>
      </div>

      {detailStatus === "pending" && <p style={{ color: "var(--text-faint)", fontSize: 14 }}>載入章節⋯</p>}

      {detailStatus === "success" && chapters.length === 0 && (
        <div style={{ color: "var(--text-faint)", fontSize: 14, padding: "var(--s5) 0" }}>
          還沒有章節。點「新增章節」開始。
        </div>
      )}

      <div className="st-chapters">
        {chapters.map((ch, i) => (
          <ChapterItem
            key={ch.id}
            chapter={ch}
            index={i}
            isEditing={editId === ch.id}
            onToggle={() => setEditId(prev => prev === ch.id ? null : ch.id)}
            onSaveTitle={title => patchChapterMutation.mutate({ id: ch.id, title })}
            onSaveContent={content => patchChapterMutation.mutate({ id: ch.id, content })}
            onDelete={() => deleteChapterMutation.mutate(ch.id)}
          />
        ))}
      </div>

      {/* Add chapter inline */}
      {addOpen && (
        <div className="st-addch">
          <input
            className="field-input"
            placeholder="章節標題"
            value={addTitle}
            onChange={e => setAddTitle(e.target.value)}
            autoFocus
            onKeyDown={e => {
              if (e.key === "Enter" && addTitle.trim()) createChapterMutation.mutate(addTitle.trim())
              if (e.key === "Escape") { setAddOpen(false); setAddTitle("") }
            }}
          />
          <div style={{ display: "flex", gap: "var(--s2)", marginTop: "var(--s3)" }}>
            <button className="btn btn-ghost" onClick={() => { setAddOpen(false); setAddTitle("") }}>取消</button>
            <button
              className="btn btn-accent"
              disabled={!addTitle.trim() || createChapterMutation.isPending}
              onClick={() => createChapterMutation.mutate(addTitle.trim())}
            >
              {createChapterMutation.isPending ? "建立中…" : "建立"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Chapter item ──────────────────────────────────────────────────────────────

function ChapterItem({
  chapter,
  index,
  isEditing,
  onToggle,
  onSaveTitle,
  onSaveContent,
  onDelete,
}: {
  chapter: Chapter
  index: number
  isEditing: boolean
  onToggle: () => void
  onSaveTitle: (t: string) => void
  onSaveContent: (c: string) => void
  onDelete: () => void
}) {
  const [titleVal, setTitleVal] = useState(chapter.title)
  const [contentVal, setContentVal] = useState(chapter.content ?? "")
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTitleVal(chapter.title)
    setContentVal(chapter.content ?? "")
  }, [chapter.title, chapter.content])

  useEffect(() => {
    if (isEditing && taRef.current) {
      autoResize(taRef.current)
    }
  }, [isEditing])

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto"
    el.style.height = el.scrollHeight + "px"
  }

  return (
    <div className={"st-ch" + (isEditing ? " open" : "")}>
      <div className="st-ch-head" onClick={onToggle}>
        <span className="st-ch-num">{index + 1}</span>
        {isEditing ? (
          <input
            className="st-ch-title-input"
            value={titleVal}
            onChange={e => setTitleVal(e.target.value)}
            onBlur={() => { if (titleVal.trim() && titleVal !== chapter.title) onSaveTitle(titleVal.trim()) }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="st-ch-title">{chapter.title}</span>
        )}
        <span className="st-ch-arrow"><Ic d={isEditing ? IC.chevU : IC.chevD} size={14} /></span>
      </div>

      {isEditing && (
        <div className="st-ch-body">
          <textarea
            ref={taRef}
            className="st-ch-ta"
            placeholder="在這裡寫章節內容⋯"
            value={contentVal}
            onChange={e => { setContentVal(e.target.value); autoResize(e.target) }}
            onBlur={() => { if (contentVal !== (chapter.content ?? "")) onSaveContent(contentVal) }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "var(--s3) 0 0" }}>
            <button
              className="btn btn-sm"
              style={{ color: "var(--avoid)" }}
              onClick={onDelete}
            >
              刪除章節
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
