import { Outlet, useParams } from "react-router-dom"
import { createContext, useContext } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { ScopeGuard } from "@/routes/guards/ScopeGuard"
import type { Project, ProjectResponse, ProjectRole, ProjectStats } from "@oc-tools/contracts"

type ProjectContextValue = {
  project: Project
  role: ProjectRole
  stats: ProjectStats | null
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error("useProjectContext must be used inside ProjectLayout")
  return ctx
}

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>()

  const { data, status } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () =>
      apiClient<ProjectResponse>(`/api/app/projects/${projectId}`),
    enabled: !!projectId,
  })

  if (!projectId) return <ScopeGuard projectId={undefined}><div /></ScopeGuard>

  if (status === "pending") {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--text-faint)", fontSize: "0.875rem" }}>
        載入中⋯
      </div>
    )
  }

  if (status === "error" || !data) {
    return (
      <div style={{ padding: "var(--s8)", color: "var(--avoid)", fontSize: "0.875rem" }}>
        企劃不存在或無訪問權限。
      </div>
    )
  }

  const project = data.project
  const role: ProjectRole = (data.viewerRole as ProjectRole) ?? "viewer"
  const stats = data.stats ?? null

  return (
    <ProjectContext.Provider value={{ project, role, stats }}>
      <Outlet />
    </ProjectContext.Provider>
  )
}
