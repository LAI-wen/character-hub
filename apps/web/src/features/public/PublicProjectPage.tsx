import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useParams, Link, useNavigate } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { charColor } from "@/lib/charColor"
import { typeLabel, typeColor } from "@/lib/worldviewTypes"
import { useAuth } from "@/lib/auth/context"
import type { Project, Character, WorldEntry } from "@oc-tools/contracts"
import { LoadingSpinner } from "@/components/LoadingSpinner"

type PublicProjectResponse = {
  project: Project
  characters: Character[]
  worldEntries: WorldEntry[]
}

export function PublicProjectPage() {
  const { slug } = useParams<{ slug: string }>()
  const { viewer } = useAuth()
  const navigate = useNavigate()

  const [showModal, setShowModal] = useState(false)
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [applyDone, setApplyDone] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  const { data, status } = useQuery({
    queryKey: ["public-project", slug],
    queryFn: () => apiClient<PublicProjectResponse>(`/api/public/projects/${slug}`),
    enabled: !!slug,
    retry: false,
  })

  const { data: charsData } = useQuery({
    queryKey: ["my-characters-for-apply"],
    queryFn: () => apiClient<{ characters: Character[] }>("/api/app/characters"),
    enabled: showModal && !!viewer,
  })

  const applyMutation = useMutation({
    mutationFn: (characterId: string) =>
      apiClient("/api/app/apply", {
        method: "POST",
        body: { projectSlug: slug, characterId },
      }),
    onSuccess: () => {
      setApplyDone(true)
      setApplyError(null)
    },
    onError: (err: unknown) => {
      const code = (err as { code?: string })?.code
      if (code === "CONFLICT") {
        setApplyDone(true)
        setApplyError("already")
      } else {
        setApplyError("error")
      }
    },
  })

  if (status === "pending") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
        <LoadingSpinner />
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

  useEffect(() => {
    document.title = `${project.name} — CharacterHub`
    return () => { document.title = "CharacterHub" }
  }, [project.name])

  const accentColor = project.themeColor ?? "var(--accent)"
  const isOwner = viewer?.id === project.ownerUserId
  const canApply = viewer && !isOwner

  const worldByType = worldEntries.reduce<Record<string, WorldEntry[]>>((acc, e) => {
    ;(acc[e.type] ??= []).push(e)
    return acc
  }, {})

  function closeModal() {
    setShowModal(false)
    setSelectedCharId(null)
    setApplyDone(false)
    setApplyError(null)
  }

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

        {/* Apply button */}
        <div style={{ marginTop: 24 }}>
          {!viewer ? (
            <button
              className="btn"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.5)" }}
              onClick={() => navigate(`/login?redirect=/page/${slug}`)}
            >
              登入後申請加入
            </button>
          ) : canApply ? (
            <button
              className="btn btn-accent"
              style={{ background: "#fff", color: accentColor }}
              onClick={() => setShowModal(true)}
            >
              ＋ 申請加入
            </button>
          ) : null}
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
                    color: typeColor(type),
                    marginBottom: "var(--s3)",
                  }}>
                    {typeLabel(type)}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--s3)" }}>
                    {entries.map(entry => (
                      <div key={entry.id} className="block" style={{ padding: "var(--s4)" }}>
                        <div style={{ display: "flex", gap: "var(--s3)", alignItems: "flex-start" }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: "var(--r-sm)",
                            background: typeColor(type),
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

      {/* Apply modal */}
      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "grid",
            placeItems: "center", zIndex: 1000, padding: "var(--s5)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{
            background: "var(--surface)", borderRadius: "var(--r-lg)", padding: "var(--s7)",
            maxWidth: 480, width: "100%", boxShadow: "var(--shadow-lg)",
          }}>
            {applyDone ? (
              <div style={{ textAlign: "center", padding: "var(--s5) 0" }}>
                {applyError === "already" ? (
                  <>
                    <p style={{ fontSize: 32, marginBottom: 12 }}>📋</p>
                    <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>已申請過</p>
                    <p style={{ color: "var(--text-dim)", fontSize: 14 }}>你的角色已申請加入「{project.name}」，請等待主持人審核。</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 32, marginBottom: 12 }}>✅</p>
                    <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>申請已送出！</p>
                    <p style={{ color: "var(--text-dim)", fontSize: 14 }}>等待主持人審核後，你就能進入企劃空間。</p>
                  </>
                )}
                <button className="btn btn-accent" style={{ marginTop: "var(--s5)" }} onClick={closeModal}>
                  關閉
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "var(--s5)" }}>
                  <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
                    申請加入「{project.name}」
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--text-dim)" }}>選擇一個角色提交申請，主持人審核後你就能加入企劃。</p>
                </div>

                {applyError === "error" && (
                  <p style={{ color: "var(--avoid)", fontSize: 13, marginBottom: "var(--s4)" }}>申請失敗，請稍後再試。</p>
                )}

                {!charsData ? (
                  <p style={{ color: "var(--text-faint)", fontSize: 13, padding: "var(--s4) 0" }}>載入角色中⋯</p>
                ) : charsData.characters.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "var(--s6) 0" }}>
                    <p style={{ color: "var(--text-dim)", fontSize: 14, marginBottom: "var(--s4)" }}>你還沒有角色，請先建立一個角色再申請。</p>
                    <Link to="/characters/new" className="btn btn-accent" onClick={closeModal}>
                      建立角色
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)", marginBottom: "var(--s5)", maxHeight: 280, overflowY: "auto" }}>
                    {charsData.characters.map(ch => {
                      const color = charColor(ch.id)
                      const isSelected = selectedCharId === ch.id
                      return (
                        <button
                          key={ch.id}
                          onClick={() => setSelectedCharId(ch.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: "var(--s3)",
                            padding: "var(--s3) var(--s4)",
                            borderRadius: "var(--r-md)",
                            border: `2px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                            background: isSelected ? "var(--accent-subtle)" : "var(--surface-2)",
                            cursor: "pointer", textAlign: "left",
                          }}
                        >
                          {ch.avatarUrl
                            ? <img src={ch.avatarUrl} alt={ch.name} style={{ width: 32, height: 32, borderRadius: "var(--r-sm)", objectFit: "cover", flexShrink: 0 }} />
                            : <div style={{ width: 32, height: 32, borderRadius: "var(--r-sm)", background: color, display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{ch.name.slice(0, 1)}</div>
                          }
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{ch.name}</div>
                            {ch.species && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{ch.species}</div>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {charsData && charsData.characters.length > 0 && (
                  <div style={{ display: "flex", gap: "var(--s3)", justifyContent: "flex-end" }}>
                    <button className="btn" onClick={closeModal}>取消</button>
                    <button
                      className="btn btn-accent"
                      disabled={!selectedCharId || applyMutation.isPending}
                      onClick={() => selectedCharId && applyMutation.mutate(selectedCharId)}
                    >
                      {applyMutation.isPending ? "送出中⋯" : "送出申請"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
