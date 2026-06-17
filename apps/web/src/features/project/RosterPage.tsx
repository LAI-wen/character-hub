import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { PageHeader } from "@/components/PageHeader"
import { ContextHeader } from "@/components/ContextHeader"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import { charColor } from "@/lib/charColor"
import type {
  ProjectCharacterLinkListResponse,
  RelationshipListResponse,
} from "@oc-tools/contracts"


function DetailPanel({
  linkId,
  projectId,
}: {
  linkId: string | null
  projectId: string
}) {
  const { data } = useQuery({
    queryKey: ["project", projectId, "roster"],
    queryFn: () =>
      apiClient<ProjectCharacterLinkListResponse>(
        `/api/app/projects/${projectId}/characters`,
      ),
    enabled: !!projectId,
  })

  if (!linkId) {
    return (
      <div className="dp">
        <div className="ph-empty">選擇一個角色看設定。</div>
      </div>
    )
  }

  const row = data?.roster.find((r) => r.projectLink.id === linkId)
  if (!row) return null
  const { projectLink, character } = row
  if (!character) return null
  const color = character.themeColor ?? charColor(character.id)

  return (
    <div className="dp">
      <div className="strip" style={{ background: color }} />
      <div className="dh">
        <span className="av" style={{ background: color }}>
          {character.name.slice(0, 1)}
        </span>
        <div>
          <div className="nm">{character.name}</div>
          {character.romaji && (
            <div className="rom">{character.romaji}</div>
          )}
        </div>
      </div>

      <div className="seg-h">
        <span className="lbl">角色本體 · Character</span>
      </div>
      <div className="seg body-seg">
        {character.species && (
          <div className="kv">
            <span className="k">物種</span>
            <span className="v">{character.species}</span>
          </div>
        )}
        {character.summary && (
          <div className="kv">
            <span className="k">簡介</span>
            <span className="v">{character.summary}</span>
          </div>
        )}
        <div className="kv">
          <span className="k" />
          <span className="v">
            <Link
              to={`/p/${projectId}/roster/${linkId}`}
              style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-ink)" }}
            >
              看角色詳情 →
            </Link>
          </span>
        </div>
      </div>

      <div className="seg-h">
        <span className="lbl">此企劃中的設定 · Project</span>
      </div>
      <div className="seg">
        {projectLink.projectRole && (
          <div className="kv">
            <span className="k">企劃職位</span>
            <span className="v">{projectLink.projectRole}</span>
          </div>
        )}
      </div>

      <div className="df">
        <Link
          to={`/p/${projectId}/roster/${linkId}`}
          className="btn btn-sm"
        >
          查看詳情
        </Link>
        <Link
          to={`/p/${projectId}/roster/${linkId}/edit`}
          className="btn btn-sm"
        >
          編輯
        </Link>
        <Link
          to={`/p/${projectId}/relationships?focus=${character.id}`}
          className="btn btn-sm"
          title="前往關係圖"
        >
          關係圖 →
        </Link>
      </div>
    </div>
  )
}

