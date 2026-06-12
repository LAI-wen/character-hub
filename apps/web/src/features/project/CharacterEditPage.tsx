import { useEffect, useRef, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useParams, useNavigate } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { compressImage } from "@/lib/compressImage"
import { ContextHeader } from "@/components/ContextHeader"
import { charColor } from "@/lib/charColor"
import { TemplateCanvas, buildDefaultTemplate } from "@/components/TemplateCanvas"
import type { CanvasCharacter, CanvasSection, CanvasSwatch, CanvasAlbum } from "@/components/TemplateCanvas"
import { AssetPickerModal } from "@/components/AssetPickerModal"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import type { ProjectCharacterLinkResponse, CharacterResponse } from "@oc-tools/contracts"
import { AvatarCropperModal } from "@/components/AvatarCropperModal"
import { EyedropperModal } from "@/components/EyedropperModal"
import { AnnotationModal } from "@/components/AnnotationModal"
import type { Annotation as GpAnnotation } from "@/components/AnnotationModal"
import { CharBackupModal } from "@/components/CharBackupModal"
import { PRESETS } from "@/data/palettePresets"

// ─── Types ────────────────────────────────────────────────────────────────────

type GpField   = { id: string; label: string; type: string; value: string }
type GpSection = { id: string; title: string; group: "text" | "image"; fields: GpField[] }
type GpSwatch  = { id: string; label: string; hex: string }
type GpImage   = { id: string; url: string; caption: string; annotations?: GpAnnotation[] }
type GpAlbum   = { id: string; name: string; kind: "ref" | "gallery"; images: GpImage[]; linkRef?: string }

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const Ic = {
  Check:   () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,9 6,13 14,3"/></svg>,
  Doc:     () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="1" width="10" height="14" rx="2"/><line x1="6" y1="5" x2="10" y2="5"/><line x1="6" y1="8" x2="10" y2="8"/><line x1="6" y1="11" x2="9" y2="11"/></svg>,
  Reset:   () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 2.5A6 6 0 1 0 14 8"/><polyline points="14,2 14,6.5 9.5,6"/></svg>,
  Trash:   () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,4 15,4"/><path d="M13,4v10a1,1 0 0 1-1,1H4a1,1 0 0 1-1-1V4"/><path d="M5,4V3a1,1 0 0 1 1-1h4a1,1 0 0 1 1,1v1"/></svg>,
  Upload:  () => <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4,7 8,3 12,7"/><line x1="8" y1="3" x2="8" y2="12"/><line x1="2" y1="14" x2="14" y2="14"/></svg>,
  Plus:    () => <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>,
  Person:  () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="5" r="3"/><path d="M2,14a6,6 0 0 1 12,0"/></svg>,
  Image:   () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="14" height="10" rx="2"/><circle cx="5.5" cy="7" r="1" fill="currentColor" stroke="none"/><polyline points="1,13 5,9 8,12 11,9 15,13"/></svg>,
  Palette: () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><circle cx="5" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="11" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="11" r="1" fill="currentColor" stroke="none"/></svg>,
  Folder:  () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2,12V5a1,1 0 0 1 1-1h3l1.5,2H13a1,1 0 0 1 1,1v5a1,1 0 0 1-1,1H3a1,1 0 0 1-1-1z"/></svg>,
  Photos:  () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="11" height="10" rx="2"/><path d="M5,4V3a1,1 0 0 1 1-1h7a1,1 0 0 1 1,1v8"/><circle cx="6" cy="9" r="1.5"/><polyline points="2,14 5,10 8,13 10,11 13,14"/></svg>,
  Gear:    () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M11.54 4.46l-1.41 1.41M4.46 11.54l-1.41 1.41"/></svg>,
  ChevUp:  () => <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,10 8,5 13,10"/></svg>,
  ChevDn:  () => <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 8,11 13,6"/></svg>,
  Tag:     () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14,7.5L8.5,2H3a1,1 0 0 0-1,1v5.5l5.5,5.5a2,2 0 0 0 2.83,0l3.67-3.67A2,2 0 0 0 14,7.5z"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor" stroke="none"/></svg>,
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const S = {
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 22,
    boxShadow: "0 10px 36px rgba(60,50,40,.06)",
    padding: 24,
    marginBottom: "var(--s5)",
  } as React.CSSProperties,

  inp: {
    fontFamily: "inherit",
    fontSize: 15,
    color: "var(--text)",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "11px 13px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
    transition: "border-color .14s, background .14s",
  } as React.CSSProperties,

  inpSm: {
    fontFamily: "inherit",
    fontSize: 13.5,
    color: "var(--text)",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 9,
    padding: "8px 10px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
    transition: "border-color .14s, background .14s",
  } as React.CSSProperties,

  addBtn: {
    fontFamily: "inherit",
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--accent)",
    background: "var(--accent-soft)",
    border: "none",
    borderRadius: 9,
    padding: "7px 12px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  ghostBtn: {
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-dim)",
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "8px 13px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    background: "var(--accent-soft)",
    color: "var(--accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  } as React.CSSProperties,

  sectionBar: {
    width: 7,
    height: 24,
    borderRadius: 4,
    background: "var(--accent)",
    flexShrink: 0,
  } as React.CSSProperties,
}

// ─── Constants ────────────────────────────────────────────────────────────────

const THEME_PALETTE = ["#4A6FA5","#C0392B","#27AE60","#8E44AD","#E67E22","#16A085","#2C3E50","#7F8C8D","#D35400","#1A5276","#E91E8C","#00BCD4"]

const FIELD_TYPES: Record<string, string> = {
  text: "短文字", longtext: "長文字", tags: "標籤", check: "必畫重點 ✓", avoid: "不可畫錯 ✕", attr: "屬性表",
}

const FIELD_PH: Record<string, string> = {
  text: "輸入內容…", longtext: "輸入內容…", tags: "以逗號或換行分隔",
  check: "每行一項（必畫重點）", avoid: "每行一項（不可畫錯）", attr: "格式：名稱: 值（每行一個）",
}

const TAGPAL = ["#c98a5e","#6c8db0","#7fa86b","#b1577e","#d9a441","#8d7c69","#a06cb0","#4a3f35"]

function uid() { return Math.random().toString(36).slice(2, 10) }

// ─── Form schema ──────────────────────────────────────────────────────────────

