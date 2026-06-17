import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import { ContextHeader } from "@/components/ContextHeader"
import { apiClient } from "@/lib/api/client"
import type { StoryListResponse, StoryDetailResponse, Story, Chapter } from "@oc-tools/contracts"
import { Icon } from "@/components/Icon"
import { LoadingSpinner } from "@/components/LoadingSpinner"

function storyStatusLabel(s: string | undefined) {
  return { draft: "草稿", ongoing: "連載中", completed: "已完結", archived: "已封存" }[s ?? ""] ?? (s ?? "草稿")
}
function storyStatusCls(s: string | undefined) {
  return s === "completed" ? "approved" : s === "archived" ? "draft" : "pending"
}
function chapterStatusLabel(s: string | undefined) {
  return { draft: "草稿", completed: "已完成", archived: "已封存" }[s ?? ""] ?? (s ?? "草稿")
}

// ── Story selector dropdown ────────────────────────────────────────────────────

function StorySelector({
  stories,
  current,
  onChange,
}: {
  stories: Story[]
  current: Story | null
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  return (
    <div className="st-sel" ref={ref}>
      <button
        type="button"
        className="btn2"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
      >
        {current?.title ?? "選擇故事"} <span className="cv">▼</span>
      </button>
      <div className={"menu" + (open ? " open" : "")}>
        {stories.map(s => (
          <button
            key={s.id}
            type="button"
            className={"mi" + (s.id === current?.id ? " cur" : "")}
            onClick={() => { onChange(s.id); setOpen(false) }}
          >
            <span className="nm">{s.title}</span>
            <span className={`badge ${storyStatusCls(s.status)}`}>{storyStatusLabel(s.status)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Chapter outline (left panel) ──────────────────────────────────────────────

function ChapterOutline({
  chapters,
  selectedId,
  onSelect,
  onReorder,
}: {
  chapters: Chapter[]
  selectedId: string | null
  onSelect: (id: string) => void
  onReorder: (id: string, dir: -1 | 1) => void
}) {
  return (
    <div className="ch-outline">
      <div className="oh">章節 · {chapters.length}</div>
      <div className="list">
        {chapters.length === 0 && (
          <div style={{ padding: "var(--s6) var(--s3)", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
            還沒有章節。
          </div>
        )}
        {chapters.map((ch, i) => (
          <div
            key={ch.id}
            className={"ch-item" + (ch.id === selectedId ? " sel" : "")}
            tabIndex={0}
            onClick={() => onSelect(ch.id)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(ch.id) } }}
          >
            <span className="num">{i + 1}</span>
            <div className="b">
              <div className="t">{ch.title || "（未命名）"}</div>
              {ch.summary && <div className="s">{ch.summary}</div>}
            </div>
            <div className="reorder">
              <button
                type="button"
                aria-label="上移"
                disabled={i === 0}
                onClick={e => { e.stopPropagation(); onReorder(ch.id, -1) }}
              >▲</button>
              <button
                type="button"
                aria-label="下移"
                disabled={i === chapters.length - 1}
                onClick={e => { e.stopPropagation(); onReorder(ch.id, 1) }}
              >▼</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Chapter content (center panel) ────────────────────────────────────────────

function ChapterMain({
  chapter,
  index,
  onEdit: _onEdit,
  onSaveContent,
  onArchive,
}: {
  chapter: Chapter | null
  index: number
  onEdit: () => void
  onSaveContent: (content: string) => void
  onArchive?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(chapter?.content ?? "")
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setVal(chapter?.content ?? "")
    setEditing(false)
  }, [chapter?.id])

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto"
    el.style.height = el.scrollHeight + "px"
  }

  if (!chapter) {
    return (
      <div className="ch-main">
        <div className="ch-empty">選擇左側章節以檢視內容。</div>
      </div>
    )
  }

  return (
    <div className="ch-main">
      <div className="ch-h">
        <div className="top">
          <span className="num">第 {index + 1} 章</span>
          <h2>{chapter.title || "（未命名）"}</h2>
          <span className={`badge ${chapterStatusLabel(chapter.status) === "已完成" ? "approved" : "pending"}`}>
            {chapterStatusLabel(chapter.status)}
          </span>
          <div className="acts">
            <button className="btn btn-sm" onClick={() => { setEditing(true); setTimeout(() => taRef.current?.focus(), 50) }}>
              <Icon name="pen" size={12} /> 編輯
            </button>
            {onArchive && (
              <button className="btn btn-sm" onClick={onArchive}>封存</button>
            )}
          </div>
        </div>
        {chapter.summary && <p className="ch-sum">{chapter.summary}</p>}
      </div>

      {editing ? (
        <div style={{ padding: "var(--s4)" }}>
          <textarea
            ref={taRef}
            style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 14.5, lineHeight: 1.9, border: "1px solid var(--border)", borderRadius: 8, padding: "var(--s4)", resize: "vertical", minHeight: 240 }}
            value={val}
            onChange={e => { setVal(e.target.value); autoResize(e.target) }}
            placeholder="在這裡寫章節內容…"
          />
          <div style={{ display: "flex", gap: "var(--s2)", marginTop: "var(--s3)", justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => { setEditing(false); setVal(chapter.content ?? "") }}>取消</button>
            <button className="btn btn-accent" onClick={() => { onSaveContent(val); setEditing(false) }}>儲存</button>
          </div>
        </div>
      ) : (
        chapter.content
          ? <div className="ch-body">{chapter.content}</div>
          : <div className="ch-empty">這個章節還沒有內容。點「編輯」開始撰寫。</div>
      )}
    </div>
  )
}

// ── Side panel ────────────────────────────────────────────────────────────────

function SidePanel({ chapter }: { projectId: string; chapter: Chapter | null }) {
  return (
    <div className="st-side">
      <div className="st-panel">
        <div className="ph">相關角色 · Characters</div>
        {!chapter
          ? <p style={{ fontSize: 13, color: "var(--text-faint)", margin: 0 }}>選擇章節後可查看相關角色。</p>
          : <p style={{ fontSize: 13, color: "var(--text-faint)", margin: 0 }}>角色關聯功能即將推出。</p>
        }
      </div>
      <div className="st-panel">
        <div className="ph">世界觀 · World</div>
        <p style={{ fontSize: 13, color: "var(--text-faint)", margin: 0 }}>世界觀關聯功能即將推出。</p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function StoryPage() {
  const { project } = useProjectContext()
  const qc = useQueryClient()
  const pid = project.id

  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [view, setView] = useState<"chapters" | "timeline">("chapters")
  const [createOpen, setCreateOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState("")
  const [createDesc, setCreateDesc] = useState("")
  const [addChOpen, setAddChOpen] = useState(false)
  const [addChTitle, setAddChTitle] = useState("")
  const [editStoryOpen, setEditStoryOpen] = useState(false)
  const [editStoryTitle, setEditStoryTitle] = useState("")
  const [editStoryDesc, setEditStoryDesc] = useState("")
  const [editStoryStatus, setEditStoryStatus] = useState<Story["status"]>("draft")

  const { data, status } = useQuery({
    queryKey: ["project", pid, "stories"],
    queryFn: () => apiClient<StoryListResponse>(`/api/app/projects/${pid}/stories`),
  })
  const stories = data?.stories ?? []

  const curStoryId = selectedStoryId ?? stories[0]?.id ?? null
  const curStory = stories.find(s => s.id === curStoryId) ?? null

  const { data: detail } = useQuery({
    queryKey: ["project", pid, "story", curStoryId],
    queryFn: () => apiClient<StoryDetailResponse>(`/api/app/projects/${pid}/stories/${curStoryId}`),
    enabled: !!curStoryId,
  })
  const chapters = detail?.chapters ?? []
  const curChapterId = selectedChapterId ?? chapters[0]?.id ?? null
  const curChapter = chapters.find(c => c.id === curChapterId) ?? null
  const curChapterIndex = chapters.findIndex(c => c.id === curChapterId)

  const createStoryMutation = useMutation({
    mutationFn: (body: { title: string; description?: string }) =>
      apiClient<{ story: Story }>(`/api/app/projects/${pid}/stories`, { method: "POST", json: body }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["project", pid, "stories"] })
      setSelectedStoryId(res.story?.id ?? null)
      setCreateOpen(false)
      setCreateTitle("")
      setCreateDesc("")
    },
    onError: () => alert('建立故事失敗，請稍後再試'),
  })

  const createChapterMutation = useMutation({
    mutationFn: (title: string) =>
      apiClient<{ chapter: Chapter }>(`/api/app/projects/${pid}/stories/${curStoryId}/chapters`, {
        method: "POST",
        json: { title },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["project", pid, "story", curStoryId] })
      setSelectedChapterId(res.chapter?.id ?? null)
      setAddChOpen(false)
      setAddChTitle("")
    },
    onError: () => alert('建立分章失敗，請稍後再試'),
  })

  const patchChapterMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; title?: string; content?: string }) =>
      apiClient(`/api/app/projects/${pid}/stories/${curStoryId}/chapters/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", pid, "story", curStoryId] }),
  })

  const reorderChaptersMutation = useMutation({
    mutationFn: (ids: string[]) =>
      apiClient(`/api/app/projects/${pid}/stories/${curStoryId}/chapters/reorder`, { method: "PUT", json: { ids } }),
  })

  const patchStoryMutation = useMutation({
    mutationFn: (body: { title?: string; description?: string; status?: string }) =>
      apiClient<{ story: Story }>(`/api/app/projects/${pid}/stories/${curStoryId}`, { method: "PATCH", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", pid, "stories"] })
      setEditStoryOpen(false)
    },
  })

  function handleReorder(chId: string, dir: -1 | 1) {
    const ids = chapters.map(c => c.id)
    const fi = ids.indexOf(chId)
    if (fi < 0) return
    const ni = fi + dir
    if (ni < 0 || ni >= ids.length) return
    ;[ids[fi], ids[ni]] = [ids[ni], ids[fi]]
    qc.setQueryData(["project", pid, "story", curStoryId], (old: any) => {
      if (!old) return old
      const reordered = [...old.chapters]
      ;[reordered[fi], reordered[ni]] = [reordered[ni], reordered[fi]]
      return { ...old, chapters: reordered }
    })
    reorderChaptersMutation.mutate(ids)
  }

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[{ label: project.name, href: `/p/${pid}` }, "故事"]} />

      {status === "pending" && <LoadingSpinner />}
      {status === "error" && <p style={{ color: "var(--avoid)" }}>無法載入故事</p>}

      {status === "success" && stories.length === 0 && (
        <div className="ph-empty">
          <div className="ph-icon"><Icon name="book" size={40} /></div>
          <p>還沒有故事。建立第一個吧。</p>
          <button className="btn btn-accent" style={{ marginTop: "var(--s4)" }} onClick={() => setCreateOpen(true)}>
            ＋ 新增故事
          </button>
        </div>
      )}

      {status === "success" && stories.length > 0 && curStory && (
        <>
          {/* Story header with selector */}
          <div className="st-head">
            <div style={{ flex: 1, minWidth: 200 }}>
              <StorySelector
                stories={stories}
                current={curStory}
                onChange={id => { setSelectedStoryId(id); setSelectedChapterId(null) }}
              />
              <div className="meta" style={{ marginTop: 6 }}>
                <span className={`badge ${storyStatusCls(curStory.status)}`}>
                  {storyStatusLabel(curStory.status)}
                </span>
              </div>
              {curStory.description && (
                <p className="summary">{curStory.description}</p>
              )}
            </div>
            <div className="acts">
              <div className="st-toggle">
                <button
                  type="button"
                  className={view === "chapters" ? "on" : ""}
                  onClick={() => setView("chapters")}
                >章節</button>
                <button
                  type="button"
                  className={view === "timeline" ? "on" : ""}
                  onClick={() => setView("timeline")}
                >時間軸</button>
              </div>
              {view === "chapters" && (
                <button className="btn btn-sm" onClick={() => setAddChOpen(true)}>＋ 章節</button>
              )}
              <button className="btn btn-sm" onClick={() => {
                setEditStoryTitle(curStory.title)
                setEditStoryDesc(curStory.description ?? "")
                setEditStoryStatus(curStory.status as Story["status"])
                setEditStoryOpen(true)
              }}>⚙ 故事設定</button>
              <button className="btn btn-sm btn-accent" onClick={() => setCreateOpen(true)}>＋ 新故事</button>
            </div>
          </div>

          {/* 3-column layout */}
          {view === "chapters" && (
            <div className="st-cols">
              <ChapterOutline
                chapters={chapters}
                selectedId={curChapterId}
                onSelect={id => setSelectedChapterId(id)}
                onReorder={handleReorder}
              />
              <ChapterMain
                chapter={curChapter}
                index={curChapterIndex}
                onEdit={() => {}}
                onSaveContent={content => curChapterId && patchChapterMutation.mutate({ id: curChapterId, content })}
              />
              <SidePanel projectId={pid} chapter={curChapter} />
            </div>
          )}

          {view === "timeline" && (
            <div style={{ padding: "var(--s6) var(--s4)", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: "var(--s4)" }}>
                時間軸由獨立頁面管理，支援事件拖拉排序。
              </p>
              <Link to={`/p/${project.id}/timeline`} className="btn btn-accent">
                開啟時間軸 →
              </Link>
            </div>
          )}

          {/* Add chapter inline */}
          {addChOpen && (
            <div style={{ marginTop: "var(--s4)", display: "flex", gap: "var(--s2)", alignItems: "flex-start", maxWidth: 400 }}>
              <input
                className="field-input"
                placeholder="章節標題"
                value={addChTitle}
                onChange={e => setAddChTitle(e.target.value)}
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter" && addChTitle.trim()) createChapterMutation.mutate(addChTitle.trim())
                  if (e.key === "Escape") { setAddChOpen(false); setAddChTitle("") }
                }}
              />
              <button className="btn btn-ghost" onClick={() => { setAddChOpen(false); setAddChTitle("") }}>取消</button>
              <button
                className="btn btn-accent"
                disabled={!addChTitle.trim() || createChapterMutation.isPending}
                onClick={() => createChapterMutation.mutate(addChTitle.trim())}
              >
                建立
              </button>
            </div>
          )}
        </>
      )}

      {/* Create story modal */}
      {createOpen && (
        <div className="modal-overlay" onClick={() => setCreateOpen(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-h">
              <h2>新增故事</h2>
              <button className="modal-close" onClick={() => setCreateOpen(false)}><Icon name="x" size={15} /></button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
              <div>
                <label className="field-label">標題</label>
                <input className="field-input" placeholder="故事名稱" value={createTitle} onChange={e => setCreateTitle(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="field-label">說明（選填）</label>
                <input className="field-input" placeholder="簡短說明" value={createDesc} onChange={e => setCreateDesc(e.target.value)} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setCreateOpen(false)}>取消</button>
              <button
                className="btn btn-accent"
                disabled={!createTitle.trim() || createStoryMutation.isPending}
                onClick={() => createStoryMutation.mutate({ title: createTitle.trim(), description: createDesc.trim() || undefined })}
              >
                {createStoryMutation.isPending ? "建立中…" : "建立"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story settings modal */}
      {editStoryOpen && curStory && (
        <div className="modal-overlay" onClick={() => setEditStoryOpen(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-h">
              <h2>故事設定 · {curStory.title}</h2>
              <button className="modal-close" onClick={() => setEditStoryOpen(false)}><Icon name="x" size={15} /></button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
              <div>
                <label className="field-label">標題</label>
                <input
                  className="field-input"
                  value={editStoryTitle}
                  onChange={e => setEditStoryTitle(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", marginTop: 4 }}
                />
              </div>
              <div>
                <label className="field-label">簡介</label>
                <textarea
                  className="field-input"
                  value={editStoryDesc}
                  onChange={e => setEditStoryDesc(e.target.value)}
                  rows={3}
                  style={{ width: "100%", boxSizing: "border-box", resize: "vertical", marginTop: 4 }}
                />
              </div>
              <div>
                <label className="field-label">狀態</label>
                <select
                  className="field-input"
                  value={editStoryStatus}
                  onChange={e => setEditStoryStatus(e.target.value as Story["status"])}
                  style={{ width: "100%", boxSizing: "border-box", marginTop: 4 }}
                >
                  {(["draft", "ongoing", "completed", "archived"] as const).map(s => (
                    <option key={s} value={s}>{storyStatusLabel(s)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setEditStoryOpen(false)}>取消</button>
              <button
                className="btn btn-accent"
                disabled={patchStoryMutation.isPending || !editStoryTitle.trim()}
                onClick={() => patchStoryMutation.mutate({ title: editStoryTitle.trim(), description: editStoryDesc || undefined, status: editStoryStatus })}
              >
                {patchStoryMutation.isPending ? "儲存中⋯" : "儲存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