export function RosterPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useProjectContext()
  const navigate = useNavigate()
  const [selId, setSelId]         = useState<string | null>(null)
  const [q, setQ]                 = useState("")
  const [statusFilter, setStatus] = useState<"all" | "approved" | "pending" | "rejected">("all")
  const [factionFilter, setFaction] = useState<string>("all")

  const { data, status } = useQuery({
    queryKey: ["project", projectId, "roster"],
    queryFn: () =>
      apiClient<ProjectCharacterLinkListResponse>(
        `/api/app/projects/${projectId}/characters`,
      ),
    enabled: !!projectId,
  })

  // Relationship counts — reuse cache if already loaded
  const { data: relData } = useQuery({
    queryKey: ["project", projectId, "relationships"],
    queryFn: () =>
      apiClient<RelationshipListResponse>(
        `/api/app/projects/${projectId}/relationships`,
      ),
    enabled: !!projectId,
  })
  const relCountMap = new Map<string, number>()
  for (const r of relData?.relationships ?? []) {
    relCountMap.set(r.sourceId, (relCountMap.get(r.sourceId) ?? 0) + 1)
    relCountMap.set(r.targetId, (relCountMap.get(r.targetId) ?? 0) + 1)
  }

  const roster = data?.roster ?? []

  // Unique factions for filter pills
  const factions = [...new Set(roster.map(r => r.projectLink.factionLabel).filter(Boolean) as string[])]

  // Status counts
  const statusCounts = {
    all:      roster.length,
    approved: roster.filter(r => r.projectLink.status === "approved").length,
    pending:  roster.filter(r => r.projectLink.status === "pending" || !r.projectLink.status).length,
    rejected: roster.filter(r => r.projectLink.status === "rejected").length,
  }

  const visible = roster.filter(({ character, projectLink }) => {
    if (statusFilter !== "all") {
      const s = projectLink.status ?? "pending"
      if (statusFilter === "pending" && s !== "pending" && s !== undefined && s !== "") return false
      if (statusFilter !== "pending" && s !== statusFilter) return false
    }
    if (factionFilter !== "all" && projectLink.factionLabel !== factionFilter) return false
    if (!q) return true
    const haystack = [
      character?.name ?? "",
      character?.romaji ?? "",
      character?.species ?? "",
      projectLink.projectRole ?? "",
      projectLink.factionLabel ?? "",
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(q.toLowerCase())
  })

  // Auto-select first on load
  const effectiveSel =
    selId ?? (visible.length > 0 ? visible[0].projectLink.id : null)

  // Group by faction (fallback: projectRole, then "未分組")
  type Group = { label: string; rows: typeof roster }
  const groupMap = new Map<string, Group>()
  const groups: Group[] = []
  for (const row of visible) {
    const label = row.projectLink.factionLabel ?? row.projectLink.projectRole ?? "未分組"
    let grp = groupMap.get(label)
    if (!grp) { grp = { label, rows: [] }; groupMap.set(label, grp); groups.push(grp) }
    grp.rows.push(row)
  }

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[project.name, "企劃角色"]} />
      <PageHeader
        title="企劃角色"
        eyebrow="Roster"
        sub={`這裡是角色在「${project.name}」中的設定——職位、限定欄位與可見性。`}
        action={
          <Link to={`/p/${projectId}/roster/new`} className="btn btn-accent">
            ＋ 加入角色
          </Link>
        }
      />

      {/* Toolbar with status filter + faction filter */}
      <div className="toolbar">
        <div className="searchf">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="搜尋角色…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="filterbar">
          {([
            ["all",      "全部",   statusCounts.all],
            ["approved", "已通過",  statusCounts.approved],
            ["pending",  "待審",   statusCounts.pending],
            ["rejected", "已拒絕", statusCounts.rejected],
          ] as const).map(([v, label, ct]) => (ct > 0 || v === "all") ? (
            <button
              key={v}
              type="button"
              className={"fbtn" + (statusFilter === v ? " on" : "")}
              onClick={() => setStatus(v)}
            >
              {label}
              <span className="ct">{ct}</span>
            </button>
          ) : null)}
        </div>

        {factions.length > 0 && (
          <div className="filterbar">
            <button
              type="button"
              className={"fbtn" + (factionFilter === "all" ? " on" : "")}
              onClick={() => setFaction("all")}
            >
              全部陣營
            </button>
            {factions.map(f => (
              <button
                key={f}
                type="button"
                className={"fbtn" + (factionFilter === f ? " on" : "")}
                onClick={() => setFaction(f === factionFilter ? "all" : f)}
              >
                <span className="dot" style={{ background: "var(--accent)" }} />
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {status === "pending" && (
        <LoadingSpinner />
      )}
      {status === "error" && (
        <p style={{ color: "var(--avoid)" }}>無法載入角色列表</p>
      )}

      {status === "success" && visible.length === 0 && (
        <p style={{ color: "var(--text-faint)" }}>
          {q ? "找不到符合的角色。" : "還沒有角色加入此企劃。"}
        </p>
      )}

      {status === "success" && visible.length > 0 && (
        <div className="rs-cols">
          {/* List */}
          <div className="rs-list">
            {groups.map(({ label, rows }) => (
              <div key={label}>
                <div className="grouph">
                  <span className="d" style={{ background: "var(--accent)" }} />
                  {label} · {rows.length}
                </div>
                {rows.map(({ projectLink, character }) => {
                  if (!character) return null
                  const color = character.themeColor ?? charColor(character.id)
                  const isSel = effectiveSel === projectLink.id
                  const relCount = relCountMap.get(character.id) ?? 0
                  return (
                    <button
                      key={projectLink.id}
                      className={"rrow" + (isSel ? " sel" : "")}
                      onClick={() => setSelId(projectLink.id)}
                    >
                      <span className="av" style={{ background: color }}>
                        {character.avatarUrl
                          ? <img src={character.avatarUrl} alt={character.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "inherit" }} />
                          : character.name.slice(0, 1)
                        }
                      </span>
                      <div className="id">
                        <div className="nm">{character.name}</div>
                        <div className="meta">
                          {projectLink.factionLabel && (
                            <span style={{ color: "var(--accent-ink)" }}>{projectLink.factionLabel}</span>
                          )}
                          {projectLink.projectRole && (
                            <span>{projectLink.projectRole}</span>
                          )}
                          {character.species && (
                            <span style={{ color: "var(--text-faint)" }}>
                              {character.species}
                            </span>
                          )}
                        </div>
                      </div>
                      {projectLink.status === "approved" && (
                        <span title="已通過" style={{ fontSize: 10, fontWeight: 700, color: "var(--must)", background: "rgba(31,138,91,.1)", borderRadius: 6, padding: "2px 6px", flexShrink: 0, whiteSpace: "nowrap" }}>已通過</span>
                      )}
                      {(!projectLink.status || projectLink.status === "pending") && (
                        <span title="待審" style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", background: "var(--surface-2)", borderRadius: 6, padding: "2px 6px", flexShrink: 0, whiteSpace: "nowrap" }}>待審</span>
                      )}
                      {relCount > 0 && (
                        <span
                          role="button"
                          className="rel-badge"
                          title={`${relCount} 條關係 · 前往關係圖`}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/p/${projectId}/relationships?focus=${character.id}`)
                          }}
                        >
                          {relCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div className="rs-detail">
            <DetailPanel linkId={effectiveSel} projectId={projectId!} />
          </div>
        </div>
      )}
    </div>
  )
}
