import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import type { WorldEntryResponse } from "@oc-tools/contracts"

const TYPE_LABELS: Record<string, string> = {
  faction: "勢力", location: "地點", concept: "概念",
  lore: "世界觀", item: "道具", event: "事件",
  nation: "國家", place: "地點", org: "組織",
  race: "種族", character: "角色", other: "其他",
}
const TYPE_COLORS: Record<string, string> = {
  nation: "#3B5E6B", place: "#5E7E55", org: "#B5654A", event: "#9E332B",
  race: "#8A6FA0", item: "#C9A24B", faction: "#4A7B8C", concept: "#7B5EA7",
  lore: "#6B4A1E", location: "#5E7E55", other: "#8A857C",
}
function typeLabel(t: string) { return TYPE_LABELS[t] ?? t }
function typeColor(t: string) { return TYPE_COLORS[t] ?? "#8A857C" }

export function WorldEntryDetailPage() {
  const { projectId, entryId } = useParams<{ projectId: string; entryId: string }>()
  const { project } = useProjectContext()

  const { data, status } = useQuery({
    queryKey: ["project", projectId, "world-entry", entryId],
    queryFn: () =>
      apiClient<WorldEntryResponse>(
        `/api/app/projects/${projectId}/world-entries/${entryId}`,
      ),
    enabled: !!projectId && !!entryId,
  })

  if (status === "pending") {
    return <div className="page" style={{ color: "var(--text-faint)" }}>載入中⋯</div>
  }

  if (status === "error" || !data?.entry) {
    return (
      <div className="page">
        <div style={{ color: "var(--avoid)", marginBottom: "var(--s4)" }}>找不到條目。</div>
        <Link to={`/p/${projectId}/worldview`} className="lnk">← 回世界觀</Link>
      </div>
    )
  }

  const { entry } = data
  const color = typeColor(entry.type)

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[project.name, "世界觀", entry.title]} />

      <div className="ch-head">
        <div className="av" style={{ background: color, fontSize: 28 }}>
          {entry.title.slice(0, 1)}
        </div>

        <div className="id">
          <h1>{entry.title}</h1>
          {entry.summary && (
            <p className="tagline">
              {entry.summary.slice(0, 120)}{entry.summary.length > 120 ? "…" : ""}
            </p>
          )}
          <div className="meta">
            <span className="tag" style={{ background: color + "22", borderColor: color + "44", color }}>
              {typeLabel(entry.type)}
            </span>
            <span className="tag">{entry.visibility ?? "private"}</span>
          </div>
        </div>

        <div className="acts">
          <Link to={`/p/${projectId}/worldview/${entryId}/edit`} className="btn">編輯條目</Link>
          <Link to={`/p/${projectId}/worldview/new?parent=${entryId}`} className="btn">＋ 子條目</Link>
        </div>
      </div>

      <div className="det-grid">
        <div>
          {entry.summary && (
            <div className="block">
              <p className="bh">摘要 · SUMMARY</p>
              <p>{entry.summary}</p>
            </div>
          )}

          {(entry.content || entry.body) && (
            <div className="block">
              <p className="bh">詳細內容 · CONTENT</p>
              <p style={{ whiteSpace: "pre-wrap" }}>{entry.content ?? entry.body}</p>
            </div>
          )}
        </div>

        <div>
          <div className="block">
            <p className="bh">基本資料 · INFO</p>
            <div className="kvs">
              <div className="r">
                <span className="k">類型</span>
                <span>{typeLabel(entry.type)}</span>
              </div>
              <div className="r">
                <span className="k">可見性</span>
                <span>{entry.visibility ?? "private"}</span>
              </div>
              <div className="r">
                <span className="k">建立</span>
                <span>{new Date(entry.createdAt).toLocaleDateString("zh-TW")}</span>
              </div>
              <div className="r">
                <span className="k">更新</span>
                <span>{new Date(entry.updatedAt).toLocaleDateString("zh-TW")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
