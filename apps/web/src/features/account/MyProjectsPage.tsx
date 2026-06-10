import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { PageHeader } from "@/components/PageHeader"
import type { ProjectListResponse } from "@oc-tools/contracts"

const VIS_LABELS: Record<string, string> = {
  public: "公開", unlisted: "不公開連結", private: "私人",
}

export function MyProjectsPage() {
  const { data, status } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiClient<ProjectListResponse>("/api/app/projects"),
  })

  const projects = data?.projects ?? []

  return (
    <div className="page">
      <ContextHeader scope="account" crumbs={["我的企劃"]} />
      <PageHeader
        title="我的企劃"
        eyebrow="Projects"
        sub="你建立與參與的所有創作企劃。"
      />

      {status === "pending" && <p style={{ color: "var(--text-faint)" }}>載入中⋯</p>}
      {status === "error" && <p style={{ color: "var(--avoid)" }}>無法載入企劃</p>}

      {status === "success" && projects.length === 0 && (
        <div className="block" style={{ textAlign: "center", padding: "var(--s7) var(--s5)" }}>
          <p style={{ color: "var(--text-faint)" }}>還沒有企劃。</p>
        </div>
      )}

      {status === "success" && projects.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
          {projects.map(project => (
            <Link
              key={project.id}
              to={`/p/${project.id}/overview`}
              className="block"
              style={{ display: "flex", alignItems: "center", gap: "var(--s4)", textDecoration: "none" }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: project.themeColor ?? project.color ?? "var(--accent)",
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                  {project.name}
                </div>
                {project.description && (
                  <div style={{ fontSize: "13px", color: "var(--text-dim)", lineHeight: 1.4 }}>
                    {project.description}
                  </div>
                )}
              </div>
              <span className="tag" style={{ flexShrink: 0 }}>
                {VIS_LABELS[project.visibility] ?? project.visibility}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