const Schema = z.object({
  name:          z.string().min(1, "必填"),
  romaji:        z.string().max(120).optional(),
  nickname:      z.string().max(120).optional(),
  species:       z.string().max(100).optional(),
  summary:       z.string().max(5000).optional(),
  tagline:       z.string().max(200).optional(),
  avatarUrl:     z.string().max(2000).optional(),
  mainVisualUrl: z.string().max(2000).optional(),
  tagsRaw:       z.string().optional(),
  themeColor:    z.string().optional(),
  visibility:    z.enum(["private", "unlisted", "public"]),
  projectRole:   z.string().max(120).optional(),
  factionLabel:  z.string().max(120).optional(),
})
type Fields = z.infer<typeof Schema>

type Tab        = "basic" | "image" | "text" | "gallery"
type PreviewTab = "general" | "commission"

const SUB_TABS: { key: Tab; Icon: React.FC; label: string }[] = [
  { key: "basic",   Icon: Ic.Person,  label: "基礎" },
  { key: "image",   Icon: Ic.Image,   label: "圖設定" },
  { key: "text",    Icon: Ic.Doc,     label: "文設定" },
  { key: "gallery", Icon: Ic.Photos,  label: "圖庫" },
]

// ─── Section title inline-editable ────────────────────────────────────────────

function SectionTitle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input value={value} placeholder="區塊名稱" onChange={e => onChange(e.target.value)}
      onFocus={e => (e.currentTarget.style.borderBottomColor = "var(--border)")}
      onBlur={e => (e.currentTarget.style.borderBottomColor = "transparent")}
      style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 19, color: "var(--text)", background: "transparent", border: "none", borderBottom: "1px dashed transparent", outline: "none", padding: "2px 0", transition: "border-bottom-color .14s" }}
    />
  )
}

// ─── Styled inputs ────────────────────────────────────────────────────────────

function InpOC({ sm, style, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { sm?: boolean }) {
  const base = sm ? S.inpSm : S.inp
  return (
    <input {...p} style={{ ...base, ...style }}
      onFocus={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "var(--accent)"; p.onFocus?.(e) }}
      onBlur={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--border)"; p.onBlur?.(e) }}
    />
  )
}

function TexOC({ style, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...p} style={{ ...S.inp, resize: "vertical", lineHeight: 1.7, minHeight: 80, ...style }}
      onFocus={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "var(--accent)" }}
      onBlur={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--border)" }}
    />
  )
}

function SelOC({ style, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} style={{ ...S.inpSm, cursor: "pointer", ...style }}
      onFocus={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "var(--accent)" }}
      onBlur={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--border)" }}
    >{children}</select>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ Icon, title, badge, trailing, children }: {
  Icon?: React.FC; title: string; badge?: React.ReactNode; trailing?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div style={S.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        {Icon && <span style={S.iconBox}><Icon /></span>}
        <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 19, margin: 0, color: "var(--text)", flex: 1 }}>{title}</h2>
        {badge}
        {trailing}
      </div>
      {children}
    </div>
  )
}

// ─── Label ────────────────────────────────────────────────────────────────────

function Lbl({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)" }}>{text}</span>
      {children}
    </label>
  )
}

// ─── Tab strip ────────────────────────────────────────────────────────────────

