import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { PageHeader } from "@/components/PageHeader"
import type { CharacterListResponse } from "@oc-tools/contracts"

const PALETTE = [
  "#4A6FA5","#C0392B","#27AE60","#8E44AD","#E67E22",
  "#16A085","#2C3E50","#7F8C8D","#D35400","#1A5276",
]
function charColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function MyCharactersPage() {
  const { data, status } = useQuery({
    queryKey: ["characters"],
    queryFn: () => apiClient<CharacterListResponse>("/api/app/characters"),
  })

  const characters = data?.characters ?? []

  return (
    <div className="page">
      <ContextHeader scope="account" crumbs={["我的角色"]} />
      <PageHeader
        title="我的角色"
        eyebrow="Characters"
        sub="你所有的角色，可跨企劃使用。"
      />

      {status === "pending" && <p style={{ color: "var(--text-faint)" }}>載入中⋯</p>}
      {status === "error" && <p style={{ color: "var(--avoid)" }}>無法載入角色</p>}

      {status === "success" && characters.length === 0 && (
        <div className="block" style={{ textAlign: "center", padding: "var(--s7) var(--s5)" }}>
          <p style={{ color: "var(--text-faint)" }}>還沒有角色。</p>
        </div>
      )}

      {status === "success" && characters.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--s4)" }}>
          {characters.map(character => {
            const color = charColor(character.id)
            return (
              <Link
                key={character.id}
                to={`/characters/${character.id}`}
                className="block"
                style={{ display: "block", textDecoration: "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)", marginBottom: "var(--s3)" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: color, display: "grid", placeItems: "center",
                    color: "#fff", fontWeight: 800, fontSize: 18,
                  }}>
                    {character.name.slice(0, 1)}
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {character.name}
                  </span>
                </div>
                {character.species && (
                  <span className="tag">{character.species}</span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
