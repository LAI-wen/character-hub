import { useRef, useState, useEffect, useReducer } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { PageHeader } from "@/components/PageHeader"
import { ContextHeader } from "@/components/ContextHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import { CreateRelationshipModal } from "./CreateRelationshipModal"
import { typeColor } from "@/lib/worldviewTypes"
import { charColor } from "@/lib/charColor"
import type {
  Relationship,
  RelationshipGroup,
  RelationshipListResponse,
  ProjectCharacterLinkListResponse,
  WorldEntryListResponse,
  WorldEntry,
  Character,
} from "@oc-tools/contracts"

// ── helpers ───────────────────────────────────────────────────────────────────

const ENTITY_GLYPH: Record<string, string> = {
  org:"▣", event:"✦", place:"⬟", nation:"◉", faction:"◈",
}
function worldColor(e: WorldEntry) {
  return typeColor(e.type)
}

function circularPos(ids: string[], W: number, H: number) {
  const cx = W/2, cy = H/2, r = Math.min(W,H)*0.36
  const out: Record<string, {x:number;y:number}> = {}
  ids.forEach((id, i) => {
    const a = (2*Math.PI*i)/ids.length - Math.PI/2
    out[id] = { x: cx + r*Math.cos(a), y: cy + r*Math.sin(a) }
  })
  return out
}

// quadratic bezier point at t
function qpt(ax:number,ay:number, cx:number,cy:number, bx:number,by:number, t:number) {
  const u = 1-t
  return { x: u*u*ax + 2*u*t*cx + t*t*bx, y: u*u*ay + 2*u*t*cy + t*t*by }
}

// ── types ─────────────────────────────────────────────────────────────────────

type EntityNode = {
  id: string
  name: string
  color: string
  isWorld: boolean
  worldEntry?: WorldEntry
  character?: Character
}

// ── Map Canvas ────────────────────────────────────────────────────────────────

