import { useState, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { charColor } from "@/lib/charColor"
import { TemplateCanvas, buildDefaultTemplate } from "@/components/TemplateCanvas"
import type {
  CanvasCharacter, CanvasSection, CanvasSwatch, CanvasAlbum, CanvasAnnotation
} from "@/components/TemplateCanvas"
import type { Character } from "@oc-tools/contracts"

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildCanvasCharacter(ch: Character): CanvasCharacter {
  const gp = (ch.generalProfile ?? {}) as Record<string, unknown>
  return {
    name: ch.name,
    tagline: (gp.tagline as string | undefined) ?? ch.summary ?? undefined,
    avatarUrl: ch.avatarUrl ?? undefined,
    mainVisualUrl: (gp.mainVisualUrl as string | undefined),
    sections: (gp.sections as CanvasSection[] | undefined) ?? [],
    palette: (gp.palette as CanvasSwatch[] | undefined) ?? [],
    albums: (gp.albums as CanvasAlbum[] | undefined) ?? [],
  }
}

function splitLines(val: string) {
  return val.split(/[\n|]+/).map(s => s.trim()).filter(Boolean)
}

// ── Sticky topbar ──────────────────────────────────────────────────────────────

type PublicTab = "general" | "commission"
const TAB_LABELS: Record<PublicTab, string> = { general: "一般", commission: "委託" }

function TopBar({
  character,
  tab,
  onTab,
}: {
  character: Character
  tab: PublicTab
  onTab: (t: PublicTab) => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }, [])

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", gap: "var(--s3)",
      padding: "0 var(--s5)",
      height: 52,
    }}>
      {/* Logo + breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: "#1a1a1a",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5, padding: 5, flexShrink: 0,
        }}>
          {[0,1,2,3].map(i => <div key={i} style={{ background: "#fff", borderRadius: 1 }} />)}
        </div>
        <span style={{ fontWeight: 800, fontSize: 13, color: "var(--text)" }}>CharacterHub</span>
        <span style={{ color: "var(--text-faint)", fontSize: 13 }}>/</span>
        <span style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {character.name}
        </span>
      </div>

      {/* Tab pills */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0, background: "var(--surface-2)", borderRadius: 999, padding: 4 }}>
        {(["general", "commission"] as PublicTab[]).map(t => (
          <button
            key={t}
            onClick={() => onTab(t)}
            style={{
              padding: "5px 14px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: tab === t ? 700 : 500,
              fontFamily: "inherit",
              background: tab === t ? "var(--text)" : "transparent",
              color: tab === t ? "#fff" : "var(--text-dim)",
              transition: "background .14s, color .14s",
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          title={copied ? "已複製！" : "複製連結"}
          onClick={handleCopyLink}
          style={{
            width: 34, height: 34, borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            cursor: "pointer",
            display: "grid", placeItems: "center",
            fontSize: 14, color: "var(--text-dim)",
            transition: "background .12s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)" }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
        >
          {copied ? "✓" : "↗"}
        </button>
        <button
          title="更多"
          style={{
            width: 34, height: 34, borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            cursor: "pointer",
            display: "grid", placeItems: "center",
            fontSize: 16, letterSpacing: 2, color: "var(--text-dim)",
            transition: "background .12s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)" }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
        >
          ···
        </button>
      </div>
    </div>
  )
}

// ── Commission tab ────────────────────────────────────────────────────────────

function SwatchTile({ sw, accent: _accent }: { sw: CanvasSwatch; accent: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(sw.hex).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    })
  }
  return (
    <div
      onClick={copy}
      style={{
        borderRadius: "var(--r-card)", overflow: "hidden",
        border: "1px solid var(--border)", cursor: "pointer",
        boxShadow: "0 1px 3px rgba(0,0,0,.06)",
        transition: "transform .15s, box-shadow .15s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,.12)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,.06)" }}
    >
      <div style={{ height: 72, background: sw.hex, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 8 }}>
        <span style={{
          fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700,
          background: "rgba(0,0,0,.45)", color: "#fff",
          borderRadius: 5, padding: "2px 6px", opacity: copied ? 1 : 0.7,
          transition: "opacity .12s",
        }}>
          {copied ? "複製了！" : "copy"}
        </span>
      </div>
      <div style={{ padding: "8px 10px", background: "var(--bg)" }}>
        <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 2 }}>{sw.label}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>{sw.hex}</div>
      </div>
    </div>
  )
}

function CheckList({ title, items, isCheck }: { title: string; items: string[]; isCheck: boolean }) {
  const col  = isCheck ? "#1f8a5b" : "#c0584f"
  const bg   = isCheck ? "rgba(31,138,91,.08)" : "rgba(192,88,79,.08)"
  const icon = isCheck ? "✅" : "🚫"
  const en   = isCheck ? "Must-draw" : "Avoid"

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: "var(--s3)" }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: col }}>{icon} {title}</span>
        <span style={{ fontSize: 12, color: "var(--text-faint)", fontStyle: "italic" }}>{en}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => {
          const [zh, en_] = item.split("|").map(s => s.trim())
          return (
            <div
              key={i}
              style={{
                background: bg, borderRadius: "var(--r-card)",
                padding: "10px 14px",
                display: "flex", gap: 10, alignItems: "flex-start",
              }}
            >
              <span style={{ color: col, fontWeight: 800, fontSize: 15, flexShrink: 0, marginTop: 1 }}>
                {isCheck ? "✓" : "✕"}
              </span>
              <div>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{zh}</div>
                {en_ && <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2 }}>{en_}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AnnotatedImage({
  url,
  annotations,
  accent,
}: {
  url: string
  annotations: CanvasAnnotation[]
  accent: string
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div style={{ position: "relative", borderRadius: "var(--r-card)", overflow: "hidden", border: "1px solid var(--border)" }}>
      <img src={url} alt="角色參考" style={{ width: "100%", display: "block", objectFit: "contain" }} />
      {annotations.map((ann, i) => (
        <div
          key={ann.id}
          onMouseEnter={() => setHovered(ann.id)}
          onMouseLeave={() => setHovered(null)}
          style={{
            position: "absolute",
            left: `${ann.x}%`,
            top: `${ann.y}%`,
            transform: "translate(-50%, -50%)",
            width: 26, height: 26,
            borderRadius: "50%",
            background: accent,
            color: "#fff",
            fontWeight: 800, fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "default",
            boxShadow: "0 2px 6px rgba(0,0,0,.35)",
            border: "2px solid rgba(255,255,255,.5)",
            zIndex: 10,
            transition: "transform .12s",
            ...(hovered === ann.id ? { transform: "translate(-50%, -50%) scale(1.2)" } : {}),
          }}
          title={ann.note ?? ann.label ?? ""}
        >
          {i + 1}
        </div>
      ))}
      {annotations.length > 0 && (
        <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 10, color: "rgba(255,255,255,.8)", background: "rgba(0,0,0,.5)", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>
          最大 · 最清晰的作畫基準
        </div>
      )}
    </div>
  )
}

function CommissionTab({
  character,
  canvasChar,
  accent,
}: {
  character: Character
  canvasChar: CanvasCharacter
  accent: string
}) {
  const gp = (character.generalProfile ?? {}) as Record<string, unknown>
  const palette = canvasChar.palette ?? []
  const sections = canvasChar.sections ?? []

  // Collect check / avoid field groups from all sections
  const checkGroups: { title: string; items: string[] }[] = []
  const avoidGroups: { title: string; items: string[] }[] = []

  for (const sec of sections) {
    const checkFields = (sec.fields ?? []).filter(f => f.type === "check")
    const avoidFields = (sec.fields ?? []).filter(f => f.type === "avoid")
    if (checkFields.length > 0) {
      for (const f of checkFields) {
        checkGroups.push({ title: f.label, items: splitLines(f.value) })
      }
    }
    if (avoidFields.length > 0) {
      for (const f of avoidFields) {
        avoidGroups.push({ title: f.label, items: splitLines(f.value) })
      }
    }
  }

  const mainVisualUrl = canvasChar.mainVisualUrl
  const annotations = (gp.annotations as CanvasAnnotation[] | undefined) ?? []

  const hasContent = palette.length > 0 || checkGroups.length > 0 || avoidGroups.length > 0

  if (!hasContent && !mainVisualUrl) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "var(--s10) var(--s5)", textAlign: "center" }}>
        <p style={{ color: "var(--text-faint)", marginBottom: "var(--s2)" }}>這個角色還沒有委託參考資料。</p>
        <p style={{ color: "var(--text-faint)", fontSize: 12 }}>角色主理人可以在編輯頁面加入色票、必畫重點等內容。</p>
      </div>
    )
  }

  return (
    <div>
      {/* Commission header strip */}
      <div style={{
        background: "var(--surface-2)",
        borderBottom: "1px solid var(--border)",
        padding: "10px var(--s5)",
        display: "flex", alignItems: "center", gap: "var(--s3)", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{character.name}</span>
          <span style={{ color: "var(--text-faint)" }}>·</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>委託速覽</span>
          <span style={{ background: accent, color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", borderRadius: 6, padding: "2px 8px", marginLeft: 4 }}>
            30-SEC READ
          </span>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-faint)", marginLeft: "auto" }}>
          繪師打開即看重點
        </span>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "var(--s6) var(--s5)" }}>
        <div style={{ display: "grid", gridTemplateColumns: mainVisualUrl ? "repeat(auto-fit,minmax(min(280px,100%),1fr))" : "1fr", gap: "var(--s6)", alignItems: "start" }}>

          {/* Left: annotated image */}
          {mainVisualUrl && (
            <AnnotatedImage url={mainVisualUrl} annotations={annotations} accent={accent} />
          )}

          {/* Right: palette + check/avoid sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s6)" }}>

            {palette.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: "var(--s3)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, color: "var(--text-faint)" }}>01</span>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>色票</span>
                  <span style={{ fontSize: 12, color: "var(--text-faint)", fontStyle: "italic" }}>Palette</span>
                  <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" }}>點擊複製</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "var(--s2)" }}>
                  {palette.map(sw => <SwatchTile key={sw.id} sw={sw} accent={accent} />)}
                </div>
              </div>
            )}

            {checkGroups.map((g, idx) => {
              const n = idx + 1 + (palette.length > 0 ? 1 : 0)
              return (
                <div key={idx}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, color: "var(--text-faint)", marginBottom: "var(--s2)" }}>
                    {String(n).padStart(2, "0")}
                  </div>
                  <CheckList title={g.title} items={g.items} isCheck={true} />
                </div>
              )
            })}

            {avoidGroups.map((g, idx) => {
              const n = idx + 1 + checkGroups.length + (palette.length > 0 ? 1 : 0)
              return (
                <div key={idx}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, color: "var(--text-faint)", marginBottom: "var(--s2)" }}>
                    {String(n).padStart(2, "0")}
                  </div>
                  <CheckList title={g.title} items={g.items} isCheck={false} />
                </div>
              )
            })}

          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PublicCharacterPage() {
  const { slug } = useParams<{ slug: string }>()
  const [tab, setTab] = useState<PublicTab>("general")

  const { data, status } = useQuery({
    queryKey: ["public-character", slug],
    queryFn: () => apiClient<{ character: Character }>(`/api/public/characters/${slug}`),
    enabled: !!slug,
    retry: false,
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
          <p style={{ color: "var(--text-dim)", fontSize: 14 }}>這個角色可能不存在，或尚未公開。</p>
        </div>
      </div>
    )
  }

  const { character } = data
  const accent = character.themeColor ?? charColor(character.id)
  const canvasChar = buildCanvasCharacter(character)
  const gp = (character.generalProfile ?? {}) as Record<string, unknown>
  type GpTpl = { id: string; name: string; design?: Record<string, unknown>; blocks: unknown[] }
  const savedTpls = (gp.templates as GpTpl[] | undefined) ?? []
  const publicTplId = gp.publicTplId as string | undefined
  const activeTpl = (publicTplId ? savedTpls.find(t => t.id === publicTplId) : null) ?? savedTpls[0] ?? null
  const template = activeTpl ?? (gp.template as { blocks: unknown[] } | undefined) ?? buildDefaultTemplate(canvasChar)
  const design = (activeTpl?.design as Record<string, unknown> | undefined) ?? (gp.design as Record<string, unknown> | undefined) ?? { primary: accent, bg: "#ffffff" }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: "var(--s10)" }}>
      <TopBar character={character} tab={tab} onTab={setTab} />

      {tab === "general" && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "var(--s6) var(--s5) 0" }}>
          <TemplateCanvas
            character={canvasChar}
            template={template as any}
            design={design as any}
          />
        </div>
      )}

      {tab === "commission" && (
        <CommissionTab character={character} canvasChar={canvasChar} accent={accent} />
      )}

      <div style={{ textAlign: "center", marginTop: "var(--s10)", padding: "var(--s8) var(--s5)", borderTop: "1px solid var(--border)" }}>
        <p style={{ fontSize: 12, color: "var(--text-faint)", margin: 0 }}>
          Powered by <strong>CharacterHub</strong>
        </p>
      </div>
    </div>
  )
}
