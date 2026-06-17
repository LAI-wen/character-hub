import { useState, useCallback, Fragment } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { apiClient } from "@/lib/api/client"
import { PageHeader } from "@/components/PageHeader"
import { ContextHeader } from "@/components/ContextHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import type { WorldEntry, WorldEntryListResponse } from "@oc-tools/contracts"
import { typeLabel, typeColor } from "@/lib/worldviewTypes"

type TreeNode = WorldEntry & { children: TreeNode[] }

function buildTree(all: WorldEntry[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  for (const e of all) map.set(e.id, { ...e, children: [] })
  const roots: TreeNode[] = []
  for (const node of map.values()) {
    if (node.parentId) map.get(node.parentId)?.children.push(node)
    else roots.push(node)
  }
  return roots
}

function getDescendantIds(entries: WorldEntry[], id: string): Set<string> {
  const result = new Set<string>()
  const queue = [id]
  while (queue.length) {
    const cur = queue.shift()!
    for (const e of entries) {
      if (e.parentId === cur) {
        result.add(e.id)
        queue.push(e.id)
      }
    }
  }
  return result
}

function RootDropZone({ visible }: { visible: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "__root__" })
  if (!visible) return null
  return (
    <div ref={setNodeRef} className={"wv-root-drop" + (isOver ? " over" : "")}>
      拖到這裡 → 設為頂層條目
    </div>
  )
}