function TabStrip<T extends string>({ tabs, active, onChange }: {
  tabs: { key: T; Icon?: React.FC; label: string }[]; active: T; onChange: (t: T) => void
}) {
  return (
    <div style={{ display: "flex", gap: 5, background: "var(--surface-2)", padding: 5, borderRadius: 14, alignSelf: "flex-start", flexWrap: "wrap" }}>
      {tabs.map(t => (
        <button key={t.key} type="button" onClick={() => onChange(t.key)}
          style={{ fontFamily: "inherit", fontSize: 13.5, fontWeight: active === t.key ? 700 : 500, padding: "9px 15px", borderRadius: 9, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, background: active === t.key ? "var(--surface)" : "transparent", color: active === t.key ? "var(--text)" : "var(--text-dim)", boxShadow: active === t.key ? "0 1px 6px rgba(60,50,40,.10)" : "none", transition: "all .15s" }}>
          {t.Icon && <t.Icon />}
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Group toggle ─────────────────────────────────────────────────────────────

function GroupToggle({ value, onChange }: { value: "text" | "image"; onChange: (v: "text" | "image") => void }) {
  return (
    <>
      <span style={{ fontSize: 11, color: "var(--text-faint)", whiteSpace: "nowrap", flexShrink: 0 }}>歸在分頁</span>
      <div style={{ display: "flex", gap: 3, background: "var(--surface-2)", padding: 3, borderRadius: 9, flexShrink: 0 }}>
        {(["text", "image"] as const).map(g => (
          <button key={g} type="button" onClick={() => onChange(g)}
            style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 7, border: "none", cursor: "pointer", background: value === g ? (g === "text" ? "var(--accent)" : "#3B7D8B") : "transparent", color: value === g ? "#fff" : "var(--text-faint)", transition: "all .15s" }}>
            {g === "text" ? "文設定" : "圖設定"}
          </button>
        ))}
      </div>
    </>
  )
}

// ─── Dashed "新增" button ──────────────────────────────────────────────────────

function DashedAdd({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "var(--text-dim)", background: "var(--surface)", border: "1.5px dashed var(--border)", borderRadius: 16, padding: 15, cursor: "pointer", width: "100%", boxSizing: "border-box" as const, transition: "border-color .15s, color .15s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)" }}>
      ＋ {label}
    </button>
  )
}

// ─── Commission mini-preview ──────────────────────────────────────────────────

function CommissionPreview({ palette, sections, mainVisualUrl }: {
  palette: GpSwatch[]; sections: GpSection[]; mainVisualUrl: string
}) {
  const checkFields = sections.flatMap(s => s.fields.filter(f => f.type === "check"))
  const avoidFields = sections.flatMap(s => s.fields.filter(f => f.type === "avoid"))
  const hasContent  = palette.length > 0 || checkFields.length > 0 || avoidFields.length > 0

  if (!hasContent && !mainVisualUrl) {
    return (
      <div style={{ padding: "var(--s8) var(--s5)", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
        在「圖設定」加入色票、必畫重點後即可預覽委託說明。
      </div>
    )
  }

  return (
    <div style={{ padding: "var(--s4)" }}>
      {mainVisualUrl && (
        <img src={mainVisualUrl} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: "var(--s4)", objectFit: "contain" }} />
      )}
      {palette.length > 0 && (
        <div style={{ marginBottom: "var(--s4)" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>色票</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {palette.map(sw => (
              <div key={sw.id} style={{ textAlign: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: sw.hex, border: "1px solid rgba(0,0,0,.08)", marginBottom: 3 }} />
                <div style={{ fontSize: 10, color: "var(--text-faint)", fontFamily: "var(--font-mono)", maxWidth: 46, overflow: "hidden", textOverflow: "ellipsis" }}>{sw.label || sw.hex}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {checkFields.map((f, i) => (
        <div key={i} style={{ marginBottom: "var(--s3)" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#1f8a5b", marginBottom: 6 }}>✅ {f.label || "必畫重點"}</div>
          {f.value.split(/[\n|]+/).filter(Boolean).map((line, j) => (
            <div key={j} style={{ display: "flex", gap: 6, fontSize: 12, lineHeight: 1.5, padding: "4px 8px", background: "rgba(31,138,91,.08)", borderRadius: 6, marginBottom: 4 }}>
              <span style={{ color: "#1f8a5b", fontWeight: 700, flexShrink: 0 }}>✓</span>
              <span>{line.split("|")[0]?.trim()}</span>
            </div>
          ))}
        </div>
      ))}
      {avoidFields.map((f, i) => (
        <div key={i} style={{ marginBottom: "var(--s3)" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#c0584f", marginBottom: 6 }}>🚫 {f.label || "不可畫錯"}</div>
          {f.value.split(/[\n|]+/).filter(Boolean).map((line, j) => (
            <div key={j} style={{ display: "flex", gap: 6, fontSize: 12, lineHeight: 1.5, padding: "4px 8px", background: "rgba(192,88,79,.08)", borderRadius: 6, marginBottom: 4 }}>
              <span style={{ color: "#c0584f", fontWeight: 700, flexShrink: 0 }}>✕</span>
              <span>{line.split("|")[0]?.trim()}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CharacterEditPage() {
  const { projectId, linkId } = useParams<{ projectId: string; linkId: string }>()
  const { project } = useProjectContext()
  const navigate    = useNavigate()
  const qc          = useQueryClient()

  const avatarRef     = useRef<HTMLInputElement>(null)
  const mainVisualRef = useRef<HTMLInputElement>(null)
  const importRef     = useRef<HTMLInputElement>(null)

  const [avatarUploading,     setAvatarUploading]     = useState(false)
  const [mainVisualUploading, setMainVisualUploading] = useState(false)
  const [mainVisualPicker,    setMainVisualPicker]    = useState(false)
  const [tab,        setTab]       = useState<Tab>("basic")
  const [previewTab, setPreviewTab] = useState<PreviewTab>("general")

  const [palette,  setPalette]  = useState<GpSwatch[]>([])
  const [sections, setSections] = useState<GpSection[]>([])
  const [albums,   setAlbums]   = useState<GpAlbum[]>([])
  const [gpDirty,  setGpDirty]  = useState(false)
  const [pickerFor, setPickerFor] = useState<{ alId: string; imId: string } | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showEyedropper,    setShowEyedropper]    = useState(false)
  const [showBackupModal,   setShowBackupModal]   = useState(false)
  const [showAvatarCropper, setShowAvatarCropper] = useState(false)
  const [annotatingImage,   setAnnotatingImage]   = useState<{ alId: string; imId: string } | null>(null)

  const markDirty = useCallback(() => setGpDirty(true), [])

  const { data, status } = useQuery({
    queryKey: ["project", projectId, "roster", linkId],
    queryFn: () => apiClient<ProjectCharacterLinkResponse>(`/api/app/projects/${projectId}/characters/${linkId}`),
    enabled: !!projectId && !!linkId,
  })

  const character   = data?.character ?? null
  const projectLink = data?.projectLink ?? null

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty: formDirty } } = useForm<Fields>({
    resolver: zodResolver(Schema),
    defaultValues: { visibility: "private" },
  })

  useEffect(() => {
    if (!character) return
    const gp = (character.generalProfile ?? {}) as Record<string, unknown>
    reset({
      name:          character.name,
      romaji:        character.romaji ?? "",
      nickname:      character.nickname ?? "",
      species:       character.species ?? "",
      summary:       character.summary ?? "",
      tagline:       (gp.tagline as string | undefined) ?? "",
      avatarUrl:     (gp.avatarUrl as string | undefined) ?? character.avatarUrl ?? "",
      mainVisualUrl: (gp.mainVisualUrl as string | undefined) ?? "",
      tagsRaw:       (character.tags ?? []).join(", "),
      themeColor:    character.themeColor ?? "",
      visibility:    (character.visibility as Fields["visibility"]) ?? "private",
      projectRole:   projectLink?.projectRole ?? "",
      factionLabel:  projectLink?.factionLabel ?? "",
    })
    setPalette((gp.palette as GpSwatch[] | undefined) ?? [])
    setSections((gp.sections as GpSection[] | undefined) ?? [])
    setAlbums((gp.albums as GpAlbum[] | undefined) ?? [])
    setGpDirty(false)
  }, [character, projectLink, reset])

  const isDirty = formDirty || gpDirty

  const watchedName      = watch("name") ?? ""
  const watchedTagline   = watch("tagline") ?? ""
  const watchedMain      = watch("mainVisualUrl") ?? ""
  const watchedAvatarUrl = watch("avatarUrl") ?? ""
  const themeWatch       = watch("themeColor")
  const color = themeWatch || (character ? (character.themeColor ?? charColor(character.id)) : "#8A857C")

  const liveCanvasChar: CanvasCharacter = {
    name:          watchedName || character?.name || "…",
    tagline:       watchedTagline || undefined,
    avatarUrl:     watchedAvatarUrl || character?.avatarUrl || undefined,
    mainVisualUrl: watchedMain || undefined,
    sections:      sections as CanvasSection[],
    palette:       palette as CanvasSwatch[],
    albums:        albums.filter(a => a.kind === "gallery") as CanvasAlbum[],
  }
  const liveTemplate = buildDefaultTemplate(liveCanvasChar)
  const liveDesign   = { primary: color, bg: "#ffffff" }

  // ── Save ──────────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: async (fields: Fields) => {
      const gp = (character?.generalProfile ?? {}) as Record<string, unknown>
      const tags = fields.tagsRaw ? fields.tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : []
      await Promise.all([
        apiClient<CharacterResponse>(`/api/app/characters/${character!.id}`, {
          method: "PATCH",
          body: {
            name: fields.name, romaji: fields.romaji || undefined, nickname: fields.nickname || undefined,
            species: fields.species || undefined, summary: fields.summary || undefined,
            tags, themeColor: fields.themeColor || null, visibility: fields.visibility,
            generalProfile: {
              ...gp,
              tagline: fields.tagline || undefined,
              avatarUrl: fields.avatarUrl || undefined,
              mainVisualUrl: fields.mainVisualUrl || undefined,
              palette, sections, albums,
            },
          },
        }),
        apiClient(`/api/app/projects/${projectId}/characters/${linkId}`, {
          method: "PATCH",
          body: {
            projectRole:  fields.projectRole  || null,
            factionLabel: fields.factionLabel || null,
          },
        }),
      ])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId, "roster"] })
      setGpDirty(false)
      navigate(`/p/${projectId}/roster/${linkId}`)
    },
  })

  function doExport() {
    const fields = watch()
    const blob = new Blob([JSON.stringify({
      exportedAt: new Date().toISOString(),
      character: { name: fields.name, nickname: fields.nickname, tagline: fields.tagline, summary: fields.summary, tagsRaw: fields.tagsRaw, themeColor: fields.themeColor, visibility: fields.visibility, mainVisualUrl: fields.mainVisualUrl },
      generalProfile: { palette, sections, albums },
    }, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `${watch("name") || "character"}-backup.json`; a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target?.result as string)
        if (d.character) {
          if (d.character.name)             setValue("name",          d.character.name,          { shouldDirty: true })
          if (d.character.nickname  != null) setValue("nickname",      d.character.nickname ?? "", { shouldDirty: true })
          if (d.character.tagline   != null) setValue("tagline",       d.character.tagline  ?? "", { shouldDirty: true })
          if (d.character.summary   != null) setValue("summary",       d.character.summary  ?? "", { shouldDirty: true })
          if (d.character.mainVisualUrl != null) setValue("mainVisualUrl", d.character.mainVisualUrl ?? "", { shouldDirty: true })
          if (d.character.tagsRaw   != null) setValue("tagsRaw",       d.character.tagsRaw  ?? "", { shouldDirty: true })
          if (d.character.themeColor != null) setValue("themeColor",   d.character.themeColor ?? "", { shouldDirty: true })
        }
        if (d.generalProfile) {
          if (Array.isArray(d.generalProfile.palette))  { setPalette(d.generalProfile.palette);  markDirty() }
          if (Array.isArray(d.generalProfile.sections)) { setSections(d.generalProfile.sections); markDirty() }
          if (Array.isArray(d.generalProfile.albums))   { setAlbums(d.generalProfile.albums);     markDirty() }
        }
      } catch {
        alert("匯入失敗：JSON 格式不正確")
      }
      if (importRef.current) importRef.current.value = ""
    }
    reader.readAsText(file)
  }

  // ── Avatar & main visual upload ───────────────────────────────────────────

  async function handleAvatarFile(files: FileList | null) {
    if (!files?.[0] || !character) return
    setAvatarUploading(true)
    try {
      const compressed = await compressImage(files[0])
      const form = new FormData()
      form.append("file", compressed)
      const res = await apiClient<{ character: unknown; avatarUrl: string }>(`/api/app/characters/${character.id}/avatar`, { method: "POST", body: form })
      setValue("avatarUrl", res.avatarUrl, { shouldDirty: true })
      markDirty()
      qc.invalidateQueries({ queryKey: ["project", projectId, "roster"] })
    } finally {
      setAvatarUploading(false)
      if (avatarRef.current) avatarRef.current.value = ""
    }
  }

  async function handleMainVisualFile(files: FileList | null) {
    if (!files?.[0] || !character) return
    setMainVisualUploading(true)
    try {
      const compressed = await compressImage(files[0])
      const form = new FormData()
      form.append("file", compressed)
      const res = await apiClient<{ url: string }>(`/api/app/characters/${character.id}/main-visual`, { method: "POST", body: form })
      setValue("mainVisualUrl", res.url, { shouldDirty: true })
      markDirty()
    } finally {
      setMainVisualUploading(false)
      if (mainVisualRef.current) mainVisualRef.current.value = ""
    }
  }

  // ── Palette ───────────────────────────────────────────────────────────────

  const addSwatch    = () => { setPalette(p => [...p, { id: uid(), label: "", hex: "#c98a5e" }]); markDirty() }
  const updateSwatch = (id: string, k: keyof GpSwatch, v: string) => { setPalette(p => p.map(s => s.id === id ? { ...s, [k]: v } : s)); markDirty() }
  const removeSwatch = (id: string) => { setPalette(p => p.filter(s => s.id !== id)); markDirty() }
  const addSwatchHex = (hex: string) => { setPalette(p => [...p, { id: uid(), label: "", hex }]); markDirty() }

  const updateImageAnnotations = (alId: string, imId: string, anns: GpAnnotation[]) => {
    setAlbums(a => a.map(al => al.id === alId
      ? { ...al, images: al.images.map(im => im.id === imId ? { ...im, annotations: anns } : im) }
      : al
    ))
    markDirty()
  }

  async function uploadCroppedAvatar(file: File) {
    if (!character) return
    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await apiClient<{ character: unknown; avatarUrl: string }>(`/api/app/characters/${character.id}/avatar`, { method: "POST", body: form })
      setValue("avatarUrl", res.avatarUrl, { shouldDirty: true })
      markDirty()
      qc.invalidateQueries({ queryKey: ["project", projectId, "roster", linkId] })
      qc.invalidateQueries({ queryKey: ["characters"] })
    } finally {
      setAvatarUploading(false)
    }
  }

  // ── Sections ──────────────────────────────────────────────────────────────

  const addSection    = (g: "text"|"image") => { setSections(s => [...s, { id: uid(), title: "", group: g, fields: [] }]); markDirty() }
  const updateSecProp = (id: string, k: "title"|"group", v: string) => { setSections(s => s.map(sec => sec.id === id ? { ...sec, [k]: v } : sec)); markDirty() }
  const removeSection = (id: string) => { setSections(s => s.filter(sec => sec.id !== id)); markDirty() }
  const addField      = (secId: string, type: string) => { setSections(s => s.map(sec => sec.id === secId ? { ...sec, fields: [...sec.fields, { id: uid(), label: "", type, value: "" }] } : sec)); markDirty() }
  const updateField   = (secId: string, fId: string, k: keyof GpField, v: string) => { setSections(s => s.map(sec => sec.id === secId ? { ...sec, fields: sec.fields.map(f => f.id === fId ? { ...f, [k]: v } : f) } : sec)); markDirty() }
  const removeField   = (secId: string, fId: string) => { setSections(s => s.map(sec => sec.id === secId ? { ...sec, fields: sec.fields.filter(f => f.id !== fId) } : sec)); markDirty() }

  // ── Albums ────────────────────────────────────────────────────────────────

  const addAlbum    = (kind: "ref"|"gallery") => { setAlbums(a => [...a, { id: uid(), name: "", kind, images: [] }]); markDirty() }
  const updateAlbum = (id: string, k: keyof Omit<GpAlbum, "images"|"id">, v: string) => { setAlbums(a => a.map(al => al.id === id ? { ...al, [k]: v } : al)); markDirty() }
  const removeAlbum = (id: string) => { setAlbums(a => a.filter(al => al.id !== id)); markDirty() }
  const addImage    = (alId: string) => { setAlbums(a => a.map(al => al.id === alId ? { ...al, images: [...al.images, { id: uid(), url: "", caption: "" }] } : al)); markDirty() }
  const updateImage = (alId: string, imId: string, k: keyof GpImage, v: string) => { setAlbums(a => a.map(al => al.id === alId ? { ...al, images: al.images.map(im => im.id === imId ? { ...im, [k]: v } : im) } : al)); markDirty() }
  const removeImage = (alId: string, imId: string) => { setAlbums(a => a.map(al => al.id === alId ? { ...al, images: al.images.filter(im => im.id !== imId) } : al)); markDirty() }

  // ─── Section editor ───────────────────────────────────────────────────────

  function renderSection(sec: GpSection) {
    return (
      <section key={sec.id} style={{ ...S.card, borderLeft: "4px solid var(--accent)", borderRadius: 18, padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={S.sectionBar} />
          <SectionTitle value={sec.title} onChange={v => updateSecProp(sec.id, "title", v)} />
          <GroupToggle value={sec.group} onChange={v => updateSecProp(sec.id, "group", v)} />
          <button type="button" style={{ ...S.ghostBtn, fontSize: 12, padding: "6px 10px", color: "var(--avoid)", flexShrink: 0 }} onClick={() => removeSection(sec.id)}>刪除</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sec.fields.map(f => (
            <div key={f.id} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <InpOC sm value={f.label} placeholder="欄位名稱" style={{ flex: 1, fontWeight: 700 }}
                    onChange={e => updateField(sec.id, f.id, "label", e.target.value)} />
                  <SelOC value={f.type} style={{ flexShrink: 0, width: "auto" }}
                    onChange={e => updateField(sec.id, f.id, "type", e.target.value)}>
                    {Object.entries(FIELD_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </SelOC>
                </div>
                {(f.type === "longtext" || f.type === "check" || f.type === "avoid" || f.type === "attr")
                  ? <TexOC rows={3} value={f.value} placeholder={FIELD_PH[f.type] ?? "輸入內容…"} onChange={e => updateField(sec.id, f.id, "value", e.target.value)} />
                  : <InpOC value={f.value} placeholder={FIELD_PH[f.type] ?? "輸入內容…"} onChange={e => updateField(sec.id, f.id, "value", e.target.value)} />
                }
              </div>
              <button type="button"
                style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", color: "var(--text-dim)", fontSize: 15, marginTop: 1, display: "grid", placeItems: "center" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#c0584f"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#e0b3ad" }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)" }}
                onClick={() => removeField(sec.id, f.id)}>×</button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 }}>
          {[["text","短文字"],["longtext","長文字"],["tags","標籤"],["check","必畫重點 ✓"],["avoid","不可畫錯 ✕"]].map(([t, l]) => (
            <button key={t} type="button" style={S.addBtn} onClick={() => addField(sec.id, t)}>
              <Ic.Plus />{l}
            </button>
          ))}
        </div>
      </section>
    )
  }

  // ─── Album editor ─────────────────────────────────────────────────────────

  function renderAlbum(al: GpAlbum) {
    const isCollapsed = collapsed.has(al.id)
    const refAlbums   = albums.filter(a => a.kind === "ref")
    return (
      <div key={al.id} style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 15, background: "var(--surface-2)", marginBottom: "var(--s3)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: isCollapsed ? 0 : 12 }}>
          <button type="button" title="展開／收合相簿"
            onClick={() => setCollapsed(s => { const n = new Set(s); n.has(al.id) ? n.delete(al.id) : n.add(al.id); return n })}
            style={{ flexShrink: 0, width: 30, height: 34, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-dim)", borderRadius: 9, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            {isCollapsed ? <Ic.ChevDn /> : <Ic.ChevUp />}
          </button>
          <InpOC sm value={al.name} placeholder={al.kind === "ref" ? "設定相簿名稱（例：日常服）" : "相簿名稱"}
            style={{ flex: 1, minWidth: 130, fontWeight: 700, fontSize: 15 }}
            onChange={e => updateAlbum(al.id, "name", e.target.value)} />
          <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: "var(--text-dim)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", whiteSpace: "nowrap" }}>{al.images.length} 張</span>
          {!isCollapsed && (
            <>
              <button type="button" title="批次上傳（即將推出）"
                style={{ ...S.ghostBtn, fontSize: 12.5, flexShrink: 0 }}
                onClick={() => alert("批次上傳即將推出！目前請逐張新增圖片網址。")}>
                <Ic.Upload /> 上傳多張
              </button>
              <button type="button" style={{ ...S.addBtn, fontSize: 12.5, flexShrink: 0 }} onClick={() => addImage(al.id)}>
                <Ic.Plus /> 圖片
              </button>
            </>
          )}
          <button type="button"
            style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-dim)", cursor: "pointer", display: "grid", placeItems: "center" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#c0584f"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#e0b3ad" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)" }}
            onClick={() => removeAlbum(al.id)}><Ic.Trash /></button>
        </div>

        {isCollapsed ? (
          <div onClick={() => setCollapsed(s => { const n = new Set(s); n.delete(al.id); return n })}
            style={{ border: "1px dashed var(--border)", borderRadius: 11, padding: 11, textAlign: "center", color: "var(--text-faint)", fontSize: 12.5, cursor: "pointer" }}>
            已收合 · 共 {al.images.length} 張圖片（點此展開）
          </div>
        ) : (
          <>
            {al.kind === "gallery" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 700, whiteSpace: "nowrap" }}>
                  關聯設定<span style={{ fontWeight: 400, opacity: 0.75 }}>（選填）</span>
                </span>
                <SelOC value={al.linkRef ?? ""} style={{ flex: 1 }} onChange={e => updateAlbum(al.id, "linkRef", e.target.value)}>
                  <option value="">不關聯</option>
                  {refAlbums.map(r => <option key={r.id} value={r.id}>{r.name || "（未命名）"}</option>)}
                </SelOC>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {al.images.map(im => (
                <div key={im.id} style={{ display: "flex", gap: 9, alignItems: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 9 }}>
                  <div title="點擊放大預覽" onClick={() => im.url && window.open(im.url, "_blank")}
                    style={{ width: 50, height: 50, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", cursor: im.url ? "zoom-in" : "default" }}>
                    {im.url ? <img src={im.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 16, opacity: 0.5 }}>❀</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 7 }}>
                      <InpOC sm value={im.url} placeholder="圖片 URL https://…" style={{ flex: 1, fontSize: 13 }}
                        onChange={e => updateImage(al.id, im.id, "url", e.target.value)} />
                      <button type="button" style={S.addBtn} onClick={() => setPickerFor({ alId: al.id, imId: im.id })}>從圖庫選</button>
                    </div>
                    <InpOC sm value={im.caption} placeholder="說明（選填）" style={{ fontSize: 13 }}
                      onChange={e => updateImage(al.id, im.id, "caption", e.target.value)} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    <button type="button" style={{ ...S.addBtn, fontSize: 12, borderRadius: 8, padding: "7px 10px", justifyContent: "center" }}>
                      <Ic.Upload /> 上傳
                    </button>
                    {im.url && (
                      <button type="button" style={{ ...S.ghostBtn, fontSize: 12, borderRadius: 8, padding: "6px 10px", justifyContent: "center", whiteSpace: "nowrap" }}
                        onClick={() => setAnnotatingImage({ alId: al.id, imId: im.id })}>
                        標記{(im.annotations?.length ?? 0) > 0 && <span style={{ marginLeft: 4, background: "var(--accent)", color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{im.annotations!.length}</span>}
                      </button>
                    )}
                    <button type="button"
                      style={{ width: "100%", height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-dim)", cursor: "pointer", fontSize: 14 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#c0584f"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#e0b3ad" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)" }}
                      onClick={() => removeImage(al.id, im.id)}>×</button>
                  </div>
                </div>
              ))}
              {al.images.length === 0 && (
                <div style={{ border: "1.5px dashed var(--border)", borderRadius: 11, padding: 18, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>這個相簿還沒有圖片</div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  // ─── Loading / error ──────────────────────────────────────────────────────

  if (status === "pending") return <div className="page" style={{ color: "var(--text-faint)" }}>載入中⋯</div>
  if (status === "error" || !character) {
    return (
      <div className="page">
        <div style={{ color: "var(--avoid)", marginBottom: "var(--s4)" }}>找不到角色。</div>
        <Link to={`/p/${projectId}/roster`} className="lnk">← 回角色列表</Link>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <ContextHeader
        scope="project"
        crumbs={[
          { label: project.name, href: `/p/${projectId}` },
          { label: "角色列表", href: `/p/${projectId}/roster` },
          { label: character.name, href: `/p/${projectId}/roster/${linkId}` },
          "編輯",
        ]}
      />

      {/* ── Sticky action bar ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--surface)", borderBottom: "1px solid var(--border)", margin: "0 calc(var(--s8) * -1)", padding: "10px var(--s8)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* Avatar */}
        <div className="av-upload" onClick={() => setShowAvatarCropper(true)} title="更換頭像（裁切）">
          {(watchedAvatarUrl || character.avatarUrl)
            ? <img src={watchedAvatarUrl || character.avatarUrl!} alt={watchedName} className="av-img" />
            : <div className="av" style={{ background: color, fontSize: 18, width: "100%", height: "100%" }}>{watchedName.slice(0, 1) || character.name?.slice(0, 1) || "？"}</div>
          }
          <div className="av-overlay">{avatarUploading ? "…" : <Ic.Upload />}</div>
        </div>
        <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }} onChange={e => handleAvatarFile(e.target.files)} />
        <input ref={importRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={handleImportFile} />

        <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 17, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{watchedName || "…"}</span>

        <div style={{ flex: 1 }} />

        {/* 自動儲存 */}
        <span style={{ fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, color: isDirty ? "var(--accent)" : "var(--text-dim)", opacity: isDirty ? 1 : 0.8 }}>
          {mutation.isPending ? <><Ic.Reset />儲存中…</> : isDirty ? <><Ic.Check />有未儲存的更改</> : <><Ic.Check />已儲存</>}
        </span>

        <button type="button" title="備份與格式" style={S.ghostBtn} onClick={() => setShowBackupModal(true)}>
          <Ic.Doc /> 備份
        </button>

        <span style={{ width: 1, height: 22, background: "var(--border)", flexShrink: 0 }} />

        <Link to={`/p/${projectId}/roster/${linkId}`} style={{ ...S.ghostBtn, textDecoration: "none" }}>取消</Link>
        <button type="button" className="btn btn-accent" style={{ fontWeight: 700 }} disabled={mutation.isPending || !isDirty} onClick={handleSubmit(fields => mutation.mutate(fields))}>
          {mutation.isPending ? "儲存中…" : "儲存"}
        </button>
      </div>

      <div style={{ height: "var(--s5)" }} />

      {/* ── Main 2-col layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(380px,100%),1fr))", gap: "var(--s8)", alignItems: "start" }}>

        {/* Left: tabs + form */}
        <div style={{ minWidth: 0 }}>
          <div style={{ marginBottom: "var(--s5)" }}>
            <TabStrip tabs={SUB_TABS} active={tab} onChange={setTab} />
          </div>

          {/* ── 基礎 ── */}
          {tab === "basic" && (
            <form id="char-edit-form" onSubmit={handleSubmit(fields => mutation.mutate(fields))}>
              <Card Icon={Ic.Person} title="身分">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 15, marginBottom: 15 }}>
                  <Lbl text="角色名稱 *">
                    <InpOC placeholder="例：莉央" {...register("name")} />
                    {errors.name && <span style={{ fontSize: 12, color: "var(--avoid)" }}>{errors.name.message}</span>}
                  </Lbl>
                  <Lbl text="羅馬拼音 Romaji">
                    <InpOC placeholder="例：Liang" {...register("romaji")} />
                  </Lbl>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 15, marginBottom: 15 }}>
                  <Lbl text="暱稱">
                    <InpOC placeholder="例：小央" {...register("nickname")} />
                  </Lbl>
                  <Lbl text="種族 / 身分">
                    <InpOC placeholder="例：半精靈" {...register("species")} />
                  </Lbl>
                </div>
                <Lbl text="一句話介紹 Tagline（≤60）">
                  <InpOC placeholder="一句能代表角色的話" {...register("tagline")} />
                </Lbl>
                <div style={{ marginTop: 15 }}>
                  <Lbl text="角色簡介">
                    <TexOC rows={4} placeholder="簡短介紹這個角色…" {...register("summary")} />
                  </Lbl>
                </div>
              </Card>

              <Card Icon={Ic.Gear} title="展示設定">
                <Lbl text="角色顏色">
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    {THEME_PALETTE.map(c => (
                      <button key={c} type="button" onClick={() => setValue("themeColor", c, { shouldDirty: true })}
                        style={{ width: 30, height: 30, borderRadius: "50%", background: c, border: "none", cursor: "pointer", flexShrink: 0, outline: color === c ? "3px solid var(--text)" : "none", outlineOffset: 2 }} />
                    ))}
                    <label style={{ position: "relative", cursor: "pointer" }} title="自訂顏色">
                      <input type="color" value={color} onChange={e => setValue("themeColor", e.target.value, { shouldDirty: true })} style={{ opacity: 0, position: "absolute", width: 0, height: 0 }} />
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", background: color, border: "2px dashed rgba(255,255,255,.6)", fontSize: 13 }}>＋</span>
                    </label>
                  </div>
                </Lbl>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                  <Lbl text="可見度">
                    <SelOC {...register("visibility")}>
                      <option value="private">私人 — 只有你</option>
                      <option value="unlisted">限連結</option>
                      <option value="public">公開</option>
                    </SelOC>
                  </Lbl>
                  <Lbl text="標籤">
                    <InpOC sm placeholder="以逗號分隔" {...register("tagsRaw")} />
                  </Lbl>
                </div>
              </Card>

              {/* ── 企劃設定 ── */}
              <Card Icon={Ic.Folder} title={`企劃設定 · ${project.name}`}>
                <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 16px", lineHeight: 1.6 }}>以下設定只在這個企劃中有效，不影響角色本身。</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 15 }}>
                  <Lbl text="角色定位">
                    <InpOC placeholder="例：主角、對立角" {...register("projectRole")} />
                  </Lbl>
                  <Lbl text="所屬勢力">
                    <InpOC placeholder="例：帝國軍、反抗軍" {...register("factionLabel")} />
                  </Lbl>
                </div>
                {mutation.isError && (
                  <div style={{ fontSize: 13, color: "var(--avoid)", marginTop: "var(--s3)" }}>儲存失敗，請稍後再試。</div>
                )}
              </Card>
            </form>
          )}

          {/* ── 圖設定 ── */}
          {tab === "image" && (
            <div>
              <Card Icon={Ic.Image} title="主要圖片">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 15 }}>
                  <Lbl text="頭像 URL">
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <div onClick={() => avatarRef.current?.click()} title="點擊上傳頭像"
                        style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: color, display: "grid", placeItems: "center", cursor: "pointer" }}>
                        {(watchedAvatarUrl || character.avatarUrl)
                          ? <img src={watchedAvatarUrl || character.avatarUrl!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ color: "#fff", fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 18 }}>{watchedName.slice(0, 1) || character.name?.slice(0, 1) || "？"}</span>
                        }
                      </div>
                      <InpOC placeholder="https://…" style={{ flex: 1 }} {...register("avatarUrl")} />
                      <button type="button" style={{ ...S.addBtn, flexShrink: 0 }} onClick={() => avatarRef.current?.click()}>
                        <Ic.Upload /> {avatarUploading ? "…" : "上傳"}
                      </button>
                    </div>
                  </Lbl>
                  <Lbl text="主視覺 URL">
                    <div style={{ display: "flex", gap: 7 }}>
                      <InpOC placeholder="https://…" style={{ flex: 1 }} {...register("mainVisualUrl")} />
                      <input ref={mainVisualRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }} onChange={e => handleMainVisualFile(e.target.files)} />
                      <button type="button" style={{ ...S.addBtn, flexShrink: 0 }} onClick={() => mainVisualRef.current?.click()}>
                        <Ic.Upload /> {mainVisualUploading ? "…" : "上傳"}
                      </button>
                      <button type="button" style={{ ...S.addBtn, flexShrink: 0 }} onClick={() => setMainVisualPicker(true)}>
                        從圖庫
                      </button>
                    </div>
                  </Lbl>
                </div>
              </Card>

              <Card Icon={Ic.Palette} title="色票"
                trailing={
                  <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ position: "relative" }}>
                      <button type="button" style={S.ghostBtn}
                        onClick={(e) => { const m = (e.currentTarget.nextElementSibling as HTMLElement); m.style.display = m.style.display === "none" ? "block" : "none" }}>
                        預設
                      </button>
                      <div style={{ display: "none", position: "absolute", top: "100%", right: 0, zIndex: 50, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.14)", padding: 6, minWidth: 130, marginTop: 4 }}>
                        {PRESETS.map(p => (
                          <button key={p.name} type="button"
                            onClick={(e) => { e.stopPropagation(); setPalette(p.colors.map(c => ({ id: uid(), label: c.label, hex: c.hex }))); markDirty(); ((e.currentTarget.parentElement as HTMLElement).style.display = "none") }}
                            style={{ display: "block", width: "100%", textAlign: "left", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--text)", background: "transparent", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}>
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button type="button" title="從圖片吸色" style={S.ghostBtn} onClick={() => setShowEyedropper(true)}>
                      <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3L3 13"/><path d="M10 1l5 5-3 3-5-5 3-3z"/><circle cx="2.5" cy="13.5" r="1.5"/></svg> 吸色
                    </button>
                    <button type="button" style={S.addBtn} onClick={addSwatch}><Ic.Plus /> 顏色</button>
                  </div>
                }
              >
                {palette.length === 0 && (
                  <div style={{ border: "1.5px dashed var(--border)", borderRadius: 12, padding: "var(--s5)", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>還沒有色票</div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {palette.map(sw => (
                    <div key={sw.id} style={{ display: "flex", gap: 9, alignItems: "center", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 13, padding: "9px 11px" }}>
                      <input type="color" value={sw.hex} onChange={e => updateSwatch(sw.id, "hex", e.target.value)}
                        style={{ width: 38, height: 38, border: "none", background: "none", padding: 0, cursor: "pointer", flexShrink: 0, borderRadius: 9 }} />
                      <InpOC sm value={sw.label} placeholder="名稱（髮色…）" style={{ flex: 1 }} onChange={e => updateSwatch(sw.id, "label", e.target.value)} />
                      <InpOC sm value={sw.hex} placeholder="#000000" style={{ width: 104, fontFamily: "var(--font-mono)", fontSize: 13 }} onChange={e => updateSwatch(sw.id, "hex", e.target.value)} />
                      <button type="button" style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", color: "var(--text-dim)", fontSize: 15, display: "grid", placeItems: "center" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#c0584f"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#e0b3ad" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)" }}
                        onClick={() => removeSwatch(sw.id)}>×</button>
                    </div>
                  ))}
                </div>
              </Card>

              {sections.filter(s => s.group === "image").map(renderSection)}
              <DashedAdd label="新增繪圖規範（文字說明）" onClick={() => addSection("image")} />
            </div>
          )}

          {/* ── 文設定 ── */}
          {tab === "text" && (
            <div>
              {sections.filter(s => s.group === "text").length === 0 && (
                <div style={{ border: "1.5px dashed var(--border)", borderRadius: 14, padding: "var(--s8)", textAlign: "center", color: "var(--text-faint)", fontSize: 14, marginBottom: "var(--s4)" }}>
                  還沒有文設定區塊
                </div>
              )}
              {sections.filter(s => s.group === "text").map(renderSection)}
              <DashedAdd label="新增文設定區塊" onClick={() => addSection("text")} />
            </div>
          )}

          {/* ── 圖庫 ── */}
          {tab === "gallery" && (
            <div>
              <Card Icon={Ic.Folder} title="設定相簿"
                badge={<span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.04em", color: "#fff", background: "var(--accent)", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>官方設定</span>}
                trailing={<button type="button" style={S.addBtn} onClick={() => addAlbum("ref")}><Ic.Plus /> 設定相簿</button>}
              >
                <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 16px", lineHeight: 1.6 }}>角色的標準設定：每套服裝、立繪各開一本。點縮圖旁的「從圖庫選」匯入圖片。</p>
                {albums.filter(a => a.kind === "ref").length === 0 && (
                  <div style={{ border: "1.5px dashed var(--border)", borderRadius: 12, padding: "var(--s5)", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>還沒有設定相簿</div>
                )}
                {albums.filter(a => a.kind === "ref").map(renderAlbum)}
              </Card>

              <Card Icon={Ic.Photos} title="圖庫・作品"
                badge={<span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.04em", color: "var(--accent)", border: "1.5px solid var(--accent)", borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap" }}>作品</span>}
                trailing={<button type="button" style={S.addBtn} onClick={() => addAlbum("gallery")}><Ic.Plus /> 相簿</button>}
              >
                <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 16px", lineHeight: 1.6 }}>插圖、漫畫、塗鴉等成品。可選填關聯到某套設定，方便對照。</p>
                {albums.filter(a => a.kind === "gallery").length === 0 && (
                  <div style={{ border: "1.5px dashed var(--border)", borderRadius: 12, padding: "var(--s5)", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>還沒有作品相簿</div>
                )}
                {albums.filter(a => a.kind === "gallery").map(renderAlbum)}
              </Card>

              {/* Color palette for ref-albums matching */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "var(--s4)" }}>
                {TAGPAL.map(c => (
                  <div key={c} style={{ width: 24, height: 24, borderRadius: 6, background: c, border: "1.5px solid rgba(0,0,0,.08)" }} title={c} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: live preview */}
        <div style={{ position: "sticky", top: 72, width: 430, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--s3)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)", flex: 1 }}>即時預覽 LIVE PREVIEW</span>
            <div style={{ display: "flex", gap: 3, background: "var(--surface-2)", padding: 3, borderRadius: 9 }}>
              {([["general","一般"],["commission","委託"]] as [PreviewTab,string][]).map(([t,l]) => (
                <button key={t} type="button" onClick={() => setPreviewTab(t)}
                  style={{ fontFamily: "inherit", fontSize: 12, fontWeight: previewTab === t ? 700 : 500, padding: "4px 11px", borderRadius: 7, border: "none", cursor: "pointer", background: previewTab === t ? "var(--surface)" : "transparent", color: previewTab === t ? "var(--text)" : "var(--text-dim)", boxShadow: previewTab === t ? "0 1px 4px rgba(0,0,0,.09)" : "none", transition: "all .14s" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ background: "var(--surface-2)", borderRadius: 22, padding: "var(--s4)", border: "1px solid var(--border)" }}>
            <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", maxHeight: "calc(100vh - 200px)", overflowY: "auto", boxShadow: "0 4px 18px rgba(60,50,40,.12)" }}>
              {previewTab === "general" ? (
                <TemplateCanvas character={liveCanvasChar} template={liveTemplate as any} design={liveDesign as any} />
              ) : (
                <CommissionPreview palette={palette} sections={sections} mainVisualUrl={watchedMain} />
              )}
            </div>
          </div>

          {/* Link to full template builder */}
          <div style={{ marginTop: "var(--s4)", textAlign: "center" }}>
            <Link to={`/p/${projectId}/template`}
              style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
              → 前往模板編輯器
            </Link>
          </div>
        </div>
      </div>

      {pickerFor && (
        <AssetPickerModal
          onSelect={url => { updateImage(pickerFor.alId, pickerFor.imId, "url", url); setPickerFor(null) }}
          onClose={() => setPickerFor(null)}
        />
      )}
      {mainVisualPicker && (
        <AssetPickerModal
          onSelect={url => { setValue("mainVisualUrl", url, { shouldDirty: true }); setMainVisualPicker(false) }}
          onClose={() => setMainVisualPicker(false)}
        />
      )}

      {showAvatarCropper && (
        <AvatarCropperModal
          onClose={() => setShowAvatarCropper(false)}
          onComplete={uploadCroppedAvatar}
        />
      )}

      {showEyedropper && (
        <EyedropperModal
          avatarUrl={watch("avatarUrl") ?? ""}
          mainVisualUrl={watch("mainVisualUrl") ?? ""}
          albums={albums}
          onAddSwatch={addSwatchHex}
          onClose={() => setShowEyedropper(false)}
        />
      )}

      {annotatingImage && (() => {
        const al = albums.find(a => a.id === annotatingImage.alId)
        const im = al?.images.find(i => i.id === annotatingImage.imId)
        if (!im) return null
        return (
          <AnnotationModal
            imageUrl={im.url}
            initialAnnotations={im.annotations ?? []}
            onUpdate={(anns) => updateImageAnnotations(annotatingImage.alId, annotatingImage.imId, anns)}
            onClose={() => setAnnotatingImage(null)}
          />
        )
      })()}

      {showBackupModal && (
        <CharBackupModal
          charName={watch("name") ?? ""}
          sections={sections}
          onExport={doExport}
          onImport={() => importRef.current?.click()}
          onApplySections={(s) => { setSections(s); markDirty() }}
          onClose={() => setShowBackupModal(false)}
        />
      )}
    </div>
  )
}
