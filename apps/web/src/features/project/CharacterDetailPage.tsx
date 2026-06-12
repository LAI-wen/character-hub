import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import { TemplateCanvas, buildDefaultTemplate } from "@/components/TemplateCanvas"
import { charColor } from "@/lib/charColor"
import type { CanvasCharacter, CanvasSection, CanvasSwatch, CanvasAlbum } from "@/components/TemplateCanvas"
import type { ProjectCharacterLinkResponse } from "@oc-tools/contracts"

// ── Visibility badge ──────────────────────────────────────────────────────────

const VIS = {
  public:   { cls: "public",   label: "公開"   },
  private:  { cls: "private",  label: "私人"   },
  unlisted: { cls: "unlisted", label: "限連結" },
}

function VisBadge({ v }: { v: string }) {
  const cfg = VIS[v as keyof typeof VIS] ?? { cls: "private", label: v }
  return <span className={`vis-b ${cfg.cls}`}><span className="d" />{cfg.label}</span>
}

// ── Tab strip ─────────────────────────────────────────────────────────────────

type Tab = "profile" | "image" | "text" | "gallery" | "rels" | "project"

function TabStrip({ active, onSelect, galleryCount }: {
  active: Tab
  onSelect: (t: Tab) => void
  galleryCount: number
}) {
  const tabs: { id: Tab; label: string; ct?: number }[] = [
    { id: "profile",  label: "總覽" },
    { id: "image",    label: "圖設定" },
    { id: "text",     label: "文設定" },
    { id: "gallery",  label: "圖庫", ct: galleryCount },
    { id: "rels",     label: "關係" },
    { id: "project",  label: "企劃資料" },
  ]
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: "var(--s5)", marginTop: "var(--s4)" }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          style={{
            padding: "10px 18px", fontFamily: "inherit",
            fontSize: 13.5,
            fontWeight: active === t.id ? 700 : 500,
            color: active === t.id ? "var(--text)" : "var(--text-faint)",
            background: "none", border: "none",
            borderBottom: active === t.id ? "2.5px solid var(--text)" : "2.5px solid transparent",
            cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
            marginBottom: -1, transition: "color .14s, border-color .14s",
          }}
        >
          {t.label}
          {t.ct !== undefined && t.ct > 0 && (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
              background: active === t.id ? "var(--text)" : "var(--border-strong)",
              color: active === t.id ? "#fff" : "var(--text-faint)",
              borderRadius: "var(--r-pill)", padding: "1px 6px",
              transition: "background .14s, color .14s",
            }}>{t.ct}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Image settings tab (read-only) ────────────────────────────────────────────

type GpSwatch = { name: string; hex: string }
type GpSection = { id: string; name: string; type: string; fields: { key: string; label: string; type: string; value: string }[] }