function RelMapCanvas({
  rels, nodes, groups, positions, selRelId, selGroupId, focusNodeId,
  onSelectRel, onSelectGroup, onNodeDragStart, W, H,
}: {
  rels: Relationship[]
  nodes: EntityNode[]
  groups: RelationshipGroup[]
  positions: Record<string, {x:number;y:number}>
  selRelId: string|null
  selGroupId: string|null
  focusNodeId: string|null
  onSelectRel: (id:string)=>void
  onSelectGroup: (id:string)=>void
  onNodeDragStart: (id:string, e:React.MouseEvent)=>void
  W: number; H: number
}) {
  function pos(id: string) { return positions[id] ?? {x:W/2, y:H/2} }

  // Build edge render data
  const edges = rels.map(r => {
    const a = pos(r.sourceId), b = pos(r.targetId)
    const mx=(a.x+b.x)/2, my=(a.y+b.y)/2
    const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy)||1
    let px=-dy/len, py=dx/len
    if (px*(W/2-mx)+py*(H/2-my) > 0) { px=-px; py=-py }
    const h = Math.max(6, len*0.15)
    const qx=mx+px*2*h, qy=my+py*2*h
    const lx=mx+px*h,   ly=my+py*h   // label midpoint
    const isHi = selRelId===r.id
    const isDim = !!selRelId && !isHi
    return { r, d:`M${a.x} ${a.y} Q${qx} ${qy} ${b.x} ${b.y}`,
             qx, qy, lx, ly, isHi, isDim, a, b }
  })

  // Group hulls
  const hulls = groups.map(g => {
    const pts = g.memberIds.map(id => pos(id)).filter(p => p.x !== W/2 || p.y !== H/2)
    if (pts.length < 1) return null
    const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y)
    const minx=Math.min(...xs), maxx=Math.max(...xs)
    const miny=Math.min(...ys), maxy=Math.max(...ys)
    const cx=(minx+maxx)/2, cy=(miny+maxy)/2
    const rx=Math.max(14,(maxx-minx)/2+13), ry=Math.max(13,(maxy-miny)/2+15)
    const isHi = selGroupId===g.id
    return { g, cx, cy, rx, ry, isHi, labelY: cy-ry }
  }).filter((h): h is { g: RelationshipGroup; cx: number; cy: number; rx: number; ry: number; isHi: boolean; labelY: number } => h !== null)

  // Adjacent node IDs for focus dimming
  const adjToFocus = focusNodeId ? new Set(
    rels.filter(r=>r.sourceId===focusNodeId||r.targetId===focusNodeId)
        .flatMap(r=>[r.sourceId,r.targetId])
  ) : null

  return (
    <>
      {/* SVG layer: group hulls + edges */}
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
        {/* group hulls — behind edges */}
        {hulls.map(({g, cx, cy, rx, ry, isHi}) => (
          <ellipse
            key={g.id}
            className={"rl1-group-ring" + (isHi ? " hi" : "")}
            cx={cx} cy={cy} rx={rx} ry={ry}
            style={{ color:g.color, stroke:g.color, pointerEvents:"stroke", cursor:"pointer" }}
            onClick={(e)=>{ e.stopPropagation(); onSelectGroup(g.id) }}
          />
        ))}
        {/* edges */}
        {edges.map(({r, d, isHi, isDim}) => (
          <path
            key={r.id}
            d={d}
            className={"rl1-map svg path" + (isHi ? " hi" : isDim ? " dim" : "")}
            style={{
              fill:"none",
              stroke: isHi ? "var(--accent)" : isDim ? "var(--border)" : "var(--border-strong)",
              strokeWidth: isHi ? 2.5 : 1.5,
              opacity: isDim ? 0.35 : 1,
            }}
          />
        ))}
      </svg>

      {/* Group name labels */}
      {hulls.map(({g, cx, labelY, isHi}) => (
        <div
          key={g.id+"-lbl"}
          className={"rl1-glabel" + (isHi ? " hi" : "")}
          style={{ left:cx, top:labelY, color:g.color, borderColor:g.color }}
          onClick={(e)=>{ e.stopPropagation(); onSelectGroup(g.id) }}
        >
          {g.name}
        </div>
      ))}

      {/* Edge labels */}
      {edges.map(({r, lx, ly, qx, qy, a, b, isHi, isDim}) => {
        const srcNode = nodes.find(n=>n.id===r.sourceId)
        const tgtNode = nodes.find(n=>n.id===r.targetId)
        const isArrows = r.mapStyle === "arrows" && r.srcView && r.tgtView
        if (isArrows && srcNode && tgtNode) {
          const p1 = qpt(a.x,a.y,qx,qy,b.x,b.y,0.30)
          const p2 = qpt(a.x,a.y,qx,qy,b.x,b.y,0.70)
          return (
            <span key={r.id+"-lbl"}>
              <div className={"rl1-dlabel" + (isHi ? " hi" : "")}
                style={{left:p1.x, top:p1.y, background:srcNode.color, opacity:isDim?.35:undefined}}>
                <span className="ar">▸</span>
                {String(r.srcView ?? "").replace(/\s*[A-Za-z][\s\S]*$/,"").trim() || r.srcView}
              </div>
              <div className={"rl1-dlabel" + (isHi ? " hi" : "")}
                style={{left:p2.x, top:p2.y, background:tgtNode.color, opacity:isDim?.35:undefined}}>
                <span className="ar">▸</span>
                {String(r.tgtView ?? "").replace(/\s*[A-Za-z][\s\S]*$/,"").trim() || r.tgtView}
              </div>
            </span>
          )
        }
        const isAsym = !!(r.srcView && r.tgtView && r.srcView !== r.tgtView)
        return (
          <div
            key={r.id+"-lbl"}
            className={"rl1-elabel" + (isHi ? " hi" : "")}
            style={{left:lx, top:ly, opacity:isDim?.3:undefined}}
            onClick={()=>onSelectRel(r.id)}
          >
            {(r.label ?? r.type ?? "關係").replace(/\s*[A-Za-z][\s\S]*$/,"") || r.label}
            {isAsym && <span style={{color:"var(--accent)",marginLeft:3}}>{/戀|♡|愛|喜歡/i.test((r.srcView||"")+(r.tgtView||""))?"♡":"⇄"}</span>}
          </div>
        )
      })}

      {/* Nodes */}
      {nodes.map(node => {
        const {x,y} = pos(node.id)
        const isSel = focusNodeId===node.id
        const isDim = !!adjToFocus && !adjToFocus.has(node.id)
        const glyph = node.isWorld
          ? (ENTITY_GLYPH[(node.worldEntry?.type??"")] ?? node.name.slice(0,1))
          : node.name.slice(0,1)
        return (
          <div
            key={node.id}
            className={"rl1-node" + (node.isWorld?" entity":"") + (isSel?" sel":"") + (isDim?" dim":"")}
            style={{left:x, top:y, cursor:"grab"}}
            onMouseDown={(e)=>{ e.stopPropagation(); onNodeDragStart(node.id, e) }}
          >
            <span className="av" style={{background:node.color}}>{glyph}</span>
            <div className="lab">
              {node.name}
              {node.character?.romaji && <span className="rom">{node.character.romaji}</span>}
              {node.isWorld && node.worldEntry && (
                <span className="rom">{node.worldEntry.type}</span>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}

// ── Pair Card ─────────────────────────────────────────────────────────────────

function PairCard({
  rel, nodes, onEdit, onDelete,
}: {
  rel: Relationship|null
  nodes: EntityNode[]
  onEdit?: () => void
  onDelete?: () => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  if (!rel) return (
    <div className="rl1-pair-card">
      <div className="rl1-empty-hint">點選地圖上的角色或下方關係，查看雙人設定。</div>
    </div>
  )
  const src = nodes.find(n=>n.id===rel.sourceId)
  const tgt = nodes.find(n=>n.id===rel.targetId)
  const srcColor = src?.color ?? charColor(rel.sourceId)
  const tgtColor = tgt?.color ?? charColor(rel.targetId)
  const relLabel = rel.label ?? rel.type ?? "關係"
  const isAsym = !!(rel.srcView && rel.tgtView)

  return (
    <div className="rl1-pair-card">
      <div className="rl1-pair-head">
        <div className="rl1-pair-avs">
          <span className="av" style={{background:srcColor}}>{(src?.name??"?").slice(0,1)}</span>
          <span className="av" style={{background:tgtColor}}>{(tgt?.name??"?").slice(0,1)}</span>
        </div>
        <div>
          <h2>{src?.name??rel.sourceId} × {tgt?.name??rel.targetId}</h2>
          <span className="rel">{relLabel}{isAsym ? " · 不對稱" : ""}</span>
        </div>
      </div>

      {/* Dual-perspective cards */}
      {isAsym && (
        <>
          <p className="rl1-sub-h" style={{marginTop:"var(--s5)"}}>雙向視角 · Two-way</p>
          <div className="rl1-dual">
            <div className="rl1-vc">
              <div className="rl1-vh">
                <span className="va" style={{background:srcColor}}>{(src?.name??"").slice(0,1)}</span>
                →
                <span className="va" style={{background:tgtColor}}>{(tgt?.name??"").slice(0,1)}</span>
                <span>{src?.name} 眼中的 {tgt?.name}</span>
              </div>
              <span className="rl1-vlabel">{rel.srcView}</span>
            </div>
            <div className="rl1-vc">
              <div className="rl1-vh">
                <span className="va" style={{background:tgtColor}}>{(tgt?.name??"").slice(0,1)}</span>
                →
                <span className="va" style={{background:srcColor}}>{(src?.name??"").slice(0,1)}</span>
                <span>{tgt?.name} 眼中的 {src?.name}</span>
              </div>
              <span className="rl1-vlabel">{rel.tgtView}</span>
            </div>
          </div>
        </>
      )}

      {rel.description
        ? <p className="rl1-pair-desc">{rel.description}</p>
        : <p className="rl1-pair-desc" style={{color:"var(--text-faint)",fontStyle:"italic"}}>尚無關係描述。</p>
      }

      {rel.timeline && rel.timeline.length > 0 && (
        <>
          <p className="rl1-sub-h">關係時間線 · Timeline</p>
          <div className="rl1-timeline">
            {rel.timeline.map(([when, what], i) => (
              <div key={i} className="rl1-tl-item">
                <div className="when">{when}</div>
                <div className="what">{what}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* World-entry link */}
      {(src?.isWorld || tgt?.isWorld) && (
        <div style={{display:"flex",gap:"var(--s2)",flexWrap:"wrap",marginTop:"var(--s4)"}}>
          {src?.isWorld && (
            <Link to={`../worldview`} className="btn btn-sm" style={{fontSize:11}}>
              → {src.name}（世界觀）
            </Link>
          )}
          {tgt?.isWorld && (
            <Link to={`../worldview`} className="btn btn-sm" style={{fontSize:11}}>
              → {tgt.name}（世界觀）
            </Link>
          )}
        </div>
      )}

      {/* Edit / delete actions */}
      {(onEdit || onDelete) && (
        <div style={{display:"flex",gap:"var(--s2)",marginTop:"var(--s5)",paddingTop:"var(--s4)",borderTop:"1px solid var(--border)"}}>
          {onEdit && (
            <button className="btn btn-sm" onClick={onEdit}>✎ 編輯</button>
          )}
          {onDelete && !confirmDel && (
            <button className="btn btn-sm" style={{color:"var(--avoid)"}} onClick={() => setConfirmDel(true)}>
              刪除
            </button>
          )}
          {confirmDel && (
            <>
              <span style={{fontSize:13,color:"var(--avoid)",alignSelf:"center"}}>確定刪除？</span>
              <button className="btn btn-sm" style={{background:"var(--avoid)",color:"#fff"}} onClick={onDelete}>確認</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setConfirmDel(false)}>取消</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Group Card ────────────────────────────────────────────────────────────────

function GroupCard({ group, nodes }: { group: RelationshipGroup|null; nodes: EntityNode[] }) {
  if (!group) return null
  const members = group.memberIds.map(id=>nodes.find(n=>n.id===id)).filter(Boolean) as EntityNode[]
  const col = group.color ?? "#A67F0E"
  return (
    <div className="rl1-pair-card">
      <div className="rl1-pair-head">
        <div className="rl1-pair-avs">
          {members.slice(0,4).map(m=>(
            <span key={m.id} className="av" style={{background:m.color}}>{m.name.slice(0,1)}</span>
          ))}
        </div>
        <div>
          <h2>{group.name}</h2>
          <span className="rel" style={{background:col+"1a",borderColor:col,color:col}}>
            群組 · {members.length} 人
          </span>
        </div>
      </div>

      {group.description
        ? <p className="rl1-pair-desc">{group.description}</p>
        : <p className="rl1-pair-desc" style={{color:"var(--text-faint)",fontStyle:"italic"}}>尚無群組描述。</p>
      }

      <p className="rl1-sub-h">成員 · Members</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:"var(--s5)"}}>
        {members.map(m=>(
          <span key={m.id} className="rl1-rchip" style={{fontSize:12}}>
            <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:m.color,marginRight:5}}/>
            {m.name}
          </span>
        ))}
      </div>

      {group.timeline && group.timeline.length > 0 && (
        <>
          <p className="rl1-sub-h">群組時間線 · Timeline</p>
          <div className="rl1-timeline">
            {group.timeline.map(([when, what], i) => (
              <div key={i} className="rl1-tl-item">
                <div className="when">{when}</div>
                <div className="what">{what}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function RelationshipsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useProjectContext()
  const [searchParams] = useSearchParams()
  const mapRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ W: 700, H: 460 })

  // Deep-link: ?focus=entityId
  const [focusNodeId, setFocusNodeId] = useState<string|null>(
    () => searchParams.get("focus")
  )
  const [selRelId,   setSelRelId]   = useState<string|null>(null)
  const [selGroupId, setSelGroupId] = useState<string|null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editRelId,      setEditRelId]      = useState<string|null>(null)
  const [q,              setQ]              = useState("")
  const [typeFilter,     setTypeFilter]     = useState("*")
  const [viewMode,       setViewMode]       = useState<"map"|"list">("map")
  const localPositionsRef = useRef<Record<string, {x:number;y:number}> | null>(null)
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)
  const rafRef = useRef<number | null>(null)
  const dragRef = useRef<{
    nodeId: string; startX: number; startY: number
    origX: number; origY: number; moved: boolean
  } | null>(null)
  const qc = useQueryClient()

  useEffect(() => {
    if (!mapRef.current) return
    const el = mapRef.current
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth > 0) setDims({ W: el.offsetWidth, H: el.offsetHeight || 460 })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── queries ──────────────────────────────────────────────────────────────
  const relQuery = useQuery({
    queryKey: ["project", projectId, "relationships"],
    queryFn: () => apiClient<RelationshipListResponse>(`/api/app/projects/${projectId}/relationships`),
    enabled: !!projectId,
  })
  const rosterQuery = useQuery({
    queryKey: ["project", projectId, "roster"],
    queryFn: () => apiClient<ProjectCharacterLinkListResponse>(`/api/app/projects/${projectId}/characters`),
    enabled: !!projectId,
  })
  const worldQuery = useQuery({
    queryKey: ["project", projectId, "world-entries"],
    queryFn: () => apiClient<WorldEntryListResponse>(`/api/app/projects/${projectId}/world-entries`),
    enabled: !!projectId,
  })

  // ── derived maps ─────────────────────────────────────────────────────────
  const charMap = new Map<string, Character>()
  for (const { character } of rosterQuery.data?.roster ?? []) {
    if (character) charMap.set(character.id, character)
  }
  const worldMap = new Map<string, WorldEntry>()
  for (const e of worldQuery.data?.entries ?? []) {
    worldMap.set(e.id, e)
  }

  const allRels    = relQuery.data?.relationships ?? []
  const allGroups  = relQuery.data?.groups        ?? []
  const layoutData = relQuery.data?.layout as Record<string, {x:number;y:number}>|undefined

  // Build unified entity node list
  const nodeIdSet = new Set<string>()
  for (const r of allRels) { nodeIdSet.add(r.sourceId); nodeIdSet.add(r.targetId) }
  for (const g of allGroups) { for (const id of g.memberIds) nodeIdSet.add(id) }

  const nodes: EntityNode[] = Array.from(nodeIdSet).map(id => {
    const char = charMap.get(id)
    if (char) return { id, name: char.name, color: charColor(id), isWorld: false, character: char }
    const we = worldMap.get(id)
    if (we)   return { id, name: we.title, color: worldColor(we), isWorld: true, worldEntry: we }
    return { id, name: id.slice(0,8), color: "#8A857C", isWorld: false }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (relId: string) =>
      apiClient(`/api/app/projects/${projectId}/relationships/${relId}`, { method: "DELETE" }),
    onSuccess: (_, relId) => {
      qc.invalidateQueries({ queryKey: ["project", projectId, "relationships"] })
      if (selRelId === relId) setSelRelId(null)
    },
    onError: () => alert("刪除失敗，請稍後再試"),
  })

  // Layout save mutation (don't invalidate — positions already in localPositions)
  const layoutMutation = useMutation({
    mutationFn: (nodes: Record<string, {x:number;y:number}>) =>
      apiClient(`/api/app/projects/${projectId}/relationship-layout`, {
        method: "PATCH",
        body: { nodes },
      }),
  })

  // Filtered rels for legend (search + type filter)
  const filteredRels = allRels.filter(r => {
    if (typeFilter !== "*" && (r.type ?? r.label ?? "") !== typeFilter) return false
    if (!q) return true
    const src = nodes.find(n => n.id === r.sourceId)
    const tgt = nodes.find(n => n.id === r.targetId)
    const text = [r.label, r.type, src?.name, tgt?.name].filter(Boolean).join(" ").toLowerCase()
    return text.includes(q.toLowerCase())
  })

  const availableTypes = ["*", ...new Set(allRels.map(r => r.type ?? r.label ?? "").filter(Boolean))]

  // Node positions
  const { W, H } = dims
  let positions: Record<string, {x:number;y:number}>
  const nodeIds = nodes.map(n=>n.id)
  if (layoutData && Object.keys(layoutData).length > 0) {
    positions = {}
    for (const id of nodeIds) {
      const p = layoutData[id]
      positions[id] = p ? { x: p.x*W, y: p.y*H } : { x: W/2, y: H/2 }
    }
  } else {
    positions = circularPos(nodeIds, W, H)
  }

  // Effective positions: local drag overrides saved positions (ref-based, no extra renders)
  const effectivePositions = localPositionsRef.current
    ? { ...positions, ...localPositionsRef.current }
    : positions

  // Select helpers
  function handleSelectRel(id: string) {
    setSelRelId(id); setSelGroupId(null)
  }
  function handleSelectGroup(id: string) {
    setSelGroupId(id); setSelRelId(null)
    const g = allGroups.find(x=>x.id===id)
    if (g && g.memberIds.length > 0) setFocusNodeId(null)
  }
  function handleFocusNode(id: string|null) {
    setFocusNodeId(id); setSelGroupId(null)
    if (id) {
      const first = allRels.find(r=>r.sourceId===id||r.targetId===id)
      if (first) { setSelRelId(first.id); setSelGroupId(null) }
    }
  }

  // Drag handlers
  function handleNodeDragStart(nodeId: string, e: React.MouseEvent) {
    const base = effectivePositions[nodeId] ?? { x: W/2, y: H/2 }
    dragRef.current = {
      nodeId, startX: e.clientX, startY: e.clientY,
      origX: base.x, origY: base.y, moved: false,
    }
  }
  function handleMapMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (!dragRef.current.moved && Math.hypot(dx, dy) < 5) return
    dragRef.current.moved = true
    const id = dragRef.current.nodeId
    const nx = Math.max(20, Math.min(W - 20, dragRef.current.origX + dx))
    const ny = Math.max(20, Math.min(H - 20, dragRef.current.origY + dy))
    localPositionsRef.current = { ...(localPositionsRef.current ?? positions), [id]: { x: nx, y: ny } }
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => { rafRef.current = null; forceUpdate() })
    }
  }
  function handleMapMouseUp() {
    if (!dragRef.current) return
    const { nodeId, moved } = dragRef.current
    dragRef.current = null
    if (!moved) {
      handleFocusNode(focusNodeId === nodeId ? null : nodeId)
      return
    }
    const finalPos = localPositionsRef.current?.[nodeId]
    if (finalPos) {
      layoutMutation.mutate({ [nodeId]: { x: finalPos.x / W, y: finalPos.y / H } })
    }
  }

  const selectedRel   = allRels.find(r=>r.id===selRelId)   ?? null
  const selectedGroup = allGroups.find(g=>g.id===selGroupId) ?? null

  const legendGroups = allGroups

  const isPending = relQuery.status==="pending" || rosterQuery.status==="pending"
  const isError   = relQuery.status==="error"

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[project.name, "關係圖"]} />
      <PageHeader
        eyebrow="Relationships"
        title="關係圖"
        sub="點選角色或下方關係，查看雙人設定、共同相簿與關係時間線。"
        action={
          <button className="btn btn-accent" onClick={() => setShowCreate(true)}>＋ 新增關係</button>
        }
      />

      {isPending && <LoadingSpinner />}
      {isError   && <p style={{color:"var(--avoid)"}}>無法載入關係資料</p>}
      {!isPending && !isError && allRels.length===0 && (
        <p style={{color:"var(--text-faint)"}}>還沒有關係資料。</p>
      )}

      {!isPending && !isError && allRels.length > 0 && (
        <>
          {/* Search + filter toolbar */}
          <div className="wv-list-head" style={{marginBottom:"var(--s4)"}}>
            <div style={{display:"flex",gap:"var(--s2)",alignItems:"center"}}>
              <div className="mf-seg" style={{flex:"none"}}>
                <button className={viewMode==="map" ? "on" : ""} onClick={()=>setViewMode("map")}>🗺 圖</button>
                <button className={viewMode==="list" ? "on" : ""} onClick={()=>setViewMode("list")}>☰ 列表</button>
              </div>
              <div className="searchf" style={{flex:1}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input
                type="search"
                placeholder="搜尋關係…"
                value={q}
                onChange={e => setQ(e.target.value)}
                style={{minWidth:0,width:"100%"}}
              />
              </div>
            </div>
            {availableTypes.length > 2 && (
              <div className="filterbar">
                {availableTypes.map(t => (
                  <button
                    key={t}
                    className={"fbtn" + (t === typeFilter ? " on" : "")}
                    onClick={() => setTypeFilter(t)}
                  >
                    {t === "*" ? "全部" : t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rl1-maprow">
            {viewMode === "map" ? (
              /* ── Canvas view ── */
              <div>
                <div className="rl1-map-card">
                  <div
                    className="rl1-map"
                    ref={mapRef}
                    onMouseMove={handleMapMouseMove}
                    onMouseUp={handleMapMouseUp}
                    onMouseLeave={handleMapMouseUp}
                    style={{userSelect:"none"}}
                  >
                    <RelMapCanvas
                      rels={allRels} nodes={nodes} groups={allGroups}
                      positions={effectivePositions}
                      selRelId={selRelId} selGroupId={selGroupId} focusNodeId={focusNodeId}
                      onSelectRel={handleSelectRel}
                      onSelectGroup={handleSelectGroup}
                      onNodeDragStart={handleNodeDragStart}
                      W={W} H={H}
                    />
                  </div>
                </div>

                {/* Legend chips */}
                <div className="rl1-legend">
                  {(focusNodeId ? filteredRels.filter(r=>r.sourceId===focusNodeId||r.targetId===focusNodeId) : filteredRels).map(r => {
                    const s = nodes.find(n=>n.id===r.sourceId)
                    const t = nodes.find(n=>n.id===r.targetId)
                    const label = (r.label??r.type??"關係").replace(/\s*[A-Za-z][\s\S]*$/,"").trim() || r.label
                    return (
                      <button
                        key={r.id}
                        className={"rl1-rchip" + (selRelId===r.id ? " on" : "")}
                        onClick={()=>handleSelectRel(r.id)}
                      >
                        {s?.name??r.sourceId} × {t?.name??r.targetId} · {label}
                      </button>
                    )
                  })}
                  {legendGroups.map(g => (
                    <button
                      key={g.id}
                      className={"rl1-rchip group" + (selGroupId===g.id ? " on" : "")}
                      style={{borderColor: g.color}}
                      onClick={()=>handleSelectGroup(g.id)}
                    >
                      {g.name}（{g.memberIds.length}）
                    </button>
                  ))}
                  {focusNodeId && (
                    <button className="rl1-rchip" style={{borderStyle:"dashed"}}
                      onClick={()=>{ setFocusNodeId(null); setSelGroupId(null) }}>
                      ✕ 顯示全部
                    </button>
                  )}
                </div>

                <p style={{textAlign:"center",fontSize:13,color:"var(--text-faint)",marginTop:"var(--s4)"}}>
                  提示：點地圖上的節點會聚焦其關係 · 世界觀條目為方形節點
                </p>
              </div>
            ) : (
              /* ── List view ── */
              <div className="rl-list" style={{maxHeight:"70vh",overflowY:"auto"}}>
                {filteredRels.length === 0 && (
                  <p style={{color:"var(--text-faint)",fontSize:13,padding:"var(--s4)"}}>找不到符合的關係。</p>
                )}
                {filteredRels.map(r => {
                  const s = nodes.find(n=>n.id===r.sourceId)
                  const t = nodes.find(n=>n.id===r.targetId)
                  return (
                    <div
                      key={r.id}
                      className={"rl-li" + (selRelId===r.id ? " sel" : "")}
                      onClick={()=>handleSelectRel(r.id)}
                    >
                      <div className="pair">
                        <span className="d" style={{background:s?.color??charColor(r.sourceId)}}>
                          {(s?.name??"?").slice(0,1)}
                        </span>
                        <span className="d" style={{background:t?.color??charColor(r.targetId)}}>
                          {(t?.name??"?").slice(0,1)}
                        </span>
                      </div>
                      <div className="info">
                        <div className="lb">{r.label??r.type??"關係"}</div>
                        <div className="nm">{s?.name??r.sourceId} × {t?.name??r.targetId}</div>
                      </div>
                      {r.type && r.type !== r.label && (
                        <span style={{fontSize:11,color:"var(--text-faint)",fontFamily:"var(--font-mono)"}}>
                          {r.type}
                        </span>
                      )}
                    </div>
                  )
                })}
                {legendGroups.length > 0 && (
                  <>
                    <div className="rl-grouphd" style={{padding:"0 4px"}}>群組</div>
                    {legendGroups.map(g => (
                      <div
                        key={g.id}
                        className={"rl-li" + (selGroupId===g.id ? " sel" : "")}
                        onClick={()=>handleSelectGroup(g.id)}
                        style={{borderColor: selGroupId===g.id ? g.color : undefined}}
                      >
                        <div className="pair">
                          {g.memberIds.slice(0,3).map(id => {
                            const n = nodes.find(x=>x.id===id)
                            return (
                              <span key={id} className="d" style={{background:n?.color??charColor(id)}}>
                                {(n?.name??"?").slice(0,1)}
                              </span>
                            )
                          })}
                        </div>
                        <div className="info">
                          <div className="lb">{g.name}</div>
                          <div className="nm">{g.memberIds.length} 人</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Right: pair or group card */}
            {selectedGroup
              ? <GroupCard group={selectedGroup} nodes={nodes} />
              : <PairCard
                  rel={selectedRel}
                  nodes={nodes}
                  onEdit={selectedRel ? () => setEditRelId(selectedRel.id) : undefined}
                  onDelete={selectedRel ? () => deleteMutation.mutate(selectedRel.id) : undefined}
                />
            }
          </div>
        </>
      )}

      <CreateRelationshipModal
        open={showCreate || !!editRelId}
        onClose={() => { setShowCreate(false); setEditRelId(null) }}
        projectId={projectId!}
        characters={Array.from(charMap.values())}
        worldEntries={Array.from(worldMap.values())}
        groups={allGroups}
        editRel={editRelId ? allRels.find(r => r.id === editRelId) ?? null : null}
      />
    </div>
  )
}
