import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import type { ProjectCharacterLinkResponse } from "@oc-tools/contracts"

const PALETTE = [
  "#4A6FA5","#C0392B","#27AE60","#8E44AD","#E67E22",
  "#16A085","#2C3E50","#7F8C8D","#D35400","#1A5276",
]
function charColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function visBadge(v: string) {
  const map: Record<string, { cls: string; label: string }> = {
    public: { cls: "public", label: "公開" },
    private: { cls: "private", label: "私人" },
    unlisted: { cls: "unlisted", label: "不公開連結" },
  }
  const { cls, label } = map[v] ?? { cls: "unlisted", label: v }
  return (
    <span className={`vis-b ${cls}`}>
      <span className="d" />
      {label}
    </span>
  )
}

export function CharacterDetailPage() {
  const { projectId, linkId } = useParams<{ projectId: string; linkId: string }>()
  const { project } = useProjectContext()

  const { data, status } = useQuery({
    queryKey: ["project", projectId, "roster", linkId],
    queryFn: () =>
      apiClient<ProjectCharacterLinkResponse>(
        `/api/app/projects/${projectId}/characters/${linkId}`,
      ),
    enabled: !!projectId && !!linkId,
  })

  if (status === "pending") {
    return <div className="page" style={{ color: "var(--text-faint)" }}>載入中⋯</div>
  }

  if (status === "error" || !data?.character) {
    return (
      <div className="page">
        <div style={{ color: "var(--avoid)", marginBottom: "var(--s4)" }}>找不到角色。</div>
        <Link to={`/p/${projectId}/roster`} className="lnk">← 回角色列表</Link>
      </div>
    )
  }

  const { character, projectLink } = data
  const color = charColor(character.id)

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[project.name, "企劃角色", character.name]} />

      {/* Character header */}
      <div className="ch-head">
        <div className="av" style={{ background: color }}>
          {character.name.slice(0, 1)}
        </div>

        <div className="id">
          <h1>
            {character.name}
            {character.romaji && <span className="rom">{character.romaji}</span>}
          </h1>
          {character.summary && (
            <p className="tagline">{character.summary.slice(0, 120)}{character.summary.length > 120 ? "…" : ""}</p>
          )}
          <div className="meta">
            {character.species && <span className="tag">{character.species}</span>}
            {projectLink.projectRole && <span className="tag">{projectLink.projectRole}</span>}
            {visBadge(character.visibility)}
          </div>
        </div>

        <div className="acts">
          <Link to={`/p/${projectId}/roster`} className="btn btn-ghost">← 角色列表</Link>
          <Link to={`/p/${projectId}/roster/${linkId}/edit`} className="btn">編輯角色</Link>
        </div>
      </div>

      {/* Two-column detail grid */}
      <div className="det-grid">
        {/* Left column */}
        <div>
          {character.summary && (
            <div className="block">
              <p className="bh">簡介 · SUMMARY</p>
              <p>{character.summary}</p>
            </div>
          )}

          {character.tags && character.tags.length > 0 && (
            <div className="block">
              <p className="bh">標籤 · TAGS</p>
              <div className="tagrow">
                {character.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div>
          <div className="block">
            <p className="bh">基本資料 · INFO</p>
            <div className="kvs">
              {character.nickname && (
                <div className="r">
                  <span className="k">別名</span>
                  <span>{character.nickname}</span>
                </div>
              )}
              {character.species && (
                <div className="r">
                  <span className="k">種族</span>
                  <span>{character.species}</span>
                </div>
              )}
              {projectLink.projectRole && (
                <div className="r">
                  <span className="k">角色定位</span>
                  <span>{projectLink.projectRole}</span>
                </div>
              )}
              {projectLink.factionLabel && (
                <div className="r">
                  <span className="k">所屬勢力</span>
                  <span>{projectLink.factionLabel}</span>
                </div>
              )}
              <div className="r">
                <span className="k">建立</span>
                <span>{new Date(character.createdAt).toLocaleDateString("zh-TW")}</span>
              </div>
              <div className="r">
                <span className="k">更新</span>
                <span>{new Date(character.updatedAt).toLocaleDateString("zh-TW")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