function ImageReadTab({ palette, sections }: { palette: GpSwatch[]; sections: GpSection[] }) {
  const imageSections = sections.filter(s => s.type === "image" || s.type === "art")

  return (
    <div className="det-grid">
      <div>
        {palette.length > 0 && (
          <div className="block" style={{ padding: "var(--s4) var(--s5)", marginBottom: "var(--s4)" }}>
            <div className="bh">色票 · Palette</div>
            <div className="palette">
              {palette.map((sw, i) => (
                <span key={i} className="pal-sw">
                  <span className="c" style={{ background: sw.hex }} />
                  {sw.name} <span className="hex">{sw.hex}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {imageSections.map(sec => (
          <div key={sec.id} className="block" style={{ padding: "var(--s4) var(--s5)", marginBottom: "var(--s4)" }}>
            <div className="bh">{sec.name}</div>
            <div className="kvs">
              {sec.fields.map(f => (
                <div key={f.key} className="r">
                  <span className="k">{f.label}</span>
                  <span>{f.value || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {palette.length === 0 && imageSections.length === 0 && (
          <div style={{ color: "var(--text-faint)", fontSize: 13.5, padding: "var(--s6) 0" }}>尚無圖設定資料。</div>
        )}
      </div>
    </div>
  )
}

// ── Text settings tab (read-only) ─────────────────────────────────────────────

function TextReadTab({ sections }: { sections: GpSection[] }) {
  const textSections = sections.filter(s => s.type === "text" || s.type === "writer")

  if (textSections.length === 0) {
    return <div style={{ color: "var(--text-faint)", fontSize: 13.5, padding: "var(--s6) 0" }}>尚無文設定資料。</div>
  }

  return (
    <div className="det-grid">
      <div>
        {textSections.map(sec => (
          <div key={sec.id} className="block" style={{ padding: "var(--s4) var(--s5)", marginBottom: "var(--s4)" }}>
            <div className="bh">{sec.name}</div>
            <div className="kvs">
              {sec.fields.map(f => (
                <div key={f.key} className="r">
                  <span className="k">{f.label}</span>
                  <span style={{ fontSize: 13.5, lineHeight: 1.7 }}>{f.value || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Relations tab (project-scoped) ────────────────────────────────────────────

function RelsProjectTab({ projectId, projectName, characterName }: {
  projectId: string
  projectName: string
  characterName: string
}) {
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 var(--s4)" }}>
        關係是 <b>企劃範圍</b> 的資料。查看 {characterName} 在此企劃的關係：
      </p>
      <div className="block" style={{ padding: "var(--s4) var(--s5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)", marginBottom: "var(--s3)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "var(--font-serif)" }}>{projectName}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>關係是這個企劃的設定</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--s2)" }}>
          <Link to={`/p/${projectId}/relationships`} className="btn btn-sm btn-ghost">
            在 {projectName} 關係圖中查看 →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Gallery tab ───────────────────────────────────────────────────────────────

function GalleryTab({ albums, projectId, linkId }: { albums: CanvasAlbum[]; projectId: string; linkId: string }) {
  const [activeAlbum, setActiveAlbum] = useState("all")
  const [lightbox, setLightbox] = useState<{ url: string; caption: string } | null>(null)

  const allImages = albums.flatMap(a => a.images.map(img => ({ ...img, albumName: a.name })))
  const shown = activeAlbum === "all"
    ? allImages
    : albums.find(a => a.id === activeAlbum)?.images.map(i => ({ ...i, albumName: "" })) ?? []

  if (allImages.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--s10) var(--s5)" }}>
        <p style={{ color: "var(--text-faint)", marginBottom: "var(--s4)" }}>角色還沒有圖片。</p>
        <Link to={`/p/${projectId}/roster/${linkId}/edit`} className="btn btn-ghost">去角色編輯</Link>
      </div>
    )
  }

  return (
    <div>
      {albums.length > 1 && (
        <div className="filterbar" style={{ marginBottom: "var(--s4)" }}>
          <button className={"fbtn" + (activeAlbum === "all" ? " on" : "")} onClick={() => setActiveAlbum("all")}>
            全部 <span className="ct">{allImages.length}</span>
          </button>
          {albums.map(a => (
            <button key={a.id} className={"fbtn" + (activeAlbum === a.id ? " on" : "")} onClick={() => setActiveAlbum(a.id)}>
              {a.name} <span className="ct">{a.images.length}</span>
            </button>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--s3)" }}>
        {shown.map((img, i) => (
          <div
            key={img.id ?? i}
            style={{ cursor: "pointer", borderRadius: "var(--r-card)", overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface-2)" }}
            onClick={() => setLightbox({ url: img.url, caption: img.caption ?? "" })}
          >
            <div style={{ aspectRatio: "1", overflow: "hidden" }}>
              <img
                src={img.url} alt={img.caption}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform .2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = "scale(1.04)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = "scale(1)" }}
              />
            </div>
            {img.caption && (
              <div style={{ padding: "6px 10px", fontSize: 11.5, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {img.caption}
              </div>
            )}
          </div>
        ))}
      </div>
      {lightbox && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setLightbox(null)}
        >
          <div style={{ maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column", gap: 12 }} onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption} style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: "var(--r-card)" }} />
            {lightbox.caption && <p style={{ color: "#fff", fontSize: 13, textAlign: "center", margin: 0 }}>{lightbox.caption}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Project data tab ──────────────────────────────────────────────────────────

function ProjectDataTab({
  projectLink,
  projectId,
  linkId,
}: {
  projectLink: { factionLabel?: string | null; projectRole?: string | null; visibility?: string; fieldValues?: Record<string, unknown>; status?: string }
  projectId: string
  linkId: string
}) {
  const statusMap: Record<string, { label: string; cls: string }> = {
    approved: { label: "已通過", cls: "approved" },
    pending:  { label: "待審",   cls: "pending"  },
    rejected: { label: "已拒絕", cls: "draft"    },
  }
  const status = statusMap[projectLink.status ?? ""] ?? { label: projectLink.status ?? "未知", cls: "draft" }
  const fieldValues = projectLink.fieldValues ?? {}
  const hasFields = Object.keys(fieldValues).length > 0

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
      <div className="block" style={{ padding: "var(--s4) var(--s5)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "var(--s3)" }}>
          企劃身份
        </div>
        <div className="kvs">
          {projectLink.factionLabel && (
            <div className="r">
              <span className="k">陣營</span>
              <span>{projectLink.factionLabel}</span>
            </div>
          )}
          {projectLink.projectRole && (
            <div className="r">
              <span className="k">角色定位</span>
              <span>{projectLink.projectRole}</span>
            </div>
          )}
          <div className="r">
            <span className="k">可見性</span>
            <VisBadge v={projectLink.visibility ?? "private"} />
          </div>
          <div className="r">
            <span className="k">審核狀態</span>
            <span className={`badge ${status.cls}`}>{status.label}</span>
          </div>
        </div>
      </div>

      {hasFields && (
        <div className="block" style={{ padding: "var(--s4) var(--s5)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "var(--s3)" }}>
            自訂欄位
          </div>
          <div className="kvs">
            {Object.entries(fieldValues).map(([k, v]) => (
              <div className="r" key={k}>
                <span className="k">{k}</span>
                <span>{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--s2)" }}>
        <Link to={`/p/${projectId}/roster/${linkId}/edit`} className="btn btn-accent">
          編輯企劃資料
        </Link>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CharacterDetailPage() {
  const { projectId, linkId } = useParams<{ projectId: string; linkId: string }>()
  const { project } = useProjectContext()
  const [tab, setTab] = useState<Tab>("profile")

  const { data, status } = useQuery({
    queryKey: ["project", projectId, "roster", linkId],
    queryFn: () => apiClient<ProjectCharacterLinkResponse>(`/api/app/projects/${projectId}/characters/${linkId}`),
    enabled: !!projectId && !!linkId,
  })

  if (status === "pending") return <div className="page" style={{ color: "var(--text-faint)" }}>載入中⋯</div>

  if (status === "error" || !data?.character) {
    return (
      <div className="page">
        <div style={{ color: "var(--avoid)", marginBottom: "var(--s4)" }}>找不到角色。</div>
        <Link to={`/p/${projectId}/roster`} className="lnk">← 回角色列表</Link>
      </div>
    )
  }

  const { character, projectLink } = data
  const color = character.themeColor ?? charColor(character.id)

  // Parse generalProfile
  const gp = (character.generalProfile ?? {}) as Record<string, unknown>
  const canvasChar: CanvasCharacter = {
    name:          character.name,
    tagline:       (gp.tagline as string | undefined) ?? character.summary ?? undefined,
    avatarUrl:     character.avatarUrl ?? undefined,
    mainVisualUrl: (gp.mainVisualUrl as string | undefined),
    sections:      (gp.sections as CanvasSection[] | undefined) ?? [],
    palette:       (gp.palette as CanvasSwatch[] | undefined) ?? [],
    albums:        (gp.albums as CanvasAlbum[] | undefined) ?? [],
  }
  const template = (gp.template as { blocks: unknown[] } | undefined) ?? buildDefaultTemplate(canvasChar)
  const design   = (gp.design as Record<string, unknown> | undefined) ?? { primary: color, bg: "#ffffff" }

  const albums = (gp.albums as CanvasAlbum[] | undefined) ?? []
  const allImageCount = albums.reduce((sum, a) => sum + a.images.length, 0)

  const hasProfile = (canvasChar.sections ?? []).length > 0
    || (canvasChar.palette ?? []).length > 0
    || (canvasChar.albums ?? []).length > 0
    || canvasChar.mainVisualUrl

  return (
    <div className="page">
      <ContextHeader
        scope="project"
        crumbs={[
          { label: project.name, href: `/p/${projectId}` },
          { label: "企劃角色", href: `/p/${projectId}/roster` },
          character.name,
        ]}
      />

      {/* ── Character Header ── */}
      <div className="ch-head">
        <div className="av" style={{ background: color }}>
          {character.avatarUrl
            ? <img src={character.avatarUrl} alt={character.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "inherit" }} />
            : character.name.slice(0, 1)
          }
        </div>

        <div className="id">
          <h1>
            {character.name}
            {character.romaji && <span className="rom"> {character.romaji}</span>}
          </h1>
          {(character.species || character.summary) && (
            <p className="tagline">
              {character.species ?? character.summary!.slice(0, 80)}
            </p>
          )}
          <div className="meta">
            {projectLink.factionLabel && (
              <span className="tag">{projectLink.factionLabel}</span>
            )}
            {projectLink.projectRole && (
              <span className="tag">{projectLink.projectRole}</span>
            )}
            <VisBadge v={character.visibility} />
            {(character.tags ?? []).map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        </div>

        <div className="acts">
          <Link to={`/p/${projectId}/roster`} className="btn btn-ghost">← 角色列表</Link>
          <Link to={`/p/${projectId}/roster/${linkId}/edit`} className="btn btn-accent">編輯</Link>
        </div>
      </div>

      {/* ── Tabs ── */}
      <TabStrip active={tab} onSelect={setTab} galleryCount={allImageCount} />

      {/* ── Tab content ── */}

      {tab === "profile" && (
        <div>
          {/* Summary quick view */}
          {(character.summary || (character.tags ?? []).length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "var(--s4)", marginBottom: "var(--s5)" }}>
              {character.summary && (
                <div className="block" style={{ padding: "var(--s4) var(--s5)" }}>
                  <div className="bh">簡介</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{character.summary}</p>
                </div>
              )}
              {(character.tags ?? []).length > 0 && (
                <div className="block" style={{ padding: "var(--s4) var(--s5)" }}>
                  <div className="bh">標籤</div>
                  <div className="tagrow">
                    {(character.tags ?? []).map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Canvas preview */}
          {hasProfile ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--s3)" }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-faint)", margin: 0 }}>
                  角色資料
                </p>
                <Link to={`/characters/${character.id}/edit`} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
                  編輯角色本體 →
                </Link>
              </div>
              <TemplateCanvas character={canvasChar} template={template as any} design={design as any} />
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "var(--s8) var(--s5)", border: "1.5px dashed var(--border)", borderRadius: "var(--r-lg)" }}>
              <p style={{ color: "var(--text-faint)", margin: "0 0 var(--s4)" }}>角色還沒有設定資料。</p>
              <Link to={`/characters/${character.id}/edit`} className="btn btn-ghost">去編輯角色本體</Link>
            </div>
          )}
        </div>
      )}

      {tab === "image" && (
        <ImageReadTab
          palette={(gp.palette as GpSwatch[] | undefined) ?? []}
          sections={(gp.sections as GpSection[] | undefined) ?? []}
        />
      )}

      {tab === "text" && (
        <TextReadTab
          sections={(gp.sections as GpSection[] | undefined) ?? []}
        />
      )}

      {tab === "gallery" && (
        <GalleryTab albums={albums} projectId={projectId!} linkId={linkId!} />
      )}

      {tab === "rels" && (
        <RelsProjectTab
          projectId={projectId!}
          projectName={project.name}
          characterName={character.name}
        />
      )}

      {tab === "project" && (
        <ProjectDataTab projectLink={projectLink} projectId={projectId!} linkId={linkId!} />
      )}
    </div>
  )
}
