import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { recordView } from "@/lib/recentlyViewed"
import type { ProjectCharacterLinkListResponse } from "@oc-tools/contracts"
import type { WorldEntryListResponse } from "@oc-tools/contracts"
import { charColor } from "@/lib/charColor"
import { typeColor } from "@/lib/worldviewTypes"

function CopyPublicUrlButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/page/${slug}`
  return (
    <button
      className="btn btn-ghost"
      style={{ fontSize: 13 }}
      onClick={() => {
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }}
    >
      {copied ? "✓ 已複製" : "複製公開網址"}
    </button>
  )
}

function SvgIcon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      dangerouslySetInnerHTML={{ __html: d }} />
  )
}

const ICONS = {
  mask:  '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  nodes: '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 11l6-3.5M9 13l6 3.5"/>',
  plus:  '<path d="M12 5v14M5 12h14"/>',
}

export function OverviewPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project, stats } = useProjectContext()
  const navigate = useNavigate()

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

  const roster = rosterQuery.data?.roster ?? []
  const world  = worldQuery.data?.entries ?? []
  const color  = project.themeColor ?? "var(--accent)"

  useEffect(() => {
    if (!project?.id) return
    recordView({ type: "project", id: project.id, name: project.name, path: `/p/${project.id}/overview`, color: project.themeColor ?? "#8A857C" })
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[project.name, "總覽"]} />

      {/* Hero */}
      <div className="ov-hero">
        <div className="ov-cv" style={{ background: color }} />
        <div className="ov-bd">
          <span className="ov-mk" style={{ background: color }}>{project.name.slice(0, 1)}</span>
          <div className="ov-info">
            <h1>{project.name}<span className="en">Project</span></h1>
            {project.description && <p className="ov-bl">{project.description}</p>}
          </div>
          <div style={{ display: "flex", gap: "var(--s2)", alignItems: "center" }}>
            {project.visibility !== "private" && (
              <CopyPublicUrlButton slug={project.slug} />
            )}
            <Link to={`/p/${projectId}/settings`} className="btn ov-set-btn">⚙ 企劃設定</Link>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="qc-row">
        <button className="qc" onClick={() => navigate(`/p/${projectId}/roster/new`)}>
          <SvgIcon d={ICONS.plus} />加入角色
        </button>
        <button className="qc" onClick={() => navigate(`/p/${projectId}/worldview/new`)}>
          <SvgIcon d={ICONS.plus} />新增世界觀
        </button>
        <button className="qc" onClick={() => navigate(`/p/${projectId}/relationships`)}>
          <SvgIcon d={ICONS.plus} />新增關係
        </button>
      </div>

      {/* Content digest */}
      <div className="ov-sec">
        <div className="sec-head">
          <h2>內容</h2>
          <span className="en">Content</span>
          <span className="sec-rule" />
        </div>
        <div className="ov-cards">
          {/* Characters */}
          <Link to={`/p/${projectId}/roster`} className="ovc">
            <div className="ovc-h">
              <div className="ovc-t"><SvgIcon d={ICONS.mask} size={14} />角色</div>
              <div className="ovc-n">{stats?.characters ?? roster.length}<span className="ovc-u">位</span></div>
            </div>
            <div className="ovc-list">
              {roster.length === 0
                ? <div className="ovc-li ovc-empty">尚無角色</div>
                : roster.slice(0, 4).map(({ projectLink, character }) => character && (
                    <div key={projectLink.id} className="ovc-li">
                      <span className="ovc-av" style={{ background: charColor(character.id) }}>
                        {character.name.slice(0, 1)}
                      </span>
                      {character.name}{projectLink.projectRole ? ` · ${projectLink.projectRole}` : ""}
                    </div>
                  ))
              }
            </div>
            <div className="ovc-foot">查看企劃角色 →</div>
          </Link>

          {/* World entries */}
          <Link to={`/p/${projectId}/worldview`} className="ovc">
            <div className="ovc-h">
              <div className="ovc-t"><SvgIcon d={ICONS.globe} size={14} />世界觀</div>
              <div className="ovc-n">{stats?.worldEntries ?? world.length}<span className="ovc-u">條</span></div>
            </div>
            <div className="ovc-list">
              {world.length === 0
                ? <div className="ovc-li ovc-empty">尚無世界觀條目</div>
                : world.slice(0, 4).map(entry => (
                    <div key={entry.id} className="ovc-li">
                      <span className="ovc-dot" style={{ background: typeColor(entry.type) }} />
                      {entry.title}
                    </div>
                  ))
              }
            </div>
            <div className="ovc-foot">開啟世界觀 →</div>
          </Link>

          {/* Relationships */}
          <Link to={`/p/${projectId}/relationships`} className="ovc">
            <div className="ovc-h">
              <div className="ovc-t"><SvgIcon d={ICONS.nodes} size={14} />關係圖</div>
              <div className="ovc-n">—<span className="ovc-u">組</span></div>
            </div>
            <div className="ovc-list">
              <div className="ovc-li ovc-empty">開啟關係圖查看</div>
            </div>
            <div className="ovc-foot">開啟關係圖 →</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