function GapZone({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return <div ref={setNodeRef} className={"wv-gap" + (isOver ? " over" : "")} />
}

function TreeRow({
  entry,
  level,
  selId,
  expanded,
  onSelect,
  onToggle,
  activeDragId,
  dragDescendants,
}: {
  entry: TreeNode
  level: number
  selId: string | null
  expanded: Record<string, boolean>
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  activeDragId: string | null
  dragDescendants: Set<string>
}) {
  const hasKids = entry.children.length > 0
  const open = expanded[entry.id] !== false
  const color = typeColor(entry.type)

  const { setNodeRef: setDragRef, listeners, attributes, isDragging } = useDraggable({ id: entry.id })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `drop-${entry.id}` })

  const rowRef = useCallback(
    (el: HTMLDivElement | null) => { setDropRef(el) },
    [setDropRef],
  )

  const isValidTarget = activeDragId && activeDragId !== entry.id && !dragDescendants.has(entry.id)

  return (
    <div className="wv-node" style={{ opacity: isDragging ? 0.35 : 1 }}>
      <div
        ref={rowRef}
        className={"wv-row" + (selId === entry.id ? " sel" : "") + (isOver && isValidTarget ? " drop-over" : "")}
        onClick={() => onSelect(entry.id)}
        style={level > 0 ? { paddingLeft: 8 + level * 14 } : undefined}
      >
        <span
          className={"tw" + (hasKids ? "" : " leaf")}
          onClick={(e) => {
            if (!hasKids) return
            e.stopPropagation()
            onToggle(entry.id)
          }}
        >
          {hasKids ? (open ? "▾" : "▸") : "·"}
        </span>
        <span className="ic" style={{ background: color }} />
        <Link
          className="nm"
          to={`/p/${entry.projectId}/worldview/${entry.id}`}
          onClick={e => e.stopPropagation()}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          {entry.title}
        </Link>
        <span className="ty">{typeLabel(entry.type)}</span>
        <span
          ref={setDragRef}
          {...listeners}
          {...attributes}
          className="drag-h"
          onClick={e => e.stopPropagation()}
          title="拖曳換父層"
        >
          ⠿
        </span>
      </div>
      {hasKids && open && (
        <div className="wv-children">
          <GapZone id={`gap|${entry.id}|0`} />
          {entry.children.map((child, i) => (
            <Fragment key={child.id}>
              <TreeRow
                entry={child}
                level={level + 1}
                selId={selId}
                expanded={expanded}
                onSelect={onSelect}
                onToggle={onToggle}
                activeDragId={activeDragId}
                dragDescendants={dragDescendants}
              />
              <GapZone id={`gap|${entry.id}|${i + 1}`} />
            </Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

function DetailPanel({
  entry,
  projectId,
}: {
  entry: WorldEntry | null
  projectId: string
}) {
  if (!entry) {
    return (
      <div className="wv-detail">
        <div className="wv-empty-detail">選擇左側的條目以檢視詳情。</div>
      </div>
    )
  }
  const color = typeColor(entry.type)
  return (
    <div className="wv-detail">
      <div className="strip" style={{ background: color }} />
      <div className="wv-dh">
        <h1>
          <Link to={`/p/${projectId}/worldview/${entry.id}`} style={{ color: "inherit", textDecoration: "none" }}>
            {entry.title}
          </Link>
          <span className="typebadge" style={{ background: color }}>
            {typeLabel(entry.type)}
          </span>
        </h1>
        <div className="acts">
          <Link to={`/p/${projectId}/worldview/${entry.id}`} className="btn btn-sm">詳情 →</Link>
          <Link to={`/p/${projectId}/worldview/${entry.id}/edit`} className="btn btn-sm">✎ 編輯</Link>
          <Link to={`/p/${projectId}/worldview/new?parent=${entry.id}`} className="btn btn-sm">＋ 子條目</Link>
        </div>
      </div>
      <div className="wv-body">
        <div className="wv-section">
          <div className="sh2">摘要</div>
          <div className="wv-content">{entry.summary ?? "—"}</div>
        </div>
        <div className="wv-section">
          <div className="sh2">內容</div>
          {entry.content || entry.body ? (
            <div className="wv-content">{entry.content ?? entry.body}</div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-faint)" }}>
              這個條目還沒有內容。
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function WorldviewPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useProjectContext()
  const qc = useQueryClient()

  const [selId, setSelId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [q, setQ] = useState("")
  const [typeF, setTypeF] = useState("*")
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const { data, status } = useQuery({
    queryKey: ["project", projectId, "world-entries"],
    queryFn: () =>
      apiClient<WorldEntryListResponse>(
        `/api/app/projects/${projectId}/world-entries`,
      ),
    enabled: !!projectId,
  })

  const reparentMutation = useMutation({
    mutationFn: ({ entryId, parentId }: { entryId: string; parentId: string | null }) =>
      apiClient(`/api/app/projects/${projectId}/world-entries/${entryId}`, {
        method: "PATCH",
        json: { parentId },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId, "world-entries"] }),
    onError: () => alert('移動失敗，請稍後再試'),
  })

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; parentId?: string | null; sortOrder: number }[]) => {
      await Promise.all(updates.map(u =>
        apiClient(`/api/app/projects/${projectId}/world-entries/${u.id}`, {
          method: "PATCH",
          json: { sortOrder: u.sortOrder, ...(u.parentId !== undefined ? { parentId: u.parentId } : {}) },
        })
      ))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId, "world-entries"] }),
    onError: () => alert('排序儲存失敗，請稍後再試'),
  })

  const allEntries = data?.entries ?? []
  const availableTypes = ["*", ...new Set(allEntries.map((e) => e.type))]
  const filtered = allEntries.filter((e) => {
    if (typeF !== "*" && e.type !== typeF) return false
    if (q && !(e.title + " " + (e.summary ?? "")).toLowerCase().includes(q.toLowerCase())) return false
    return true
  })
  const isFiltering = q || typeF !== "*"
  const tree = buildTree(filtered)

  const firstRootId = allEntries.find((e) => !e.parentId)?.id ?? null
  const effectiveSel = selId ?? firstRootId
  const selectedEntry = allEntries.find((e) => e.id === effectiveSel) ?? null

  const dragDescendants = activeDragId ? getDescendantIds(allEntries, activeDragId) : new Set<string>()
  const activeEntry = activeDragId ? allEntries.find(e => e.id === activeDragId) : null

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] !== false) }))
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveDragId(active.id as string)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveDragId(null)
    if (!over) return

    const dragId = active.id as string
    const dropId = over.id as string

    // Gap drop → reorder (and optionally reparent)
    if (dropId.startsWith("gap|")) {
      const [, parentPart, gapPart] = dropId.split("|")
      const gapIdx = parseInt(gapPart)
      const actualParentId = parentPart === "__root__" ? null : parentPart
      if (dragDescendants.has(actualParentId ?? "")) return // can't drop into own descendant

      const siblings = allEntries
        .filter(e => (e.parentId ?? null) === actualParentId && e.id !== dragId && !e.archivedAt)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.createdAt.localeCompare(b.createdAt))

      const draggedEntry = allEntries.find(e => e.id === dragId)!
      const newOrder = [...siblings]
      newOrder.splice(gapIdx, 0, draggedEntry)

      const updates = newOrder.map((e, idx) => ({
        id: e.id,
        sortOrder: (idx + 1) * 1000,
        ...(e.id === dragId && (draggedEntry.parentId ?? null) !== actualParentId
          ? { parentId: actualParentId }
          : {}),
      }))

      reorderMutation.mutate(updates)
      return
    }

    // Root drop → reparent to top level
    if (dropId === "__root__") {
      const entry = allEntries.find(e => e.id === dragId)
      if ((entry?.parentId ?? null) !== null) {
        reparentMutation.mutate({ entryId: dragId, parentId: null })
      }
      return
    }

    // Entry drop → reparent (make child of target)
    if (!dropId.startsWith("drop-")) return
    const targetId = dropId.slice(5)
    if (targetId === dragId) return
    if (dragDescendants.has(targetId)) return
    reparentMutation.mutate({ entryId: dragId, parentId: targetId })
  }

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[project.name, "世界觀"]} />
      <PageHeader
        title="世界觀"
        eyebrow="Worldview"
        sub={`${project.name} 的設定集：國家、組織、地點、事件，可建立階層與關聯角色。`}
        action={
          <Link to={`/p/${projectId}/worldview/new`} className="btn btn-accent">
            ＋ 新增條目
          </Link>
        }
      />

      {status === "pending" && (
        <p style={{ color: "var(--text-faint)" }}>載入中⋯</p>
      )}
      {status === "error" && (
        <p style={{ color: "var(--avoid)" }}>無法載入世界觀條目</p>
      )}

      {status === "success" && allEntries.length === 0 && (
        <p style={{ color: "var(--text-faint)" }}>
          世界觀已啟用，但還沒有條目。
        </p>
      )}

      {status === "success" && allEntries.length > 0 && (
        <div className="wv-cols">
          <div className="wv-list-pane">
            <div className="wv-list-head">
              <div className="searchf">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="search"
                  placeholder="搜尋條目…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  style={{ minWidth: 0, width: "100%" }}
                />
              </div>
              {availableTypes.length > 2 && (
                <div className="filterbar">
                  {availableTypes.map((t) => (
                    <button
                      key={t}
                      className={"fbtn" + (t === typeF ? " on" : "")}
                      onClick={() => setTypeF(t)}
                    >
                      {t === "*" ? "全部" : typeLabel(t)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={"wv-tree" + (activeDragId ? " dragging" : "")}>
              {filtered.length === 0 ? (
                <p style={{ padding: "var(--s4)", color: "var(--text-faint)", fontSize: 13 }}>
                  找不到符合的條目。
                </p>
              ) : isFiltering ? (
                filtered.map((e) => (
                  <div
                    key={e.id}
                    className={"wv-row" + (effectiveSel === e.id ? " sel" : "")}
                    onClick={() => setSelId(e.id)}
                  >
                    <span className="tw leaf">·</span>
                    <span className="ic" style={{ background: typeColor(e.type) }} />
                    <Link
                      className="nm"
                      to={`/p/${e.projectId}/worldview/${e.id}`}
                      onClick={ev => ev.stopPropagation()}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      {e.title}
                    </Link>
                    <span className="ty">{typeLabel(e.type)}</span>
                  </div>
                ))
              ) : (
                <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  <RootDropZone visible={!!activeDragId} />
                  <GapZone id="gap|__root__|0" />
                  {tree.map((node, i) => (
                    <Fragment key={node.id}>
                      <TreeRow
                        entry={node}
                        level={0}
                        selId={effectiveSel}
                        expanded={expanded}
                        onSelect={setSelId}
                        onToggle={toggleExpand}
                        activeDragId={activeDragId}
                        dragDescendants={dragDescendants}
                      />
                      <GapZone id={`gap|__root__|${i + 1}`} />
                    </Fragment>
                  ))}
                  <DragOverlay dropAnimation={null}>
                    {activeEntry ? (
                      <div className="wv-drag-overlay">
                        <span className="ic" style={{ background: typeColor(activeEntry.type) }} />
                        {activeEntry.title}
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </div>

          <DetailPanel entry={selectedEntry} projectId={projectId!} />
        </div>
      )}
    </div>
  )
}
