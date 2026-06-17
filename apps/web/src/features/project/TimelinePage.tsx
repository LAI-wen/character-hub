import { useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { PageHeader } from "@/components/PageHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import type { StoryEventListResponse, StoryEvent } from "@oc-tools/contracts"
import { Icon } from "@/components/Icon"
import { LoadingSpinner } from "@/components/LoadingSpinner"

// ── Event item ────────────────────────────────────────────────────────────────

function EventItem({
  event,
  projectId,
  isFirst,
  isLast,
  onSaved,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  event: StoryEvent
  projectId: string
  isFirst: boolean
  isLast: boolean
  onSaved: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(event.title)
  const [summary, setSummary] = useState(event.summary ?? "")
  const [timeLabel, setTimeLabel] = useState(event.timeLabel ?? "")
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await apiClient(`/api/app/projects/${projectId}/story-events/${event.id}`, {
        method: "PATCH",
        json: { title, summary: summary || undefined, timeLabel: timeLabel || undefined },
      })
      onSaved()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save()
    if (e.key === "Escape") {
      setTitle(event.title)
      setSummary(event.summary ?? "")
      setTimeLabel(event.timeLabel ?? "")
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="tl-item editing" onKeyDown={handleKeyDown}>
        <div className="tl-dot" />
        <div className="tl-card">
          <input
            className="inp tl-title-inp"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="事件標題"
            autoFocus
          />
          <input
            className="inp tl-label-inp"
            value={timeLabel}
            onChange={e => setTimeLabel(e.target.value)}
            placeholder="時間標記（如：上古時代、三年前、第一章）"
          />
          <textarea
            className="inp tl-sum-ta"
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="摘要（選填）"
            rows={3}
          />
          <div className="tl-card-foot">
            <button className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>取消</button>
            <button className="btn btn-sm btn-accent" disabled={saving || !title.trim()} onClick={save}>
              {saving ? "儲存中…" : "儲存"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tl-item" onClick={() => setEditing(true)}>
      <div className="tl-dot" />
      <div className="tl-card tl-card-view">
        {event.timeLabel && <div className="tl-lbl">{event.timeLabel}</div>}
        <div className="tl-nm">{event.title}</div>
        {event.summary && <p className="tl-sum">{event.summary}</p>}
        <div className="tl-actions">
          <button className="tl-mv" disabled={isFirst} onClick={e => { e.stopPropagation(); onMoveUp() }} title="往上移"><Icon name="arrowUp" size={14} /></button>
          <button className="tl-mv" disabled={isLast}  onClick={e => { e.stopPropagation(); onMoveDown() }} title="往下移"><Icon name="arrowDown" size={14} /></button>
          <button className="tl-del" onClick={e => { e.stopPropagation(); onDelete() }} title="刪除"><Icon name="trash" size={14} /></button>
        </div>
      </div>
    </div>
  )
}

// ── New event form ────────────────────────────────────────────────────────────

function NewEventForm({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [timeLabel, setTimeLabel] = useState("")
  const [summary, setSummary] = useState("")
  const [saving, setSaving] = useState(false)

  async function create() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await apiClient(`/api/app/projects/${projectId}/story-events`, {
        method: "POST",
        json: { title: title.trim(), timeLabel: timeLabel.trim() || undefined, summary: summary.trim() || undefined },
      })
      setTitle(""); setTimeLabel(""); setSummary("")
      setOpen(false)
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button className="btn btn-accent tl-add" onClick={() => setOpen(true)}
        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        <Icon name="plus" size={15} /> 新增事件
      </button>
    )
  }

  return (
    <div className="tl-new-form">
      <input
        className="inp"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="事件標題 *"
        autoFocus
        onKeyDown={e => { if (e.key === "Escape") setOpen(false) }}
      />
      <input
        className="inp"
        value={timeLabel}
        onChange={e => setTimeLabel(e.target.value)}
        placeholder="時間標記（如：上古時代、三年前、第一章）"
      />
      <textarea
        className="inp"
        value={summary}
        onChange={e => setSummary(e.target.value)}
        placeholder="摘要（選填）"
        rows={2}
      />
      <div style={{ display: "flex", gap: "var(--s2)", marginTop: "var(--s2)" }}>
        <button className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>取消</button>
        <button className="btn btn-sm btn-accent" disabled={saving || !title.trim()} onClick={create}>
          {saving ? "建立中…" : "建立"}
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TimelinePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useProjectContext()
  const qc = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, status } = useQuery({
    queryKey: ["project", projectId, "story-events"],
    queryFn: () => apiClient<StoryEventListResponse>(`/api/app/projects/${projectId}/story-events`),
    enabled: !!projectId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/api/app/projects/${projectId}/story-events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId, "story-events"] })
      setDeleteId(null)
    },
  })

  const events = data?.events ?? []

  function refresh() {
    qc.invalidateQueries({ queryKey: ["project", projectId, "story-events"] })
  }

  async function swapOrder(idA: string, keyA: string | null, idB: string, keyB: string | null) {
    const a = keyA ?? new Date().toISOString()
    const b = keyB ?? new Date().toISOString()
    await Promise.all([
      apiClient(`/api/app/projects/${projectId}/story-events/${idA}`, { method: "PATCH", json: { sortKey: b } }),
      apiClient(`/api/app/projects/${projectId}/story-events/${idB}`, { method: "PATCH", json: { sortKey: a } }),
    ])
    refresh()
  }

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[project.name, "時間軸"]} />
      <PageHeader
        title="時間軸"
        eyebrow="Timeline"
        sub="記錄故事中的事件，按時序排列，建立世界觀的歷史脈絡。"
      />

      <NewEventForm projectId={projectId!} onCreated={refresh} />

      {status === "pending" && (
        <LoadingSpinner />
      )}

      {status === "error" && (
        <p style={{ color: "var(--avoid)", padding: "var(--s4)" }}>無法載入時間軸，請稍後再試</p>
      )}

      {status === "success" && events.length === 0 && (
        <div className="tl-empty">
          <p style={{ color: "var(--text-faint)" }}>還沒有事件，點上方按鈕建立第一個吧。</p>
        </div>
      )}

      {events.length > 0 && (
        <div className="tl-list">
          {events.map((ev, i) => (
            <EventItem
              key={ev.id}
              event={ev}
              projectId={projectId!}
              isFirst={i === 0}
              isLast={i === events.length - 1}
              onSaved={refresh}
              onDelete={() => setDeleteId(ev.id)}
              onMoveUp={() => swapOrder(ev.id, ev.sortKey, events[i - 1].id, events[i - 1].sortKey)}
              onMoveDown={() => swapOrder(ev.id, ev.sortKey, events[i + 1].id, events[i + 1].sortKey)}
            />
          ))}
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-h">
              <h2>刪除這個事件？</h2>
              <button className="modal-close" aria-label="關閉" onClick={() => setDeleteId(null)}><Icon name="x" size={15} /></button>
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
