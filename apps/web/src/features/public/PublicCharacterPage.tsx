import { useQuery } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { charColor } from "@/lib/charColor"
import type { Character } from "@oc-tools/contracts"

export function PublicCharacterPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data, status } = useQuery({
    queryKey: ["public-character", slug],
    queryFn: () => apiClient<{ character: Character }>(`/api/public/characters/${slug}`),
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
          <p style={{ color: "var(--text-dim)", fontSize: 14 }}>這個角色可能不存在，或尚未公開。</p>
        </div>
      </div>
    )
  }

  const { character } = data
  const color = charColor(character.id)

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: "var(--s10)" }}>
      {/* Hero */}
      <div style={{ background: color, padding: "var(--s10) var(--s6) var(--s8)", textAlign: "center" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.75, color: "#fff", marginBottom: 20 }}>
          CharacterHub
        </p>

        {/* Avatar */}
        <div style={{
          width: 96, height: 96, borderRadius: "50%",
          margin: "0 auto 20px",
          overflow: "hidden",
          boxShadow: "inset 0 0 0 3px rgba(255,255,255,.3), 0 4px 20px rgba(0,0,0,.2)",
          background: "rgba(255,255,255,.2)",
        }}>
          {character.avatarUrl
            ? <img src={character.avatarUrl} alt={character.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontFamily: "var(--font-serif)", fontSize: 42, fontWeight: 700, color: "#fff" }}>
                {character.name.slice(0, 1)}
              </div>
          }
        </div>

        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(26px, 5vw, 42px)", fontWeight: 800, color: "#fff", margin: "0 0 8px", lineHeight: 1.1 }}>
          {character.name}
        </h1>
        {character.romaji && (
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.75)", margin: "0 0 8px", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>{character.romaji}</p>
        )}
        {character.species && (
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.85)", margin: "0 0 8px" }}>{character.species}</p>
        )}
        {character.heightCm && (
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.75)", margin: "0 0 8px" }}>{character.heightCm} cm</p>
        )}
        {(character.tags ?? []).length > 0 && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
            {(character.tags ?? []).map(tag => (
              <span key={tag} style={{
                background: "rgba(255,255,255,.2)", color: "#fff", borderRadius: "var(--r-pill)",
                padding: "3px 12px", fontSize: 12, fontWeight: 600,
              }}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "var(--s8) var(--s5) 0" }}>
        {character.summary && (
          <div className="block" style={{ marginBottom: "var(--s5)" }}>
            <div className="bh">簡介</div>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--text-dim)", whiteSpace: "pre-wrap" }}>
              {character.summary}
            </p>
          </div>
        )}

        {character.nickname && (
          <div className="block" style={{ marginBottom: "var(--s5)" }}>
            <div className="bh">暱稱</div>
            <p style={{ fontSize: 14, color: "var(--text-dim)" }}>{character.nickname}</p>
          </div>
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
