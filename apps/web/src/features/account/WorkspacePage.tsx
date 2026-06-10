import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useAuth } from "@/lib/auth/context"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { PageHeader } from "@/components/PageHeader"
import type { ProjectListResponse } from "@oc-tools/contracts"

export function WorkspacePage() {
  const { viewer } = useAuth()

  const { data, status } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiClient<ProjectListResponse>("/api/app/projects"),
  })

  const projects = data?.projects ?? []

  return (
    <div className="page">
      <ContextHeader scope="account" crumbs={["工作台"]} />
      <PageHeader
        title={`歡迎回來，${viewer?.displayName ?? "…"}`}
        eyebrow="Workspace"
        sub="你的角色、企劃、以及所有創作都在這裡。"
      />

      <section style={{ marginBottom: "var(--s7)" }}>
        <div className="bh" style={{ marginBottom: "var(--s4)" }}>我的企劃 · PROJECTS</div>

        {status === "pending" && (
          <p style={{ color: "var(--text-faint)" }}>載入中⋯</p>
        )}
        {status === "error" && (
          <p style={{ color: "var(--avoid)" }}>無法載入企劃</p>
        )}
        {status === "success" && projects.length === 0 && (
          <div className="block" style={{ textAlign: "center", padding: "var(--s7) var(--s5)" }}>
            <p style={{ color: "var(--text-faint)", marginBottom: "var(--s3)" }}>
              還沒有企劃，建立第一個吧。
            </p>
          </div>
        )}
        {status === "success" && projects.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "var(--s4)" }}>
            {projects.map(project => (
              <Link
                key={project.id}
                to={`/p/${project.id}/overview`}
                className="block"
                style={{ display: "block", textDecoration: "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)", marginBottom: "var(--s2)" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: project.themeColor ?? project.color ?? "var(--accent)",
                  }} />
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>{project.name}</span>
                </div>
                {project.description && (
                  <p style={{ fontSize: "13px", color: "var(--text-dim)", margin: 0, lineHeight: 1.5 }}>
                    {project.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
