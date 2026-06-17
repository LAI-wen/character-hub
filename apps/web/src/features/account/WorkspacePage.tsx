import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useAuth } from "@/lib/auth/context"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { charColor } from "@/lib/charColor"
import { useRecentItems } from "@/lib/recentlyViewed"
import type { ProjectListResponse } from "@oc-tools/contracts"
import type { CharacterListResponse } from "@oc-tools/contracts"

function greeting() {
  const h = new Date().getHours()
  return h < 11 ? "早安" : h < 18 ? "午安" : "晚安"
}

export function WorkspacePage() {
  const { viewer } = useAuth()

  const { data: projData, status: projStatus } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiClient<ProjectListResponse>("/api/app/projects"),
  })

  const { data: charData } = useQuery({
    queryKey: ["characters"],
    queryFn: () => apiClient<CharacterListResponse>("/api/app/characters"),
  })

  const projects = projData?.projects ?? []
  const characters = charData?.characters ?? []
  const recentItems = useRecentItems()

  return (
    <div className="page">
      <ContextHeader scope="account" crumbs={["工作台"]} />

      <div className="wk-greet">
        <div>
          <h1>{greeting()}，{viewer?.displayName ?? "…"}</h1>
          <p className="wk-meta">
            你有 <b>{projects.length}</b> 個企劃 · <b>{characters.length}</b> 個角色。挑一個繼續，或開始新的。
          </p>
        </div>
        <Link to="/characters/new" className="btn btn-accent">＋ 新角色</Link>
      </div>

      <div className="wk-grid">
        {/* Main column */}
        <div className="wk-main">
          <div className="wk-sec">
            <div className="sec-head">
              <h2>我的企劃</h2>
              <span className="en">Projects</span>
              <span className="sec-rule" />
              <Link to="/projects" className="sec-more">全部 →</Link>
            </div>

            {projStatus === "pending" && <LoadingSpinner />}
            {projStatus === "error"   && <p style={{ color: "var(--avoid)", fontSize: 14 }}>無法載入企劃</p>}

            {projStatus === "success" && projects.length === 0 && (
              <div className="block" style={{ textAlign: "center", padding: "var(--s7) var(--s5)" }}>
                <p style={{ color: "var(--text-faint)" }}>還沒有企劃，建立第一個吧。</p>
              </div>
            )}

            {projStatus === "success" && projects.length > 0 && (
              <div className="pcards">
                {projects.map(project => {
                  const color = project.themeColor ?? "var(--accent)"
                  return (
                    <Link
                      key={project.id}
                      to={`/p/${project.id}/overview`}
                      className="pcard"
                    >
                      <div className="pcard-cv" style={{ background: color }} />
                      <div className="pcard-b">
                        <div className="pcard-h">
                          <span className="pcard-mk" style={{ background: color }}>
                            {project.name.slice(0, 1)}
                          </span>
                          <div>
                            <div className="pcard-nm">{project.name}</div>
                            <div className="pcard-en">Project</div>
                          </div>
                        </div>
                        <div className="pcard-bl">
                          {project.description || "還沒有描述。"}
                        </div>
                        <div className="pcard-st">
                          <span><b>—</b> 角色</span>
                          <span><b>—</b> 世界觀</span>
                          <span><b>—</b> 關係</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Side column */}
        <aside className="wk-side">
          {/* Recently viewed */}
          <div className="block wk-side-card">
            <p className="wk-side-ch">最近瀏覽</p>
            {recentItems.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-faint)", padding: "var(--s3) 0" }}>
                還沒有瀏覽紀錄。
              </p>
            ) : (
              <div className="mini-chars" style={{ gap: "var(--s2)" }}>
                {recentItems.slice(0, 8).map(item => (
                  <Link key={item.path} to={item.path} className="mini-char">
                    <span className="rv-dot" style={{ background: item.imgUrl ? "transparent" : item.color }}>
                      {item.imgUrl
                        ? <img src={item.imgUrl} alt={item.name} />
                        : item.name.slice(0, 1)
                      }
                    </span>
                    <span className="mini-nm">{item.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* My characters mini */}
          {characters.length > 0 && (
            <div className="block wk-side-card">
              <p className="wk-side-ch">我的角色 · {characters.length}</p>
              <div className="mini-chars">
                {characters.slice(0, 5).map(c => (
                    <Link key={c.id} to={`/characters/${c.id}`} className="mini-char">
                      {c.avatarUrl
                        ? <img src={c.avatarUrl} alt={c.name} className="mini-av mini-av-img" />
                        : <span className="mini-av" style={{ background: c.themeColor ?? charColor(c.id) }}>{c.name.slice(0, 1)}</span>
                      }
                      <span className="mini-nm">{c.name}</span>
                    </Link>
                ))}
              </div>
              <Link
                to="/characters"
                className="btn btn-sm"
                style={{ width: "100%", justifyContent: "center", marginTop: "var(--s3)" }}
              >
                看全部角色
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
