import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useParams, useNavigate } from "react-router-dom"
import { recordView } from "@/lib/recentlyViewed"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { TemplateCanvas, buildDefaultTemplate } from "@/components/TemplateCanvas"
import type { CanvasCharacter, CanvasSection, CanvasSwatch, CanvasAlbum, CanvasDesign, Template as CanvasTemplate } from "@/components/TemplateCanvas"
import { charColor } from "@/lib/charColor"
import { PageLoading } from "@/components/LoadingSpinner"
import type { CharacterResponse, CharacterListResponse } from "@oc-tools/contracts"

// ── Small shared utils ────────────────────────────────────────────────────────

function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }}>
      {copied ? "✓ 已複製" : "複製連結"}
    </button>
  )
}

const VIS_LABEL: Record<string, { label: string; cls: string }> = {
  public:   { label: "公開",   cls: "public"   },
  unlisted: { label: "限連結", cls: "unlisted" },
  private:  { label: "私人",   cls: "private"  },
}

// ── Tab strip ─────────────────────────────────────────────────────────────────

type Tab = "overview" | "image" | "text" | "gallery" | "rels" | "projects"

function TabStrip({ active, onSelect, galleryCount, projectCount }: {
  active: Tab
  onSelect: (t: Tab) => void
  galleryCount: number
  projectCount: number
}) {
  const tabs: { id: Tab; label: string; ct?: number }[] = [
    { id: "overview",  label: "總覽" },
    { id: "image",     label: "圖設定" },
    { id: "text",      label: "文設定" },
    { id: "gallery",   label: "圖庫",       ct: galleryCount },
    { id: "rels",      label: "關係" },
    { id: "projects",  label: "加入的企劃", ct: projectCount },
  ]
  return (
    <div style={{
      display: "flex", gap: 0, borderBottom: "1px solid var(--border)",
      marginBottom: "var(--s5)", marginTop: "var(--s4)",
      overflowX: "auto", overflowY: "hidden",
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          style={{
            padding: "10px 18px",
            fontFamily: "inherit",
            fontSize: 13.5,
            fontWeight: active === t.id ? 700 : 500,
            color: active === t.id ? "var(--text)" : "var(--text-faint)",
            background: "none",
            border: "none",
            borderBottom: active === t.id ? "2.5px solid var(--text)" : "2.5px solid transparent",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: -1,
            whiteSpace: "nowrap",
            transition: "color .14s, border-color .14s",
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
            }}>
              {t.ct}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

type GpField = { id: string; label: string; type: string; value: string }
type GpSection = { id: string; title: string; group: string; fields: GpField[] }
type GpSwatch = { id: string; label: string; hex: string }

function FieldValue({ field }: { field: GpField }) {
  if (!field.value) return <span style={{ color: "var(--text-faint)" }}>—</span>
  if (field.type === "tags") {
    const items = field.value.split(",").map(s => s.trim()).filter(Boolean)
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {items.map((t, i) => (
          <span key={i} style={{ fontSize: 11, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-pill)", padding: "2px 8px", color: "var(--text-dim)" }}>{t}</span>
        ))}
      </div>
    )
  }
  if (field.type === "check" || field.type === "avoid") {
    const items = field.value.split("\n").map(s => s.trim()).filter(Boolean)
    const isMust = field.type === "check"
    return (
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 13 }}>
            <span style={{ color: isMust ? "var(--must)" : "var(--avoid)", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
              {isMust ? "✓" : "✕"}
            </span>
            {item}
          </li>
        ))}
      </ul>
    )
  }
  return <span style={{ fontSize: 13.5, color: "var(--text)" }}>{field.value}</span>
}

function OverviewTab({
  canvasChar,
  template,
  design,
  charId,
  memberships,
  hasProfile,
}: {
  canvasChar: CanvasCharacter
  template: any
  design: any
  charId: string
  memberships: { projectId: string; projectName: string; projectColor: string }[]
  hasProfile: boolean
}) {
  const sections = (canvasChar.sections ?? []) as GpSection[]
  const palette  = (canvasChar.palette  ?? []) as GpSwatch[]

  const textSections = sections.filter(s => s.group === "text")
  const imageSections = sections.filter(s => s.group === "image")

  return (
    <div>
      {hasProfile ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "var(--s5)", alignItems: "start" }}>
          {/* Left column — text sections */}
          <div>
            {/* Palette if exists */}
            {palette.length > 0 && (
              <div className="block" style={{ padding: "var(--s4) var(--s5)", marginBottom: "var(--s4)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "var(--s3)" }}>
                  色票 Palette
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {palette.map(sw => (
                    <div key={sw.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 24, height: 24, borderRadius: 6, background: sw.hex, border: "1px solid var(--border)", display: "inline-block", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{sw.label}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-faint)" }}>{sw.hex}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {textSections.map(sec => (
              <div key={sec.id} className="block" style={{ padding: "var(--s4) var(--s5)", marginBottom: "var(--s4)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "var(--s3)" }}>
                  {sec.title}
                </div>
                {sec.fields.map(f => (
                  <div key={f.id} style={{ marginBottom: "var(--s3)" }}>
                    {sec.fields.length > 1 && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", marginBottom: 4 }}>{f.label}</div>
                    )}
                    <FieldValue field={f} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Right column — image sections + projects */}
          <div>
            {imageSections.map(sec => (
              <div key={sec.id} className="block" style={{ padding: "var(--s4) var(--s5)", marginBottom: "var(--s4)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "var(--s3)" }}>
                  {sec.title}
                </div>
                {sec.fields.map(f => (
                  <div key={f.id} style={{ marginBottom: "var(--s3)" }}>
                    {f.label && sec.fields.length > 1 && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", marginBottom: 4 }}>{f.label}</div>
                    )}
                    <FieldValue field={f} />
                  </div>
                ))}
              </div>
            ))}

            {memberships.length > 0 && (
              <div className="block" style={{ padding: "var(--s4) var(--s5)", marginBottom: "var(--s4)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "var(--s3)" }}>
                  最近企劃
                </div>
                {memberships.slice(0, 3).map(m => (
                  <Link key={m.projectId} to={`/p/${m.projectId}/roster`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid var(--border)" }} className="mini-char">
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: m.projectColor, flexShrink: 0, display: "grid", placeItems: "center" }}>
                        <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-serif)" }}>{m.projectName.slice(0, 1)}</span>
                      </div>
                      <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.projectName}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Full canvas preview if structured sections are empty */
        <div style={{ border: "1.5px dashed var(--border)", borderRadius: "var(--r-lg)", padding: "var(--s8)", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--text-faint)", margin: "0 0 var(--s3)" }}>這個角色還沒有設定內容</p>
          <Link to={`/characters/${charId}/edit`} className="btn btn-accent" style={{ fontSize: 13 }}>開始編輯</Link>
        </div>
      )}

      {/* Canvas preview section */}
      {hasProfile && (
        <div style={{ marginTop: "var(--s6)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--s3)" }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-faint)", margin: 0 }}>
              公開頁預覽
            </p>
            <Link to={`/characters/${charId}/edit`} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
              編輯版型 →
            </Link>
          </div>
          <TemplateCanvas character={canvasChar} template={template} design={design} />
        </div>
      )}
    </div>
  )
}

// ── Gallery tab ───────────────────────────────────────────────────────────────

function GalleryTab({ albums, charId }: { albums: CanvasAlbum[]; charId: string }) {
  const [activeAlbum, setActiveAlbum] = useState<string>("all")
  const [lightbox, setLightbox] = useState<{ url: string; caption: string } | null>(null)

  const allImages = albums.flatMap(a => a.images.map(img => ({ ...img, albumName: a.name })))

  const shownImages = activeAlbum === "all"
    ? allImages
    : albums.find(a => a.id === activeAlbum)?.images.map(img => ({ ...img, albumName: "" })) ?? []

  if (albums.length === 0 || allImages.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--s10) var(--s5)" }}>
        <p style={{ color: "var(--text-faint)", marginBottom: "var(--s4)" }}>還沒有圖片。</p>
        <Link to={`/characters/${charId}/edit`} className="btn btn-accent">去上傳圖片</Link>
      </div>
    )
  }

  return (
    <div>
      {/* Album filter */}
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

      {/* Image grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--s3)" }}>
        {shownImages.map((img, i) => (
          <div
            key={img.id ?? i}
            style={{ cursor: "pointer", borderRadius: "var(--r-card)", overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface-2)" }}
            onClick={() => setLightbox({ url: img.url, caption: img.caption ?? "" })}
          >
            <div style={{ aspectRatio: "1", overflow: "hidden", background: "var(--surface-2)" }}>
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

      {/* Lightbox */}
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

// ── Image settings tab ────────────────────────────────────────────────────────

function ImageSettingsTab({ sections, palette, charId }: {
  sections: GpSection[]
  palette: GpSwatch[]
  charId: string
}) {
  const imageSections = sections.filter(s => s.group === "image")
  const hasContent = palette.length > 0 || imageSections.length > 0

  if (!hasContent) {
    return (
      <div style={{ textAlign: "center", padding: "var(--s10) var(--s5)" }}>
        <p style={{ color: "var(--text-faint)", marginBottom: "var(--s4)" }}>還沒有圖設定內容。</p>
        <Link to={`/characters/${charId}/edit`} className="btn btn-accent">去編輯角色</Link>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s5)" }}>
      {/* Palette */}
      {palette.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "var(--s3)" }}>
            色票 · PALETTE
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "var(--s3)" }}>
            {palette.map(sw => (
              <div key={sw.id} className="block" style={{ padding: "var(--s3) var(--s4)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: sw.hex, border: "1px solid rgba(0,0,0,.08)", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,.1)" }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sw.label}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>{sw.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image sections */}
      {imageSections.map(sec => {
        const checkFields = sec.fields.filter(f => f.type === "check")
        const avoidFields = sec.fields.filter(f => f.type === "avoid")
        const tagFields   = sec.fields.filter(f => f.type === "tags")
        const textFields  = sec.fields.filter(f => f.type !== "check" && f.type !== "avoid" && f.type !== "tags")

        return (
          <div key={sec.id}>
            {sec.title && (
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "var(--s3)" }}>
                {sec.title}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "var(--s4)", alignItems: "start" }}>
              {/* Check fields */}
              {checkFields.length > 0 && (
                <div className="block" style={{ padding: "var(--s4) var(--s5)" }}>
                  {checkFields.map(f => (
                    <div key={f.id}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: "#1f8a5b", marginBottom: "var(--s2)" }}>✅ {f.label || "必畫重點"}</div>
                      {f.value.split(/[\n|]+/).filter(Boolean).map((item, i) => {
                        const [zh, en] = item.split("|").map(s => s.trim())
                        return (
                          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 10px", background: "rgba(31,138,91,.07)", borderRadius: 8, marginBottom: 5 }}>
                            <span style={{ color: "#1f8a5b", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>✓</span>
                            <div>
                              <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{zh}</div>
                              {en && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 1 }}>{en}</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* Avoid fields */}
              {avoidFields.length > 0 && (
                <div className="block" style={{ padding: "var(--s4) var(--s5)" }}>
                  {avoidFields.map(f => (
                    <div key={f.id}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: "#c0584f", marginBottom: "var(--s2)" }}>🚫 {f.label || "不可畫錯"}</div>
                      {f.value.split(/[\n|]+/).filter(Boolean).map((item, i) => {
                        const [zh, en] = item.split("|").map(s => s.trim())
                        return (
                          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 10px", background: "rgba(192,88,79,.07)", borderRadius: 8, marginBottom: 5 }}>
                            <span style={{ color: "#c0584f", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>✕</span>
                            <div>
                              <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{zh}</div>
                              {en && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 1 }}>{en}</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* Tag fields */}
              {tagFields.map(f => (
                <div key={f.id} className="block" style={{ padding: "var(--s4) var(--s5)" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-dim)", marginBottom: "var(--s2)" }}>{f.label}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {f.value.split(",").map(s => s.trim()).filter(Boolean).map((tag, i) => (
                      <span key={i} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}

              {/* Text fields */}
              {textFields.map(f => (
                <div key={f.id} className="block" style={{ padding: "var(--s4) var(--s5)" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-dim)", marginBottom: "var(--s2)" }}>{f.label}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Text settings tab ─────────────────────────────────────────────────────────

function TextSettingsTab({ sections, charId }: { sections: GpSection[]; charId: string }) {
  const textSections = sections.filter(s => s.group === "text")

  if (textSections.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--s10) var(--s5)" }}>
        <p style={{ color: "var(--text-faint)", marginBottom: "var(--s4)" }}>還沒有文設定內容。</p>
        <Link to={`/characters/${charId}/edit`} className="btn btn-accent">去編輯角色</Link>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s5)" }}>
      {textSections.map(sec => (
        <div key={sec.id}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "var(--s3)" }}>
            {sec.title}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--s3)" }}>
            {sec.fields.map(f => (
              <div key={f.id} className="block" style={{ padding: "var(--s4) var(--s5)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", marginBottom: "var(--s2)" }}>{f.label}</div>
                {(f.type === "check" || f.type === "avoid") ? (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                    {f.value.split("\n").filter(Boolean).map((item, i) => (
                      <li key={i} style={{ display: "flex", gap: 6, fontSize: 13.5, lineHeight: 1.5 }}>
                        <span style={{ color: f.type === "check" ? "#1f8a5b" : "#c0584f", fontWeight: 700, flexShrink: 0 }}>
                          {f.type === "check" ? "✓" : "✕"}
                        </span>
                        {item.split("|")[0]?.trim()}
                      </li>
                    ))}
                  </ul>
                ) : f.type === "tags" ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {f.value.split(",").map(s => s.trim()).filter(Boolean).map((tag, i) => (
                      <span key={i} className="tag">{tag}</span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--text)" }}>{f.value}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Relations tab ─────────────────────────────────────────────────────────────

import type { CharacterMembership } from "@oc-tools/contracts"

function RelationsTab({ memberships }: { memberships: CharacterMembership[] }) {
  const active = memberships.filter(m => m.status !== "rejected")

  if (active.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--s10) var(--s5)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-serif)", marginBottom: "var(--s2)" }}>關係在企劃裡。</div>
        <p style={{ color: "var(--text-faint)", fontSize: 13.5, margin: 0 }}>
          角色關係屬於各企劃的「關係圖」。這個角色尚未加入任何企劃。
        </p>
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 var(--s4)" }}>
        關係是 <b>企劃範圍</b> 的資料，沒有跨企劃的全域角色關係。依企劃查看：
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
        {active.map(m => (
          <div key={m.projectId} className="block" style={{ padding: "var(--s4) var(--s5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)", marginBottom: "var(--s3)" }}>
              <span style={{
                width: 36, height: 36, borderRadius: 10, background: m.projectColor,
                display: "grid", placeItems: "center", flexShrink: 0,
                color: "#fff", fontFamily: "var(--font-serif)", fontWeight: 800, fontSize: 16,
              }}>
                {m.projectName.slice(0, 1)}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "var(--font-serif)" }}>{m.projectName}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>關係是這個企劃的設定</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--s2)" }}>
              <Link to={`/p/${m.projectId}/relationships`} className="btn btn-sm btn-ghost">
                在 {m.projectName} 關係圖中查看 →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Projects tab ──────────────────────────────────────────────────────────────

function ProjectsTab({
  memberships,
}: {
  memberships: CharacterMembership[]
}) {
  if (memberships.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--s10) var(--s5)" }}>
        <p style={{ color: "var(--text-faint)", marginBottom: "var(--s3)" }}>這個角色還沒有加入任何企劃。</p>
        <Link to="/projects" className="btn btn-ghost">瀏覽企劃</Link>
      </div>
    )
  }

  const statusLabel: Record<string, { label: string; cls: string }> = {
    approved: { label: "已通過", cls: "approved" },
    pending:  { label: "待審",   cls: "pending"  },
    rejected: { label: "已拒絕", cls: "draft"    },
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
      {memberships.map(m => {
        const st = statusLabel[m.status ?? "pending"] ?? { label: "待審", cls: "pending" }
        return (
          <div key={m.projectId} className="block" style={{ padding: "var(--s4) var(--s5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--s4)", marginBottom: (m.factionLabel || m.projectRole) ? "var(--s3)" : 0 }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: m.projectColor, flexShrink: 0, display: "grid", placeItems: "center" }}>
                <span style={{ color: "#fff", fontFamily: "var(--font-serif)", fontWeight: 800, fontSize: 18 }}>{m.projectName.slice(0, 1)}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "var(--font-serif)" }}>{m.projectName}</div>
                {(m.factionLabel || m.projectRole) && (
                  <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 2 }}>
                    {[m.factionLabel, m.projectRole].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              <span className={`badge ${st.cls}`}>{st.label}</span>
            </div>
            <div style={{ display: "flex", gap: "var(--s2)", flexWrap: "wrap" }}>
              {m.linkId && (
                <Link to={`/p/${m.projectId}/roster/${m.linkId}`} className="btn btn-sm btn-ghost">
                  查看此企劃中的版本
                </Link>
              )}
              {m.linkId && (
                <Link to={`/p/${m.projectId}/roster/${m.linkId}/edit`} className="btn btn-sm btn-ghost">
                  編輯企劃限定資料
                </Link>
              )}
              {!m.linkId && (
                <Link to={`/p/${m.projectId}/roster`} className="btn btn-sm btn-ghost">
                  查看企劃角色
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CharacterDetailPage() {
  const { charId } = useParams<{ charId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>("overview")
  const [showDelete, setShowDelete] = useState(false)

  const { data, status } = useQuery({
    queryKey: ["character", charId],
    queryFn: () => apiClient<CharacterResponse>(`/api/app/characters/${charId}`),
    enabled: !!charId,
  })

  // Fetch character list to get memberships (often cached from MyCharactersPage)
  const { data: listData } = useQuery({
    queryKey: ["characters"],
    queryFn: () => apiClient<CharacterListResponse>("/api/app/characters"),
    staleTime: 60_000,
  })

  const deleteMutation = useMutation({
    mutationFn: () => apiClient(`/api/app/characters/${charId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["characters"] })
      navigate("/characters")
    },
    onError: () => alert("刪除失敗，請稍後再試"),
  })

  const character = data?.character
  useEffect(() => {
    if (!character) return
    recordView({ type: "char", id: character.id, name: character.name, path: `/characters/${character.id}`, color: charColor(character.id), imgUrl: character.avatarUrl ?? undefined })
  }, [character?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "pending") return <PageLoading />
  if (status === "error")   return <div className="page"><p style={{ color: "var(--avoid)" }}>找不到角色</p></div>
  if (!character) return null

  const color = character.themeColor ?? charColor(character.id)
  const vis = VIS_LABEL[character.visibility] ?? VIS_LABEL.private

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
  const templates = (gp.templates as CanvasTemplate[] | undefined) ?? []
  const template = templates[0] ?? buildDefaultTemplate(canvasChar)
  const design = (gp.design as CanvasDesign | undefined) ?? { primary: color, bg: "#ffffff" } as CanvasDesign

  const albums = (gp.albums as CanvasAlbum[] | undefined) ?? []
  const allImageCount = albums.reduce((sum, a) => sum + a.images.length, 0)

  // Get memberships from cached list data
  const memberships = listData?.characters.find(c => c.id === character.id)?.memberships ?? []

  const hasProfile = Boolean(
    (canvasChar.sections ?? []).length > 0
    || (canvasChar.palette ?? []).length > 0
    || (canvasChar.albums ?? []).length > 0
    || canvasChar.mainVisualUrl
    || canvasChar.tagline
  )

  return (
    <div className="page">
      <ContextHeader scope="account" crumbs={[{ label: "我的角色", href: "/characters" }, character.name]} />

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
          {((gp.tagline as string | undefined) || character.species || character.summary) && (
            <p className="tagline">
              {(gp.tagline as string | undefined) ?? character.species ?? character.summary}
            </p>
          )}
          <div className="meta">
            <span className={`vis-b ${vis.cls}`}><span className="d" />{vis.label}</span>
            {memberships.length > 0 && (
              <span style={{ fontSize: 12.5, color: "var(--text-dim)" }}>加入 {memberships.length} 個企劃</span>
            )}
            {character.updatedAt && (
              <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
                更新 {new Date(character.updatedAt).toLocaleDateString("zh-TW")}
              </span>
            )}
            {(character.tags ?? []).map(tag => <span key={tag} className="tag">{tag}</span>)}
          </div>
        </div>
        <div className="acts">
          <Link to={`/characters/${charId}/edit`} className="btn btn-accent">編輯角色</Link>
          {character.visibility !== "private" && character.slug && (
            <>
              <a href={`/c/${character.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: 13 }}>
                公開頁 ↗
              </a>
              <CopyUrlButton url={`${window.location.origin}/c/${character.slug}`} />
            </>
          )}
          <button
            className="btn btn-ghost"
            style={{ color: "var(--avoid)" }}
            onClick={() => setShowDelete(true)}
          >
            刪除
          </button>
        </div>
      </div>

      {/* ── Slug fallback warning ── */}
      {character.visibility !== "private" && character.slug && /^character-[0-9a-f]{8}$/.test(character.slug) && (
        <div style={{ background: "var(--warn-soft, #FFF8E1)", border: "1px solid var(--warn, #F0C040)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--text)", marginBottom: 4, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span>⚠️</span>
          <span>
            公開網址目前是自動生成的亂碼（<code>/c/{character.slug}</code>）。
            {" "}<Link to={`/characters/${charId}/edit`} style={{ color: "var(--accent-ink)", fontWeight: 600 }}>前往編輯</Link>，在「Romaji / 代稱」欄位填入英文名稱即可改成漂亮的網址。
          </span>
        </div>
      )}

      {/* ── Tab navigation ── */}
      <TabStrip
        active={tab}
        onSelect={setTab}
        galleryCount={allImageCount}
        projectCount={memberships.length}
      />

      {/* ── Tab content ── */}
      {tab === "overview" && (
        <OverviewTab
          canvasChar={canvasChar}
          template={template}
          design={design}
          charId={charId!}
          memberships={memberships}
          hasProfile={hasProfile}
        />
      )}

      {tab === "image" && (
        <ImageSettingsTab
          sections={(gp.sections as GpSection[] | undefined) ?? []}
          palette={(gp.palette as GpSwatch[] | undefined) ?? []}
          charId={charId!}
        />
      )}

      {tab === "text" && (
        <TextSettingsTab
          sections={(gp.sections as GpSection[] | undefined) ?? []}
          charId={charId!}
        />
      )}

      {tab === "gallery" && (
        <GalleryTab albums={albums} charId={charId!} />
      )}

      {tab === "rels" && (
        <RelationsTab memberships={memberships} />
      )}

      {tab === "projects" && (
        <ProjectsTab memberships={memberships} />
      )}

      {/* ── Delete modal ── */}
      {showDelete && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-h">
              <h2>刪除「{character.name}」？</h2>
              <button className="modal-close" onClick={() => setShowDelete(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "var(--text-dim)" }}>
                角色將被封存，企劃中的設定資料不會消失。
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowDelete(false)}>取消</button>
              <button
                className="btn"
                style={{ background: "var(--avoid)", color: "#fff" }}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? "刪除中…" : "確認刪除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
