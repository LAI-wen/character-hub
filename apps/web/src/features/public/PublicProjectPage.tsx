import { useQuery } from "@tanstack/react-query"
import { useParams, Link } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { charColor } from "@/lib/charColor"
import type { Project, Character, WorldEntry } from "@oc-tools/contracts"

type PublicProjectResponse = {
  project: Project
  characters: Character[]
  worldEntries: WorldEntry[]
}

const TYPE_LABELS: Record<string, string> = {
  nation: "國家", place: "地點", org: "組織", event: "事件",
  race: "種族", item: "道具", faction: "勢力", concept: "概念",
  lore: "世界觀", character: "角色", other: "其他",
}
const TYPE_COLORS: Record<string, string> = {
  nation: "#3B5E6B", place: "#5E7E55", org: "#B5654A", event: "#9E332B",
  race: "#8A6FA0", item: "#C9A24B", faction: "#4A7B8C", concept: "#7B5EA7",
  lore: "#6B4A1E", other: "#8A857C",
}

export function PublicProjectPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data, status } = useQuery({
    queryKey: ["public-project", slug],
    queryFn: () => apiClient<PublicProjectResponse>(`/api/public/projects/${slug}`),
    enabled: !!slug,
    retry: false,
  })

  if (status === "pending") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
        <p style={{ color: "var(--text-faint)" }}>載入中⋯</p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>🔒</p>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>找不到頁面</p>
          <p style={{ color: "var(--text-dim)", fontSize: 14 }}>這個企劃可能不存在，或尚未公開。</p>
        </div>
      </div>
    )
  }

  const { project, characters, worldEntries } = data
  const accentColor = project.themeColor ?? "var(--accent)"

  const worldByType = worldEntries.reduce<Record<string, WorldEntry[]>>((acc, e) => {
    ;(acc[e.type] ??= []).push(e)
    return acc
  }, {})

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: "var(--s10)" }}>
      {/* Hero banner */}
      <div style={{
        background: accentColor,
        padding: "var(--s10) var(--s6) var(--s8)",
        textAlign: "center",
        color: "#fff",
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.75, marginBottom: 8 }}>
          CharacterHub
        </p>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 800, margin: "0 0 12px", lineHeight: 1.1 }}>
          {project.name}
        </h1>
        {project.description && (
          <p style={{ fontSize: 16, opacity: 0.88, maxWidth: 520, margin: "0 auto", lineHeight: 1.5 }}>
            {project.description}
          </p>
        )}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 20, fontSize: 13, opacity: 0.8 }}>
          {characters.length > 0 && <span>{characters.length} 個角色</span>}
          {worldEntries.length > 0 && <span>{worldEntries.length} 個世界觀</span>}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "var(--s8) var(--s5) 0" }}>
        {/* Characters */}
        {characters.length > 0 && (
          <section style={{ marginBottom: "var(--s10)" }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, marginBottom: "var(--s5)" }}>
              角色 · Characters
            </h2>
            <div className="cc-grid">
              {characters.map(character => {
                const color = charColor(character.id)
                const isLinkable = !!character.slug && character.visibility !== "private"
                const CardInner = () => (
                  <>
                    <div className="cc-pic">
                      {character.avatarUrl
                        ? <img src={character.avatarUrl} alt={character.name} className="cc-av-img" />
                        : <div className="av" style={{ background: color }}>{character.name.slice(0, 1)}</div>
                      }
                    </div>
                    <div className="cc-info">
                      <div className="cc-nm">{character.name}</div>
                      {character.species && <div className="cc-sp">{character.species}</div>}
                      {character.summary && (
                        <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "var(--s2) 0 0", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                          {character.summary}
                        </p>
                      )}
                    </div>
                  </>
                )
                return (
                  <div key={character.id} className="cc pub">
                    {isLinkable
                      ? <Link to={`/c/${character.slug!}`} className="cc-inner"><CardInner /></Link>
                      : <div className="cc-inner"><CardInner /></div>
                    }
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* World entries */}
        {worldEntries.length > 0 && (
          <section>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 800, marginBottom: "var(--s5)" }}>
              世界觀 · World
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s6)" }}>
              {Object.entries(worldByType).map(([type, entries]) => (
                <div key={type}>
                  <p style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                    color: TYPE_COLORS[type] ?? "var(--text-faint)",
                    marginBottom: "var(--s3)",
                  }}>
                    {TYPE_LABELS[type] ?? type}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--s3)" }}>
                    {entries.map(entry => (
                      <div key={entry.id} className="block" style={{ padding: "var(--s4)" }}>
                        <div style={{ display: "flex", gap: "var(--s3)", alignItems: "flex-start" }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: "var(--r-sm)",
                            background: TYPE_COLORS[type] ?? "#8A857C",
                            display: "grid", placeItems: "center",
                            color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0,
                          }}>
                            {entry.title.slice(0, 1)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{entry.title}</div>
                            {entry.summary && (
                              <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                                {entry.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {characters.length === 0 && worldEntries.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--text-faint)", padding: "var(--s10)" }}>
            這個企劃目前沒有公開內容。
          </p>
        )}

        <div style={{ textAlign: "center", marginTop: "var(--s10)", paddingTop: "var(--s8)", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 12, color: "var(--text-faint)" }}>
            Powered by <strong>CharacterHub</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
