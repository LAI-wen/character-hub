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
import type { CanvasCharacter, CanvasSection, CanvasSwatch, CanvasAlbum, CanvasTemplate, CanvasBlock, CanvasDesign } from "@/components/TemplateCanvas"
import { AssetPickerModal } from "@/components/AssetPickerModal"
import type { CharacterResponse } from "@oc-tools/contracts"
import { AvatarCropperModal } from "@/components/AvatarCropperModal"
import { EyedropperModal } from "@/components/EyedropperModal"
import { AnnotationModal } from "@/components/AnnotationModal"
import type { Annotation as GpAnnotation } from "@/components/AnnotationModal"
import { CharBackupModal } from "@/components/CharBackupModal"
import { PRESETS } from "@/data/palettePresets"

// ─── Types ────────────────────────────────────────────────────────────────────

type GpField       = { id: string; label: string; type: string; value: string }
type GpSection     = { id: string; title: string; group: "text" | "image"; fields: GpField[] }
type GpSwatch      = { id: string; label: string; hex: string }
type GpImage       = { id: string; url: string; caption: string; annotations?: GpAnnotation[] }
type GpAlbum       = { id: string; name: string; kind: "ref" | "gallery"; images: GpImage[]; linkRef?: string }
type NamedTemplate = { id: string; name: string; design: CanvasDesign; blocks: CanvasBlock[] }

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const Ic = {
  Check:  () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,9 6,13 14,3"/></svg>,
  Doc:    () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="1" width="10" height="14" rx="2"/><line x1="6" y1="5" x2="10" y2="5"/><line x1="6" y1="8" x2="10" y2="8"/><line x1="6" y1="11" x2="9" y2="11"/></svg>,
  Reset:  () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 2.5A6 6 0 1 0 14 8"/><polyline points="14,2 14,6.5 9.5,6"/></svg>,
  Trash:  () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,4 15,4"/><path d="M13,4v10a1,1 0 0 1-1,1H4a1,1 0 0 1-1-1V4"/><path d="M5,4V3a1,1 0 0 1 1-1h4a1,1 0 0 1 1,1v1"/></svg>,
  Upload: () => <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4,7 8,3 12,7"/><line x1="8" y1="3" x2="8" y2="12"/><line x1="2" y1="14" x2="14" y2="14"/></svg>,
  Plus:   () => <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>,
  Person: () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="5" r="3"/><path d="M2,14a6,6 0 0 1 12,0"/></svg>,
  Image:  () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="14" height="10" rx="2"/><circle cx="5.5" cy="7" r="1" fill="currentColor" stroke="none"/><polyline points="1,13 5,9 8,12 11,9 15,13"/></svg>,
  Palette:() => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><circle cx="5" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="11" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="11" r="1" fill="currentColor" stroke="none"/></svg>,
  Folder: () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2,12V5a1,1 0 0 1 1-1h3l1.5,2H13a1,1 0 0 1 1,1v5a1,1 0 0 1-1,1H3a1,1 0 0 1-1-1z"/></svg>,
  Photos: () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="11" height="10" rx="2"/><path d="M5,4V3a1,1 0 0 1 1-1h7a1,1 0 0 1 1,1v8"/><circle cx="6" cy="9" r="1.5"/><polyline points="2,14 5,10 8,13 10,11 13,14"/></svg>,
  Gear:   () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M11.54 4.46l-1.41 1.41M4.46 11.54l-1.41 1.41"/></svg>,
  ChevUp: () => <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,10 8,5 13,10"/></svg>,
  ChevDn: () => <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 8,11 13,6"/></svg>,
  ArrowUp:() => <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="13" x2="8" y2="3"/><polyline points="3,8 8,3 13,8"/></svg>,
  ArrowDn:() => <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="3" x2="8" y2="13"/><polyline points="3,8 8,13 13,8"/></svg>,
  Dup:    () => <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M2,10V3a1,1 0 0 1 1-1h7"/></svg>,
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

const floatBtn: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 600,
  color: "rgba(255,255,255,0.85)",
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 8,
  padding: "5px 10px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  whiteSpace: "nowrap" as const,
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

const BLOCK_TYPE_LABELS: Record<string, string> = {
  heading: "標題", tagline: "一句話", avatar: "頭像", cover: "主視覺",
  section: "資料區塊", palette: "色票", album: "相簿", badges: "標籤列",
  text: "自訂文字", marquee: "跑馬燈", divider: "分隔線", spacer: "空白",
  columns: "欄位排版", button: "按鈕", popup: "彈出視窗", pagebreak: "分頁符",
  nav: "頁面導覽",
}
const INFO_TYPES = new Set(["heading","tagline","avatar","cover","section","palette","album","badges","popup"])
const TAGPAL = ["#c98a5e","#6c8db0","#7fa86b","#b1577e","#d9a441","#8d7c69","#a06cb0","#4a3f35"]
const FONT_OPTS: [string,string][] = [
  ["noto-serif","思源宋體"],["noto-sans","思源黑體"],["wenkai","霞鶩文楷"],
  ["goround","Chiron GoRound"],["newsreader","Newsreader（英）"],["outfit","Outfit（英）"],
]
const DEF_LIBRARY = ["#ffffff","#f0e8da","#c98a5e","#8d7c69","#4a3f35"]
const FX_OPTS: [string,string][] = [["","無"],["soft","陰影"],["float","浮起"],["glow","光暈"],["glass","玻璃"]]

const DEMO = {
  name: "莉央", nickname: "小央", tagline: "我把每一個願望，都記在星圖上。",
  sections: [
    { id: "d1", title: "基本資料", group: "text" as const, fields: [
      { id: "d1f1", label: "種族 / 身分", type: "text",     value: "半精靈・星辰守望者" },
      { id: "d1f2", label: "年齡",        type: "text",     value: "看起來 19，實際 124" },
      { id: "d1f3", label: "身高",        type: "text",     value: "162 cm" },
    ]},
    { id: "d2", title: "個性與故事", group: "text" as const, fields: [
      { id: "d2f1", label: "性格",     type: "longtext", value: "表面慵懶愛眠，骨子裡固執又認真。對世界永遠保有好奇，遇到喜歡的事會一頭栽進去到忘記時間，唯獨不擅長說再見。" },
      { id: "d2f2", label: "背景故事", type: "longtext", value: "在星圖館長大，從小抄錄星相記錄。十六歲那年目擊流星雨消失事件，立志查明真相，至今仍未解謎。" },
    ]},
  ],
  palette: [
    { id: "p1", label: "髮色", hex: "#aebfdc" },
    { id: "p2", label: "瞳色", hex: "#e0a93b" },
    { id: "p3", label: "膚色", hex: "#f3e2d2" },
    { id: "p4", label: "主服裝", hex: "#39456b" },
  ],
}

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
})
type Fields = z.infer<typeof Schema>

type Tab        = "basic" | "image" | "text" | "gallery"
type TopTab     = "edit" | "template"
type Device     = "desktop" | "tablet" | "mobile"
type TplMode    = "edit" | "preview"
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

// ─── Styled inputs with OCTOOL focus behavior ─────────────────────────────────

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

// ─── Block label helper ───────────────────────────────────────────────────────

function blkLabel(b: CanvasBlock, secs: GpSection[], albs: GpAlbum[]): string {
  const type = BLOCK_TYPE_LABELS[b.type] ?? b.type
  if (b.type === "section") {
    const s = secs.find(s => s.id === b.sourceId)
    return `${type}：${s?.title || "(未命名)"}`
  }
  if (b.type === "album") {
    const a = albs.find(a => a.id === b.sourceId)
    return `${type}：${a?.name || "(未命名)"}`
  }
  if (b.text) return `${type}：${b.text.slice(0, 12)}…`
  return type
}

// ─── Add-block button ─────────────────────────────────────────────────────────

function AddBlockButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "var(--text)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 9, padding: "7px 12px 7px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, transition: "border-color .14s, color .14s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text)" }}
      onClick={onClick}><Ic.Plus />{label}</button>
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

// ─── Accordion section ────────────────────────────────────────────────────────

function AccordionSection({ title, openKey, open, toggle, children }: {
  title: string; openKey: string; open: Set<string>; toggle: (k: string) => void; children: React.ReactNode
}) {
  const isOpen = open.has(openKey)
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button type="button" onClick={() => toggle(openKey)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)", flex: 1 }}>{title}</span>
        {isOpen ? <Ic.ChevUp /> : <Ic.ChevDn />}
      </button>
      {isOpen && <div style={{ padding: "2px 14px 14px" }}>{children}</div>}
    </div>
  )
}

// ─── Commission mini-preview ──────────────────────────────────────────────────

function CommissionPreview({ palette, sections, mainVisualUrl, color: _color }: {
  palette: GpSwatch[]
  sections: GpSection[]
  mainVisualUrl: string
  color: string
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
  const { charId } = useParams<{ charId: string }>()
  const navigate   = useNavigate()
  const qc         = useQueryClient()
  const avatarRef       = useRef<HTMLInputElement>(null)
  const mainVisualRef   = useRef<HTMLInputElement>(null)
  const fullscreenRef   = useRef<HTMLDivElement>(null)
  const importRef       = useRef<HTMLInputElement>(null)
  const [avatarUploading,     setAvatarUploading]     = useState(false)
  const [mainVisualUploading, setMainVisualUploading] = useState(false)
  const [mainVisualPicker,    setMainVisualPicker]    = useState(false)
  const [tab,     setTab]    = useState<Tab>("basic")
  const [topTab,  setTopTab] = useState<TopTab>("edit")
  const [device,  setDevice] = useState<Device>("desktop")
  const [tplMode,       setTplMode]       = useState<TplMode>("edit")
  const [previewTab,    setPreviewTab]    = useState<PreviewTab>("general")
  const [tplRightPanel, setTplRightPanel] = useState<"design" | "blocks">("blocks")
  const [designOpen,    setDesignOpen]    = useState<Set<string>>(new Set(["bg", "font", "width"]))
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [pageView,      setPageView]      = useState<number | null>(null)
  const [showPresetModal,   setShowPresetModal]   = useState(false)
  const [showEyedropper,    setShowEyedropper]    = useState(false)
  const [showBackupModal,   setShowBackupModal]   = useState(false)
  const [showAvatarCropper, setShowAvatarCropper] = useState(false)
  const [annotatingImage,   setAnnotatingImage]   = useState<{ alId: string; imId: string } | null>(null)

  const [palette,     setPalette]     = useState<GpSwatch[]>([])
  const [sections,    setSections]    = useState<GpSection[]>([])
  const [albums,      setAlbums]      = useState<GpAlbum[]>([])
  const [templates,   setTemplates]   = useState<NamedTemplate[]>([])
  const [activeTplId, setActiveTplId] = useState<string>("")
  const [publicTplId, setPublicTplId] = useState<string>("")
  const [gpDirty,     setGpDirty]     = useState(false)
  const [pickerFor, setPickerFor] = useState<{ alId: string; imId: string } | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [albumImgUploading, setAlbumImgUploading] = useState<string | null>(null)
  const albumImgRef = useRef<HTMLInputElement>(null)
  const [pendingAlbumUpload, setPendingAlbumUpload] = useState<{ alId: string; imId: string } | null>(null)

  const markDirty = useCallback(() => setGpDirty(true), [])

  const { data } = useQuery({
    queryKey: ["character", charId],
    queryFn: () => apiClient<CharacterResponse>(`/api/app/characters/${charId}`),
    enabled: !!charId,
  })
  const character = data?.character

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
    })
    setPalette((gp.palette as GpSwatch[] | undefined) ?? [])
    setSections((gp.sections as GpSection[] | undefined) ?? [])
    setAlbums((gp.albums as GpAlbum[] | undefined) ?? [])
    const rawTemplates = gp.templates as NamedTemplate[] | undefined
    const rawOldTemplate = gp.template as CanvasTemplate | null | undefined
    if (rawTemplates && rawTemplates.length > 0) {
      setTemplates(rawTemplates)
      setActiveTplId(rawTemplates[0].id)
      setPublicTplId((gp.publicTplId as string | undefined) ?? rawTemplates[0].id)
    } else if (rawOldTemplate) {
      const migrated: NamedTemplate = { id: uid(), name: "我的模板", design: { primary: character.themeColor ?? "#c98a5e", bg: "#ffffff" }, blocks: rawOldTemplate.blocks }
      setTemplates([migrated])
      setActiveTplId(migrated.id)
    } else {
      setTemplates([])
      setActiveTplId("")
    }
    setGpDirty(false)
  }, [character, reset])

  const mutation = useMutation({
    mutationFn: (body: object) =>
      apiClient<CharacterResponse>(`/api/app/characters/${charId}`, { method: "PATCH", body }),
    onSuccess: (res) => {
      qc.setQueryData(["character", charId], res)
      setGpDirty(false)
      navigate(`/characters/${charId}`)
    },
  })

  const isDirty = formDirty || gpDirty
  const watchedName    = watch("name") ?? ""
  const watchedTagline = watch("tagline") ?? ""
  const watchedMain    = watch("mainVisualUrl") ?? ""
  const themeWatch     = watch("themeColor")
  const color = themeWatch || (character ? (character.themeColor ?? charColor(character.id)) : "#8A857C")

  const watchedAvatarUrl = watch("avatarUrl") ?? ""
  const liveCanvasChar: CanvasCharacter = {
    name:          watchedName || character?.name || "…",
    tagline:       watchedTagline || undefined,
    avatarUrl:     watchedAvatarUrl || character?.avatarUrl || undefined,
    mainVisualUrl: watchedMain || undefined,
    sections:      sections as CanvasSection[],
    palette:       palette as CanvasSwatch[],
    albums:        albums.filter(a => a.kind === "gallery") as CanvasAlbum[],
  }
  const activeTpl = templates.find(t => t.id === activeTplId) ?? templates[0] ?? null
  const liveTemplate: CanvasTemplate = activeTpl ? { blocks: activeTpl.blocks } : buildDefaultTemplate(liveCanvasChar)
  const liveDesign: CanvasDesign = activeTpl ? { ...activeTpl.design, primary: activeTpl.design.primary || color } : { primary: color, bg: "#ffffff" }

  // ── Save ──────────────────────────────────────────────────────────────────

  function doSave(data: Fields) {
    const gp = (character?.generalProfile ?? {}) as Record<string, unknown>
    mutation.mutate({
      name: data.name, romaji: data.romaji || undefined, nickname: data.nickname || undefined,
      species: data.species || undefined, summary: data.summary || undefined,
      tags: data.tagsRaw ? data.tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [],
      themeColor: data.themeColor || null, visibility: data.visibility,
      generalProfile: {
        ...gp, tagline: data.tagline || undefined,
        avatarUrl: data.avatarUrl || undefined,
        mainVisualUrl: data.mainVisualUrl || undefined,
        palette, sections, albums,
        templates,
        publicTplId: publicTplId || (templates[0]?.id ?? ""),
        template: null,
      },
    })
  }

  function loadDemo() {
    if (!confirm("這會覆蓋目前的名稱、暱稱、一句話、文設定、色票，確定嗎？")) return
    setValue("name", DEMO.name, { shouldDirty: true })
    setValue("nickname", DEMO.nickname, { shouldDirty: true })
    setValue("tagline", DEMO.tagline, { shouldDirty: true })
    setSections(DEMO.sections.map(s => ({ ...s, fields: s.fields.map(f => ({ ...f })) })))
    setPalette(DEMO.palette.map(p => ({ ...p })))
    setTemplates([]); setActiveTplId("")
    markDirty()
  }

  function clearAll() {
    if (!confirm("確定要清空全部欄位嗎？")) return
    setValue("name", "", { shouldDirty: true })
    setValue("nickname", "", { shouldDirty: true })
    setValue("tagline", "", { shouldDirty: true })
    setValue("summary", "", { shouldDirty: true })
    setValue("mainVisualUrl", "", { shouldDirty: true })
    setValue("tagsRaw", "", { shouldDirty: true })
    setSections([]); setPalette([]); setAlbums([]); setTemplates([]); setActiveTplId("")
    markDirty()
  }

  function doExport() {
    const data = {
      exportedAt: new Date().toISOString(),
      character: {
        name: watch("name"), nickname: watch("nickname"), tagline: watch("tagline"),
        summary: watch("summary"), tagsRaw: watch("tagsRaw"),
        themeColor: watch("themeColor"), visibility: watch("visibility"),
        mainVisualUrl: watch("mainVisualUrl"),
      },
      generalProfile: { palette, sections, albums, templates },
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${watch("name") || "character"}-backup.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleAlbumImageFile(files: FileList | null) {
    if (!files?.[0] || !charId || !pendingAlbumUpload) return
    const { alId, imId } = pendingAlbumUpload
    setAlbumImgUploading(imId)
    try {
      const form = new FormData()
      form.append("file", files[0])
      const res = await apiClient<{ url: string }>(`/api/app/characters/${charId}/upload`, { method: "POST", body: form })
      updateImage(alId, imId, "url", res.url)
    } finally {
      setAlbumImgUploading(null)
      setPendingAlbumUpload(null)
      if (albumImgRef.current) albumImgRef.current.value = ""
    }
  }

  async function handleAvatarFile(files: FileList | null) {
    if (!files?.[0] || !charId) return
    setAvatarUploading(true)
    try {
      const compressed = await compressImage(files[0])
      const form = new FormData()
      form.append("file", compressed)
      const res = await apiClient<{ character: unknown; avatarUrl: string }>(`/api/app/characters/${charId}/avatar`, { method: "POST", body: form })
      setValue("avatarUrl", res.avatarUrl, { shouldDirty: true })
      markDirty()
      qc.invalidateQueries({ queryKey: ["character", charId] })
      qc.invalidateQueries({ queryKey: ["characters"] })
    } finally {
      setAvatarUploading(false)
      if (avatarRef.current) avatarRef.current.value = ""
    }
  }

  async function handleMainVisualFile(files: FileList | null) {
    if (!files?.[0] || !charId) return
    setMainVisualUploading(true)
    try {
      const compressed = await compressImage(files[0])
      const form = new FormData()
      form.append("file", compressed)
      const res = await apiClient<{ url: string }>(`/api/app/characters/${charId}/main-visual`, { method: "POST", body: form })
      setValue("mainVisualUrl", res.url, { shouldDirty: true })
      markDirty()
    } finally {
      setMainVisualUploading(false)
      if (mainVisualRef.current) mainVisualRef.current.value = ""
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target?.result as string)
        if (d.character) {
          if (d.character.name)         setValue("name",          d.character.name,         { shouldDirty: true })
          if (d.character.nickname != null) setValue("nickname",  d.character.nickname ?? "",  { shouldDirty: true })
          if (d.character.tagline != null)  setValue("tagline",   d.character.tagline ?? "",   { shouldDirty: true })
          if (d.character.summary != null)  setValue("summary",   d.character.summary ?? "",   { shouldDirty: true })
          if (d.character.avatarUrl != null)     setValue("avatarUrl",     d.character.avatarUrl ?? "",     { shouldDirty: true })
          if (d.character.mainVisualUrl != null) setValue("mainVisualUrl", d.character.mainVisualUrl ?? "", { shouldDirty: true })
          if (d.character.tagsRaw != null)  setValue("tagsRaw",   d.character.tagsRaw ?? "",   { shouldDirty: true })
          if (d.character.themeColor != null) setValue("themeColor", d.character.themeColor ?? "", { shouldDirty: true })
        }
        if (d.generalProfile) {
          if (Array.isArray(d.generalProfile.palette))  { setPalette(d.generalProfile.palette); markDirty() }
          if (Array.isArray(d.generalProfile.sections)) { setSections(d.generalProfile.sections); markDirty() }
          if (Array.isArray(d.generalProfile.albums))   { setAlbums(d.generalProfile.albums); markDirty() }
          if (Array.isArray(d.generalProfile.templates)) {
            setTemplates(d.generalProfile.templates); setActiveTplId(d.generalProfile.templates[0]?.id ?? ""); markDirty()
          } else if ("template" in d.generalProfile && d.generalProfile.template) {
            const migrated: NamedTemplate = { id: uid(), name: "我的模板", design: { bg: "#ffffff", primary: "#c98a5e" }, blocks: d.generalProfile.template.blocks ?? [] }
            setTemplates([migrated]); setActiveTplId(migrated.id); markDirty()
          }
        }
      } catch {
        alert("匯入失敗：JSON 格式不正確")
      }
      if (importRef.current) importRef.current.value = ""
    }
    reader.readAsText(file)
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
    if (!charId) return
    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await apiClient<{ character: unknown; avatarUrl: string }>(`/api/app/characters/${charId}/avatar`, { method: "POST", body: form })
      setValue("avatarUrl", res.avatarUrl, { shouldDirty: true })
      markDirty()
      qc.invalidateQueries({ queryKey: ["character", charId] })
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

  // ── Template ──────────────────────────────────────────────────────────────

  function patchActiveTplBlocks(updater: (blocks: CanvasBlock[]) => CanvasBlock[]) {
    if (templates.length === 0) {
      const newTpl: NamedTemplate = { id: uid(), name: "我的模板", design: { primary: color, bg: "#ffffff" }, blocks: updater([]) }
      setTemplates([newTpl]); setActiveTplId(newTpl.id)
    } else {
      const id = activeTplId || templates[0].id
      if (!activeTplId) setActiveTplId(id)
      setTemplates(ts => ts.map(t => t.id === id ? { ...t, blocks: updater(t.blocks) } : t))
    }
    markDirty()
  }

  function tplAdd(type: string) {
    const b: CanvasBlock = { id: uid(), type } as CanvasBlock
    if (type === "section" && sections.length > 0) (b as any).sourceId = sections[0].id
    if (type === "album"   && albums.length > 0)   (b as any).sourceId = albums[0].id
    if (type === "spacer") (b as any).size = "md"
    if (type === "badges") (b as any).tags = []
    if (type === "text")   (b as any).text = ""
    if (type === "marquee") { (b as any).text = "★"; (b as any).speed = 18 }
    if (type === "button") (b as any).text = "按鈕"
    if (type === "popup")  { (b as any).trigger = "button"; (b as any).text = "看更多"; (b as any).title = ""; (b as any).body = "" }
    if (type === "columns") { (b as any).children = [[],[]]; (b as any).widths = [50, 50] }
    patchActiveTplBlocks(blocks => [...blocks, b])
    setSelectedBlockId(b.id)
    setTplRightPanel("design")
  }

  function tplRemove(id: string) { patchActiveTplBlocks(blocks => blocks.filter(b => b.id !== id)) }

  function tplMove(id: string, dir: -1|1) {
    patchActiveTplBlocks(blocks => {
      const idx = blocks.findIndex(b => b.id === id)
      if (idx < 0) return blocks
      const n = idx + dir
      if (n < 0 || n >= blocks.length) return blocks
      const arr = [...blocks];
      [arr[idx], arr[n]] = [arr[n], arr[idx]]
      return arr
    })
  }

  function tplDup(id: string) {
    patchActiveTplBlocks(blocks => {
      const idx = blocks.findIndex(b => b.id === id)
      if (idx < 0) return blocks
      const arr = [...blocks]
      arr.splice(idx + 1, 0, { ...blocks[idx], id: uid() })
      return arr
    })
  }

  function tplPatch(id: string, patch: Partial<CanvasBlock>) {
    patchActiveTplBlocks(blocks => blocks.map(b => b.id === id ? { ...b, ...patch } : b))
  }

  function tplReorder(fromId: string, toId: string, pos: "before" | "after") {
    patchActiveTplBlocks(blocks => {
      const from = blocks.findIndex(b => b.id === fromId)
      const to   = blocks.findIndex(b => b.id === toId)
      if (from < 0 || to < 0 || from === to) return blocks
      const arr = [...blocks]
      const [moved] = arr.splice(from, 1)
      const insertAt = arr.findIndex(b => b.id === toId)
      arr.splice(pos === "before" ? insertAt : insertAt + 1, 0, moved)
      return arr
    })
  }

  function tplStylePatch(id: string, patch: Partial<CanvasBlock["style"] & Record<string, unknown>>) {
    patchActiveTplBlocks(blocks => blocks.map(b => b.id === id ? { ...b, style: { ...(b.style ?? {}), ...patch } } : b))
  }

  function tplAddPagebreak() {
    patchActiveTplBlocks(blocks => [...blocks, { id: uid(), type: "pagebreak" }])
    markDirty()
  }

  function tplReset() {
    if (!confirm("重設為預設積木？（清除此模板的積木，改用自動生成的預設）")) return
    patchActiveTplBlocks(() => buildDefaultTemplate(liveCanvasChar).blocks)
  }

  function designPatch(patch: Partial<CanvasDesign>) {
    if (templates.length === 0) return
    const id = activeTplId || templates[0].id
    setTemplates(ts => ts.map(t => t.id === id ? { ...t, design: { ...t.design, ...patch } } : t))
    markDirty()
  }

  function toggleDesignOpen(k: string) {
    setDesignOpen(prev => { const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next })
  }

  function dupTemplate() {
    const tpl = templates.find(t => t.id === activeTplId) ?? templates[0]
    if (!tpl) return
    const copy: NamedTemplate = { ...tpl, id: uid(), name: tpl.name + "（副本）", blocks: tpl.blocks.map(b => ({ ...b, id: uid() })) }
    setTemplates(ts => [...ts, copy]); setActiveTplId(copy.id); markDirty()
  }

  function deleteTemplate() {
    if (templates.length === 0) return
    const ok = templates.length <= 1 ? confirm("這是最後一個模板，確定要刪除嗎？") : confirm("確定刪除此模板？")
    if (!ok) return
    const idx = templates.findIndex(t => t.id === activeTplId)
    const next = templates.filter(t => t.id !== activeTplId)
    setTemplates(next); setActiveTplId(next[Math.max(0, idx - 1)]?.id ?? ""); markDirty()
  }

  function makePresetTemplate(kind: string): NamedTemplate {
    const galAlb = albums.find(a => a.kind === "gallery")?.id ?? albums[0]?.id
    const sec0 = sections[0]?.id
    const presets: Record<string, { name: string; design: CanvasDesign; types: string[] }> = {
      card:    { name: "名片",    design: { bg: "#ffffff", primary: "#c98a5e", font: "noto-sans",  width: "normal", align: "center" }, types: ["cover","avatar","heading","tagline","divider","palette"] },
      sheet:   { name: "設定集",  design: { bg: "#faf6ef", primary: "#6c8db0", font: "wenkai",    width: "wide"   }, types: ["heading","tagline","divider","section","palette"] },
      gallery: { name: "圖集",    design: { bg: "#1f1a17", primary: "#dca06d", font: "noto-serif", width: "wide"  }, types: ["cover","heading","album","palette"] },
      oc:      { name: "OC 展示", design: { bg: "#fdfaf5", primary: "#c98a5e", font: "noto-serif", width: "normal" }, types: ["cover","avatar","heading","tagline","palette","divider","section","album"] },
      project: { name: "企劃介紹", design: { bg: "#0f0f14", primary: "#9b7de0", font: "noto-sans", width: "wide" },  types: ["cover","heading","tagline","divider","section","badges"] },
      au:      { name: "AU 版本", design: { bg: "#f5f0e8", primary: "#b07d52", font: "wenkai",    width: "normal" }, types: ["heading","tagline","section","palette"] },
      all:     { name: "完整模板", design: { bg: "#ffffff", primary: "#c98a5e", font: "noto-serif", width: "normal" }, types: ["cover","avatar","heading","tagline","palette","divider","section","album","badges","divider","text"] },
      blank:   { name: "空白",    design: { bg: "#ffffff", primary: "#c98a5e", font: "noto-serif", width: "normal" }, types: [] },
    }
    const p = presets[kind] ?? presets.blank
    const blocks: CanvasBlock[] = p.types.map(type => {
      const b: any = { id: uid(), type }
      if (type === "section" && sec0) b.sourceId = sec0
      if (type === "album"   && galAlb) b.sourceId = galAlb
      if (type === "spacer") b.size = "md"
      return b
    })
    return { id: uid(), name: p.name, design: p.design, blocks }
  }

  // ─── Section editor ───────────────────────────────────────────────────────

  function renderSection(sec: GpSection) {
    return (
      <section key={sec.id} style={{ ...S.card, borderLeft: "4px solid var(--accent)", borderRadius: 18, padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={S.sectionBar} />
          <SectionTitle value={sec.title} onChange={v => updateSecProp(sec.id, "title", v)} />
          <GroupToggle value={sec.group} onChange={v => updateSecProp(sec.id, "group", v as any)} />
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
              <button type="button" title="一次選多張批次上傳（即將推出）"
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
                    <button type="button" style={{ ...S.addBtn, fontSize: 12, borderRadius: 8, padding: "7px 10px", justifyContent: "center" }}
                      onClick={() => { setPendingAlbumUpload({ alId: al.id, imId: im.id }); albumImgRef.current?.click() }}>
                      <Ic.Upload /> {albumImgUploading === im.id ? "…" : "上傳"}
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

  // ─── Block property panel ────────────────────────────────────────────────

  function renderBlockPanel(b: CanvasBlock) {
    const st = b.style ?? {}
    const patch = (p: Partial<CanvasBlock>) => tplPatch(b.id, p)
    const spatch = (p: Partial<CanvasBlock["style"] & Record<string,unknown>>) => tplStylePatch(b.id, p as any)
    const isInfo = INFO_TYPES.has(b.type)

    const row = (label: string, children: React.ReactNode) => (
      <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: "6px 8px", alignItems: "center", marginBottom: 7 }}>
        <span style={{ fontSize: 11.5, color: "var(--text-dim)", fontWeight: 600 }}>{label}</span>
        {children}
      </div>
    )
    const segBtns = (opts: [string,string][], val: string, set: (v: string)=>void) => (
      <div style={{ display: "flex", gap: 3 }}>
        {opts.map(([k,l]) => (
          <button key={k} type="button" onClick={() => set(k)}
            style={{ flex: 1, fontFamily: "inherit", fontSize: 11, fontWeight: 600, padding: "5px 4px", borderRadius: 7, border: "1.5px solid", cursor: "pointer", background: val===k?"var(--accent)":"var(--surface-2)", color: val===k?"#fff":"var(--text-dim)", borderColor: val===k?"var(--accent)":"var(--border)", transition: "all .12s" }}>
            {l}
          </button>
        ))}
      </div>
    )

    return (
      <div style={{ padding: "10px 14px 20px", overflowY: "auto", flex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{BLOCK_TYPE_LABELS[b.type] ?? b.type}</span>
          <button type="button" onClick={() => tplMove(b.id, -1)} title="上移" style={{ ...S.ghostBtn, padding: "4px 7px", fontSize: 12 }}><Ic.ArrowUp /></button>
          <button type="button" onClick={() => tplMove(b.id, 1)}  title="下移" style={{ ...S.ghostBtn, padding: "4px 7px", fontSize: 12 }}><Ic.ArrowDn /></button>
          <button type="button" onClick={() => tplDup(b.id)} title="複製" style={{ ...S.ghostBtn, padding: "4px 7px", fontSize: 12 }}><Ic.Dup /></button>
          <button type="button" onClick={() => { tplRemove(b.id); setSelectedBlockId(null) }} title="刪除" style={{ ...S.ghostBtn, padding: "4px 7px", fontSize: 12, color: "var(--avoid)" }}><Ic.Trash /></button>
        </div>

        {/* Source picker */}
        {b.type === "section" && (
          <>{row("來源區塊",
            <SelOC value={b.sourceId ?? ""} onChange={e => patch({ sourceId: e.target.value })}>
              {sections.map(s => <option key={s.id} value={s.id}>{s.title || "(未命名)"}</option>)}
            </SelOC>
          )}
          {row("樣式", segBtns([["","預設"],["cards","卡片"]], b.variant ?? "", v => patch({ variant: v || undefined })))}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 7 }}>
            <input type="checkbox" id="hideTitle" checked={b.hideTitle ?? false} onChange={e => patch({ hideTitle: e.target.checked })} />
            <label htmlFor="hideTitle" style={{ fontSize: 12, color: "var(--text-dim)" }}>隱藏標題</label>
          </div>
          {!b.hideTitle && row("標題文字",
            <InpOC sm value={b.titleOverride ?? ""} placeholder="（預設用區塊標題）" onChange={e => patch({ titleOverride: e.target.value || undefined })} />
          )}
          </>
        )}
        {b.type === "album" && (
          <>{row("來源相簿",
            <SelOC value={b.sourceId ?? ""} onChange={e => patch({ sourceId: e.target.value })}>
              {albums.map(a => <option key={a.id} value={a.id}>{a.name || "(未命名)"}</option>)}
            </SelOC>
          )}
          {row("顯示模式", segBtns([["grid","格狀"],["carousel","輪播"]], b.mode ?? "grid", v => patch({ mode: v })))}
          {row("比例", <SelOC value={b.ratio ?? "square"} onChange={e => patch({ ratio: e.target.value })}>
            {[["square","正方"],["portrait","直式"],["landscape","橫式"],["wide","寬橫"],["natural","原始"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </SelOC>)}
          {(b.mode ?? "grid") === "grid" && row("欄數",
            <div style={{ display: "flex", gap: 5 }}>
              {[2,3,4].map(n => (
                <button key={n} type="button" onClick={() => patch({ cols: n })}
                  style={{ flex: 1, fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "5px", borderRadius: 7, border: "1.5px solid", cursor: "pointer", background: (b.cols??3)===n?"var(--accent)":"var(--surface-2)", color: (b.cols??3)===n?"#fff":"var(--text-dim)", borderColor: (b.cols??3)===n?"var(--accent)":"var(--border)" }}>
                  {n}
                </button>
              ))}
            </div>
          )}
          </>
        )}

        {/* Cover ratio */}
        {b.type === "cover" && row("比例", <SelOC value={b.ratio ?? "natural"} onChange={e => patch({ ratio: e.target.value })}>
          {[["natural","原始"],["banner","橫幅 21:9"],["wide","寬 16:9"],["standard","標準 4:3"],["square","正方"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </SelOC>)}

        {/* Palette variant */}
        {b.type === "palette" && row("樣式", segBtns([["swatch","色塊"],["bar","色帶"],["dots","圓點"]], b.pvar ?? "swatch", v => patch({ pvar: v })))}

        {/* Text / Marquee / Button */}
        {(b.type === "text" || b.type === "marquee" || b.type === "button") && (
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 5 }}>文字內容</span>
            {b.type === "text"
              ? <TexOC rows={4} value={b.text ?? ""} onChange={e => patch({ text: e.target.value })} />
              : <InpOC sm value={b.text ?? ""} onChange={e => patch({ text: e.target.value })} />
            }
          </div>
        )}
        {b.type === "marquee" && row("速度（秒）",
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <input type="range" min={4} max={40} value={b.speed ?? 18} onChange={e => patch({ speed: Number(e.target.value) })} style={{ flex: 1 }} />
            <span style={{ fontSize: 12, minWidth: 24, textAlign: "right" }}>{b.speed ?? 18}</span>
          </div>
        )}

        {/* Popup */}
        {b.type === "popup" && <>
          {row("觸發方式", segBtns([["button","按鈕"],["thumb","縮圖"]], b.trigger ?? "button", v => patch({ trigger: v })))}
          {row("按鈕文字", <InpOC sm value={b.text ?? ""} onChange={e => patch({ text: e.target.value })} />)}
          {row("縮圖 URL", <InpOC sm value={b.popupImg ?? ""} onChange={e => patch({ popupImg: e.target.value })} />)}
          {row("彈窗標題", <InpOC sm value={b.title ?? ""} onChange={e => patch({ title: e.target.value })} />)}
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 5 }}>彈窗內文</span>
          <TexOC rows={3} value={b.body ?? ""} onChange={e => patch({ body: e.target.value })} style={{ marginBottom: 8 }} />
        </>}

        {/* Badges */}
        {b.type === "badges" && <>
          {row("樣式", segBtns([["filled","填色"],["outline","框線"]], b.tagStyle ?? "filled", v => patch({ tagStyle: v })))}
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>標籤列表</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
            {(b.tags ?? []).map(tag => (
              <div key={tag.id} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <InpOC sm value={tag.label} placeholder="標籤文字" style={{ flex: 1 }}
                  onChange={e => patch({ tags: (b.tags ?? []).map(t => t.id === tag.id ? { ...t, label: e.target.value } : t) })} />
                <input type="color" value={tag.color ?? "#c98a5e"}
                  onChange={e => patch({ tags: (b.tags ?? []).map(t => t.id === tag.id ? { ...t, color: e.target.value } : t) })}
                  style={{ width: 28, height: 28, padding: 2, borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer" }} />
                <button type="button" style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-dim)", cursor: "pointer", fontSize: 14 }}
                  onClick={() => patch({ tags: (b.tags ?? []).filter(t => t.id !== tag.id) })}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
              {TAGPAL.map(c => (
                <button key={c} type="button" title={c}
                  style={{ width: 20, height: 20, borderRadius: "50%", background: c, border: "1.5px solid rgba(0,0,0,.1)", cursor: "pointer" }}
                  onClick={() => patch({ tags: [...(b.tags ?? []), { id: uid(), label: "標籤", color: c }] })} />
              ))}
            </div>
          </div>
        </>}

        {/* Spacer */}
        {b.type === "spacer" && row("高度 (px)",
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <input type="range" min={12} max={200} value={st.padding ?? 36} onChange={e => spatch({ padding: Number(e.target.value) })} style={{ flex: 1 }} />
            <span style={{ fontSize: 12, minWidth: 32 }}>{st.padding ?? 36}px</span>
          </div>
        )}

        {/* Divider */}
        {b.type === "divider" && <>
          {row("線條樣式", segBtns([["solid","實線"],["dashed","虛線"],["dotted","點線"]], st.borderStyle ?? "solid", v => spatch({ borderStyle: v })))}
          {row("粗細",
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
              <input type="range" min={1} max={6} value={st.borderWidth ?? 1} onChange={e => spatch({ borderWidth: Number(e.target.value) })} style={{ flex: 1 }} />
              <span style={{ fontSize: 12, minWidth: 20 }}>{st.borderWidth ?? 1}</span>
            </div>
          )}
          {row("顏色",
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="color" value={st.borderColor ?? "#000000"} onChange={e => spatch({ borderColor: e.target.value })} style={{ width: 28, height: 26, padding: 2, borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer" }} />
              <InpOC sm value={st.borderColor ?? ""} onChange={e => spatch({ borderColor: e.target.value })} placeholder="（預設）" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} />
            </div>
          )}
        </>}

        {/* Columns */}
        {b.type === "columns" && <>
          {row("欄數",
            <div style={{ display: "flex", gap: 5 }}>
              {[2,3,4].map(n => (
                <button key={n} type="button" onClick={() => {
                  const curr = b.children ?? []
                  const cols: CanvasBlock[][] = Array.from({ length: n }, (_, i) => curr[i] ?? [])
                  const evenly = Math.round(100 / n)
                  patch({ children: cols, widths: Array(n).fill(evenly) })
                }}
                  style={{ flex: 1, fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "5px", borderRadius: 7, border: "1.5px solid", cursor: "pointer", background: (b.children?.length??2)===n?"var(--accent)":"var(--surface-2)", color: (b.children?.length??2)===n?"#fff":"var(--text-dim)", borderColor: (b.children?.length??2)===n?"var(--accent)":"var(--border)" }}>
                  {n}
                </button>
              ))}
            </div>
          )}
          {row("垂直對齊", segBtns([["start","頂"],["center","中"],["end","底"]], b.valign ?? "start", v => patch({ valign: v })))}
        </>}

        {/* Size — for heading/tagline/avatar/cover/text */}
        {["heading","tagline","avatar","cover","text"].includes(b.type) && row("尺寸",
          segBtns([["sm","小"],["md","中"],["lg","大"],["xl","超大"]], b.size ?? "md", v => patch({ size: v }))
        )}

        {/* Align — most info blocks */}
        {isInfo && b.type !== "section" && b.type !== "album" && b.type !== "badges" && row("對齊",
          segBtns([["left","左"],["center","中"],["right","右"]], st.align ?? "left", v => spatch({ align: v as any }))
        )}

        {/* FullBleed toggle */}
        {b.type !== "spacer" && b.type !== "divider" && b.type !== "pagebreak" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 7 }}>
            <input type="checkbox" id={`fb-${b.id}`} checked={st.fullBleed ?? false} onChange={e => spatch({ fullBleed: e.target.checked })} />
            <label htmlFor={`fb-${b.id}`} style={{ fontSize: 12, color: "var(--text-dim)" }}>滿版出血</label>
          </div>
        )}

        {/* Custom appearance */}
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 10, paddingTop: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: (st.custom ? 10 : 0) }}>
            <input type="checkbox" id={`cst-${b.id}`} checked={st.custom ?? false} onChange={e => spatch({ custom: e.target.checked })} />
            <label htmlFor={`cst-${b.id}`} style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>自訂外觀</label>
          </div>
          {st.custom && <>
            {row("背景色",
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="color" value={st.bgColor ?? "#ffffff"} onChange={e => spatch({ bgColor: e.target.value })} style={{ width: 28, height: 26, padding: 2, borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer" }} />
                <InpOC sm value={st.bgColor ?? ""} onChange={e => spatch({ bgColor: e.target.value })} placeholder="#ffffff" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} />
              </div>
            )}
            {row("文字色",
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="color" value={st.textColor ?? "#000000"} onChange={e => spatch({ textColor: e.target.value })} style={{ width: 28, height: 26, padding: 2, borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer" }} />
                <InpOC sm value={st.textColor ?? ""} onChange={e => spatch({ textColor: e.target.value })} placeholder="（預設）" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} />
              </div>
            )}
            {row("透明度",
              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                <input type="range" min={0} max={100} value={st.opacity ?? 100} onChange={e => spatch({ opacity: Number(e.target.value) })} style={{ flex: 1 }} />
                <span style={{ fontSize: 12, minWidth: 28 }}>{st.opacity ?? 100}%</span>
              </div>
            )}
            {row("特效", <SelOC value={st.fx ?? ""} onChange={e => spatch({ fx: e.target.value as any || undefined })}>
              {FX_OPTS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </SelOC>)}
            {row("圓角 (px)",
              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                <input type="range" min={0} max={40} value={st.radius ?? 0} onChange={e => spatch({ radius: Number(e.target.value) })} style={{ flex: 1 }} />
                <span style={{ fontSize: 12, minWidth: 28 }}>{st.radius ?? 0}px</span>
              </div>
            )}
            {row("內距 (px)",
              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                <input type="range" min={0} max={80} value={st.padding ?? 14} onChange={e => spatch({ padding: Number(e.target.value) })} style={{ flex: 1 }} />
                <span style={{ fontSize: 12, minWidth: 28 }}>{st.padding ?? 14}px</span>
              </div>
            )}
            {row("框線色",
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="color" value={st.borderColor ?? "#e0d0c0"} onChange={e => spatch({ borderColor: e.target.value })} style={{ width: 28, height: 26, padding: 2, borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer" }} />
                <InpOC sm value={st.borderColor ?? ""} onChange={e => spatch({ borderColor: e.target.value })} placeholder="（無框線）" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} />
              </div>
            )}
            {row("框線寬",
              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                <input type="range" min={0} max={8} value={st.borderWidth ?? 0} onChange={e => spatch({ borderWidth: Number(e.target.value) })} style={{ flex: 1 }} />
                <span style={{ fontSize: 12, minWidth: 20 }}>{st.borderWidth ?? 0}</span>
              </div>
            )}
            {row("框線樣式", segBtns([["solid","實"],["dashed","虛"],["dotted","點"]], st.borderStyle ?? "solid", v => spatch({ borderStyle: v })))}
          </>}
        </div>
      </div>
    )
  }

  // ─── Template editor panel ────────────────────────────────────────────────

  function renderTplEdit() {
    const tplBlocks = activeTpl?.blocks ?? liveTemplate.blocks

    // Compute page tabs from pagebreak blocks
    const pagebreakIdxs = tplBlocks.reduce<number[]>((a, b, i) => b.type === "pagebreak" ? [...a, i] : a, [])
    const pageCount = pagebreakIdxs.length + 1

    // Clamp pageView when blocks change
    const clampedPage = pageView !== null ? Math.min(pageView, pageCount - 1) : null

    // Currently selected block object
    const selBlock = selectedBlockId ? tplBlocks.find(b => b.id === selectedBlockId) ?? null : null

    // The "right panel" shows block props when a block is selected, otherwise design/blocks panel
    const showBlockPanel = selBlock !== null

    const INFO_ADDABLE: [string,string][] = [
      ["heading","標題"],["tagline","一句話"],["avatar","頭像"],["cover","主視覺"],
      ["section","資料區塊"],["palette","色票"],["album","相簿"],["badges","標籤列"],["popup","彈出視窗"],
    ]
    const LAYOUT_ADDABLE: [string,string][] = [
      ["text","自訂文字"],["marquee","跑馬燈"],["button","按鈕"],
      ["divider","分隔線"],["spacer","空白"],["columns","欄位排版"],["pagebreak","分頁符"],
    ]

    const PRESET_KINDS: [string,string][] = [
      ["card","名片"],["sheet","設定集"],["oc","OC 展示"],["project","企劃"],
      ["au","AU 版本"],["gallery","圖集"],["all","完整模板"],["blank","空白"],
    ]

    return (
      <div style={{ display: "flex", flexDirection: "column" }}>

        {/* ── Template tabs bar ── */}
        <div style={{ display: "flex", alignItems: "stretch", background: "var(--surface-2)", borderRadius: "14px 14px 0 0", padding: "6px 10px 0", borderBottom: "1px solid var(--border)", overflowX: "auto", gap: 2, flexShrink: 0 }}>
          {templates.map(t => (
            <button key={t.id} type="button"
              onDoubleClick={() => {
                const newName = prompt("模板名稱：", t.name)
                if (newName !== null) { setTemplates(ts => ts.map(x => x.id === t.id ? { ...x, name: newName } : x)); markDirty() }
              }}
              onClick={() => { setActiveTplId(t.id); setSelectedBlockId(null); setPageView(null) }}
              style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "8px 16px", border: "none", cursor: "pointer", borderRadius: "8px 8px 0 0", whiteSpace: "nowrap", background: activeTplId === t.id ? "var(--surface)" : "transparent", color: activeTplId === t.id ? "var(--accent)" : "var(--text-dim)", borderBottom: activeTplId === t.id ? "2px solid var(--accent)" : "2px solid transparent", transition: "all .14s", display: "flex", alignItems: "center", gap: 5 }}>
              {t.name}
              {(publicTplId === t.id || (!publicTplId && templates[0]?.id === t.id)) && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "var(--accent)", color: "#fff", lineHeight: 1.4 }}>公開</span>
              )}
            </button>
          ))}
          {templates.length === 0 && (
            <span style={{ fontSize: 12.5, color: "var(--text-faint)", padding: "8px 12px", alignSelf: "center" }}>尚無模板，先新增</span>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 4, alignItems: "center", paddingBottom: 6 }}>
            <button type="button" style={{ ...S.addBtn, fontSize: 12, padding: "5px 10px", borderRadius: 8 }}
              onClick={() => setShowPresetModal(true)}>＋ 新增模板</button>
            <button type="button" style={{ ...S.ghostBtn, fontSize: 12, padding: "5px 10px", borderRadius: 8 }} onClick={dupTemplate} disabled={!activeTpl}><Ic.Dup /> 複製</button>
            {activeTpl && publicTplId !== activeTpl.id && (
              <button type="button" style={{ ...S.ghostBtn, fontSize: 12, padding: "5px 10px", borderRadius: 8, color: "var(--accent)" }}
                onClick={() => { setPublicTplId(activeTpl.id); markDirty() }}>⊙ 設為公開展示</button>
            )}
            <button type="button" style={{ ...S.ghostBtn, fontSize: 12, padding: "5px 10px", borderRadius: 8, color: "var(--avoid)" }} onClick={deleteTemplate} disabled={templates.length === 0}><Ic.Trash /> 刪除</button>
          </div>
        </div>

        {/* ── Page tabs (below template tabs) ── */}
        {pageCount > 1 && (
          <div style={{ display: "flex", gap: 2, background: "var(--surface)", padding: "4px 10px", borderBottom: "1px solid var(--border)", overflowX: "auto", flexShrink: 0 }}>
            <button type="button" onClick={() => setPageView(null)}
              style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 7, border: "1.5px solid", cursor: "pointer", whiteSpace: "nowrap", background: clampedPage === null ? "var(--accent)" : "transparent", color: clampedPage === null ? "#fff" : "var(--text-dim)", borderColor: clampedPage === null ? "var(--accent)" : "transparent" }}>
              全部
            </button>
            {Array.from({ length: pageCount }, (_, i) => (
              <button key={i} type="button" onClick={() => setPageView(i)}
                style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 7, border: "1.5px solid", cursor: "pointer", whiteSpace: "nowrap", background: clampedPage === i ? "var(--accent)" : "transparent", color: clampedPage === i ? "#fff" : "var(--text-dim)", borderColor: clampedPage === i ? "var(--accent)" : "transparent" }}>
                第{i + 1}頁
              </button>
            ))}
          </div>
        )}

        {/* ── Main 2-col layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))", background: "var(--surface)", border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 16px 16px", overflow: "hidden" }}>

          {/* Left: canvas preview */}
          <div style={{ background: "#e8e4de", padding: "14px 14px 0", display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
            {/* Toolbar row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {/* Device tabs */}
              <div style={{ display: "flex", gap: 2, background: "var(--surface)", padding: 3, borderRadius: 9 }}>
                {([["desktop","電腦"],["tablet","平板"],["mobile","手機"]] as [Device,string][]).map(([d,l]) => (
                  <button key={d} type="button"
                    style={{ fontFamily: "inherit", fontSize: 11, fontWeight: 600, padding: "4px 9px", borderRadius: 6, border: "none", cursor: "pointer", background: device === d ? "var(--accent)" : "transparent", color: device === d ? "#fff" : "var(--text-dim)", transition: "all .14s" }}
                    onClick={() => setDevice(d)}>{l}</button>
                ))}
              </div>
              <div style={{ flex: 1 }} />
              {/* Editing hint */}
              {activeTpl && (
                <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                  {selectedBlockId ? "點擊空白取消選取" : "點擊積木選取 · 拖曳重排"}
                </span>
              )}
              {/* Add pagebreak */}
              {activeTpl && (
                <button type="button" style={{ ...S.ghostBtn, fontSize: 11, padding: "4px 9px", borderRadius: 7 }} onClick={tplAddPagebreak}>
                  ＋ 分頁
                </button>
              )}
            </div>

            {/* Canvas scroll area */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", paddingBottom: 14 }}>
              <div style={{
                width: device === "desktop" ? "100%" : device === "tablet" ? 640 : 375,
                maxWidth: "100%",
                background: liveDesign.bg || "#fff",
                borderRadius: device === "mobile" ? 24 : 12,
                overflow: "hidden",
                boxShadow: "0 6px 30px rgba(40,32,26,.25)",
                border: device !== "desktop" ? "5px solid #2a2a2a" : "none",
                flexShrink: 0,
              }}>
                <TemplateCanvas
                  character={liveCanvasChar}
                  template={liveTemplate as any}
                  design={liveDesign as any}
                  editable={!!activeTpl}
                  selectedId={selectedBlockId}
                  onSelect={id => { setSelectedBlockId(id); if (id) setTplRightPanel("design") }}
                  onReorder={tplReorder}
                  pageView={clampedPage}
                />
              </div>
            </div>

            {/* Floating action bar when block selected */}
            {selBlock && (
              <div style={{ position: "sticky", bottom: 0, background: "rgba(30,24,20,0.92)", backdropFilter: "blur(6px)", padding: "8px 14px", display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", flex: 1, fontWeight: 600 }}>{BLOCK_TYPE_LABELS[selBlock.type] ?? selBlock.type}</span>
                <button type="button" onClick={() => tplMove(selBlock.id, -1)} style={{ ...floatBtn }}>↑ 上移</button>
                <button type="button" onClick={() => tplMove(selBlock.id, 1)}  style={{ ...floatBtn }}>↓ 下移</button>
                <button type="button" onClick={() => tplDup(selBlock.id)}      style={{ ...floatBtn }}><Ic.Dup /></button>
                <button type="button" onClick={() => { tplRemove(selBlock.id); setSelectedBlockId(null) }} style={{ ...floatBtn, color: "#ff9999" }}><Ic.Trash /></button>
                <button type="button" onClick={() => setSelectedBlockId(null)} style={{ ...floatBtn, color: "rgba(255,255,255,0.5)" }}>完成</button>
              </div>
            )}
          </div>

          {/* Right: context panel */}
          <div style={{ borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--surface)" }}>
            {/* Panel tabs — if no block selected, show design/blocks; if block selected, show block props */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              {showBlockPanel ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent)", flex: 1 }}>積木屬性</span>
                  <button type="button" onClick={() => setSelectedBlockId(null)} style={{ ...S.ghostBtn, fontSize: 11, padding: "4px 8px", borderRadius: 7 }}>← 取消選取</button>
                </div>
              ) : (<>
                <button type="button" onClick={() => setTplRightPanel("design")}
                  style={{ flex: 1, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, padding: "11px 6px", border: "none", cursor: "pointer", background: tplRightPanel === "design" ? "var(--surface)" : "var(--surface-2)", color: tplRightPanel === "design" ? "var(--accent)" : "var(--text-dim)", borderBottom: tplRightPanel === "design" ? "2px solid var(--accent)" : "2px solid transparent", transition: "all .14s" }}>
                  設計
                </button>
                <button type="button" onClick={() => setTplRightPanel("blocks")}
                  style={{ flex: 1, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, padding: "11px 6px", border: "none", cursor: "pointer", background: tplRightPanel === "blocks" ? "var(--surface)" : "var(--surface-2)", color: tplRightPanel === "blocks" ? "var(--accent)" : "var(--text-dim)", borderBottom: tplRightPanel === "blocks" ? "2px solid var(--accent)" : "2px solid transparent", transition: "all .14s" }}>
                  ＋ 積木
                </button>
              </>)}
            </div>

            {/* Panel body */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

              {/* ── Block property panel ── */}
              {showBlockPanel && selBlock && renderBlockPanel(selBlock)}

              {/* ── Design panel ── */}
              {!showBlockPanel && tplRightPanel === "design" && (
                <div>
                  {!activeTpl ? (
                    <div style={{ padding: "var(--s5) var(--s4)", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>先新增模板</div>
                  ) : (<>
                    <AccordionSection title="背景設定" openKey="gBg" open={designOpen} toggle={toggleDesignOpen}>
                      <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: "7px 8px", alignItems: "center" }}>
                        <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>底色</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input type="color" value={liveDesign.bg || "#ffffff"} onChange={e => designPatch({ bg: e.target.value })} style={{ width: 28, height: 26, padding: 2, borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer" }} />
                          <InpOC sm value={liveDesign.bg || "#ffffff"} onChange={e => designPatch({ bg: e.target.value })} placeholder="#ffffff" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} />
                        </div>
                        <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>電腦背景圖</span>
                        <InpOC sm value={liveDesign.bgImage || ""} onChange={e => designPatch({ bgImage: e.target.value })} placeholder="URL…" />
                        <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>平板背景圖</span>
                        <InpOC sm value={(liveDesign as any).bgImageTablet || ""} onChange={e => designPatch({ bgImageTablet: e.target.value } as any)} placeholder="URL（選填）…" />
                        <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>手機背景圖</span>
                        <InpOC sm value={liveDesign.bgImagePhone || ""} onChange={e => designPatch({ bgImagePhone: e.target.value })} placeholder="URL（選填）…" />
                        <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>圖片填法</span>
                        <SelOC value={liveDesign.bgSize || "cover"} onChange={e => designPatch({ bgSize: e.target.value })}>
                          <option value="cover">cover（裁切填滿）</option>
                          <option value="contain">contain（完整顯示）</option>
                          <option value="100% auto">100% 寬</option>
                          <option value="auto 100%">100% 高</option>
                        </SelOC>
                        <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>重複方式</span>
                        <SelOC value={liveDesign.bgRepeat || "no-repeat"} onChange={e => designPatch({ bgRepeat: e.target.value })}>
                          <option value="no-repeat">不重複</option>
                          <option value="repeat">重複</option>
                          <option value="repeat-x">水平重複</option>
                          <option value="repeat-y">垂直重複</option>
                        </SelOC>
                        <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>捲動方式</span>
                        <SelOC value={liveDesign.bgAttach || "scroll"} onChange={e => designPatch({ bgAttach: e.target.value })}>
                          <option value="scroll">隨頁面捲動</option>
                          <option value="fixed">固定不動（視差）</option>
                        </SelOC>
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <span style={{ fontSize: 11.5, color: "var(--text-dim)", display: "block", marginBottom: 5 }}>亮度 {liveDesign.maskBright ?? 100}%</span>
                        <input type="range" min={20} max={150} value={liveDesign.maskBright ?? 100} onChange={e => designPatch({ maskBright: Number(e.target.value) })} style={{ width: "100%" }} />
                        <span style={{ fontSize: 11.5, color: "var(--text-dim)", display: "block", margin: "8px 0 4px" }}>模糊 {liveDesign.maskBlur ?? 0}px</span>
                        <input type="range" min={0} max={30} value={liveDesign.maskBlur ?? 0} onChange={e => designPatch({ maskBlur: Number(e.target.value) })} style={{ width: "100%" }} />
                        <span style={{ fontSize: 11.5, color: "var(--text-dim)", display: "block", margin: "8px 0 4px" }}>飽和 {liveDesign.maskSat ?? 100}%</span>
                        <input type="range" min={0} max={200} value={liveDesign.maskSat ?? 100} onChange={e => designPatch({ maskSat: Number(e.target.value) })} style={{ width: "100%" }} />
                      </div>
                    </AccordionSection>

                    <AccordionSection title="字型與主色" openKey="gFont" open={designOpen} toggle={toggleDesignOpen}>
                      <div style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: "7px 8px", alignItems: "center" }}>
                        <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>主色</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input type="color" value={liveDesign.primary || color} onChange={e => designPatch({ primary: e.target.value })} style={{ width: 28, height: 26, padding: 2, borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer" }} />
                          <InpOC sm value={liveDesign.primary || color} onChange={e => designPatch({ primary: e.target.value })} placeholder="#c98a5e" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} />
                        </div>
                        <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>字型</span>
                        <SelOC value={liveDesign.font || "noto-serif"} onChange={e => designPatch({ font: e.target.value })}>
                          {FONT_OPTS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                        </SelOC>
                        <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>自訂字型</span>
                        <InpOC sm value={liveDesign.fontImport || ""} onChange={e => designPatch({ fontImport: e.target.value })} placeholder="字型名稱（Google Fonts）" />
                        <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>對齊</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          {([["left","左"],["center","中"],["right","右"]] as [string,string][]).map(([v,l]) => {
                            const active = (liveDesign.align || "left") === v
                            return <button key={v} type="button" onClick={() => designPatch({ align: v as any })}
                              style={{ flex: 1, fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "5px 4px", borderRadius: 7, border: "1.5px solid", cursor: "pointer", background: active ? "var(--accent)" : "var(--surface-2)", color: active ? "#fff" : "var(--text-dim)", borderColor: active ? "var(--accent)" : "var(--border)" }}>{l}</button>
                          })}
                        </div>
                      </div>
                    </AccordionSection>

                    <AccordionSection title="主題色彩庫" openKey="gLib" open={designOpen} toggle={toggleDesignOpen}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {(liveDesign.library ?? DEF_LIBRARY).map((hex, i) => (
                          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <input type="color" value={hex} onChange={e => {
                              const lib = [...(liveDesign.library ?? DEF_LIBRARY)]
                              lib[i] = e.target.value
                              designPatch({ library: lib })
                            }} style={{ width: 32, height: 32, padding: 2, borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer" }} />
                            <button type="button" onClick={() => {
                              const lib = (liveDesign.library ?? DEF_LIBRARY).filter((_, j) => j !== i)
                              designPatch({ library: lib })
                            }} style={{ fontSize: 10, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => {
                          const lib = [...(liveDesign.library ?? DEF_LIBRARY), "#c98a5e"]
                          designPatch({ library: lib })
                        }} style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px dashed var(--border)", background: "none", cursor: "pointer", fontSize: 16, color: "var(--text-faint)" }}>＋</button>
                      </div>
                    </AccordionSection>

                    <AccordionSection title="佈局寬度" openKey="gWidth" open={designOpen} toggle={toggleDesignOpen}>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                          {(["narrow","normal","wide"] as const).map(w => {
                            const lbl = { narrow: "窄", normal: "標準", wide: "寬" }
                            const active = (liveDesign.width || "normal") === w
                            return (
                              <button key={w} type="button"
                                style={{ flex: 1, fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "7px 4px", borderRadius: 8, border: "1.5px solid", cursor: "pointer", background: active ? "var(--accent)" : "var(--surface-2)", color: active ? "#fff" : "var(--text-dim)", borderColor: active ? "var(--accent)" : "var(--border)", transition: "all .14s" }}
                                onClick={() => designPatch({ width: w })}>
                                {lbl[w]}
                              </button>
                            )
                          })}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                          <input type="checkbox" id="autoNav" checked={liveDesign.autoNav ?? false} onChange={e => designPatch({ autoNav: e.target.checked })} />
                          <label htmlFor="autoNav" style={{ fontSize: 12, color: "var(--text-dim)" }}>自動頁面導覽列</label>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="checkbox" id="pageFit" checked={(liveDesign as any).pageFit === "screen"} onChange={e => designPatch({ pageFit: e.target.checked ? "screen" : "auto" } as any)} />
                          <label htmlFor="pageFit" style={{ fontSize: 12, color: "var(--text-dim)" }}>單頁填滿螢幕高度</label>
                        </div>
                      </div>
                    </AccordionSection>
                  </>)}
                </div>
              )}

              {/* ── Add blocks panel ── */}
              {!showBlockPanel && tplRightPanel === "blocks" && (
                <div style={{ padding: "10px 12px" }}>
                  {activeTpl && tplBlocks.length > 0 && (
                    <>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-faint)", margin: "6px 0 6px" }}>積木列表</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 12 }}>
                        {tplBlocks.map((b, i) => (
                          <div key={b.id}
                            style={{ display: "flex", alignItems: "center", gap: 4, background: selectedBlockId === b.id ? "var(--accent-soft)" : "var(--surface-2)", border: `1px solid ${selectedBlockId === b.id ? "var(--accent)" : "var(--border)"}`, borderRadius: 9, padding: "5px 7px", cursor: "pointer" }}
                            onClick={() => { setSelectedBlockId(selectedBlockId === b.id ? null : b.id); setTplRightPanel("design") }}>
                            <span style={{ flex: 1, fontSize: 11.5, color: selectedBlockId === b.id ? "var(--accent)" : "var(--text)", fontWeight: selectedBlockId === b.id ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {blkLabel(b as CanvasBlock, sections, albums)}
                            </span>
                            <button type="button" disabled={i === 0} onClick={e => { e.stopPropagation(); tplMove(b.id, -1) }}
                              style={{ ...S.ghostBtn, padding: "2px 4px", opacity: i === 0 ? 0.3 : 1, fontSize: 11 }}><Ic.ArrowUp /></button>
                            <button type="button" disabled={i === tplBlocks.length - 1} onClick={e => { e.stopPropagation(); tplMove(b.id, 1) }}
                              style={{ ...S.ghostBtn, padding: "2px 4px", opacity: i === tplBlocks.length - 1 ? 0.3 : 1, fontSize: 11 }}><Ic.ArrowDn /></button>
                            <button type="button" onClick={e => { e.stopPropagation(); tplDup(b.id) }} style={{ ...S.ghostBtn, padding: "2px 4px", fontSize: 11 }}><Ic.Dup /></button>
                            <button type="button" onClick={e => { e.stopPropagation(); tplRemove(b.id); if (selectedBlockId === b.id) setSelectedBlockId(null) }} style={{ ...S.ghostBtn, padding: "2px 4px", fontSize: 11, color: "var(--avoid)" }}><Ic.Trash /></button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-faint)", margin: "6px 0 5px" }}>資訊積木</p>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                    {INFO_ADDABLE.map(([type, label]) => (
                      <AddBlockButton key={type} label={label} onClick={() => { tplAdd(type); markDirty() }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-faint)", margin: "6px 0 5px" }}>排版積木</p>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                    {LAYOUT_ADDABLE.map(([type, label]) => (
                      <AddBlockButton key={type} label={label} onClick={() => { tplAdd(type); markDirty() }} />
                    ))}
                  </div>
                  {activeTpl && (
                    <button type="button" style={{ ...S.ghostBtn, fontSize: 11, color: "var(--avoid)", width: "100%", justifyContent: "center" }} onClick={tplReset}>↺ 重設為預設積木</button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom status */}
            <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", fontSize: 11.5, color: isDirty ? "var(--accent)" : "var(--text-faint)", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              {mutation.isPending ? <><Ic.Reset /> 儲存中…</> : isDirty ? "● 有未儲存的更改" : <><Ic.Check /> 已儲存</>}
            </div>
          </div>
        </div>

        {/* ── Preset chooser modal ── */}
        {showPresetModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(20,16,13,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setShowPresetModal(false)}>
            <div style={{ background: "var(--surface)", borderRadius: 20, padding: 28, maxWidth: 520, width: "100%", boxShadow: "0 30px 80px rgba(0,0,0,.45)" }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>新增模板</h3>
              <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 18px" }}>選擇範本快速開始，或建立空白模板</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10 }}>
                {PRESET_KINDS.map(([kind, label]) => (
                  <button key={kind} type="button"
                    style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: "14px 10px", borderRadius: 14, border: "1.5px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", cursor: "pointer", textAlign: "center", transition: "all .15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text)" }}
                    onClick={() => {
                      const t = makePresetTemplate(kind)
                      setTemplates(ts => [...ts, t]); setActiveTplId(t.id); markDirty(); setShowPresetModal(false)
                    }}>
                    {label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setShowPresetModal(false)} style={{ marginTop: 18, width: "100%", ...S.ghostBtn, justifyContent: "center" }}>取消</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <ContextHeader scope="account" crumbs={[{ label: "我的角色", href: "/characters" }, { label: character?.name ?? "…", href: `/characters/${charId}` }, "編輯"]} />

      {/* ── Sticky action bar ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--surface)", borderBottom: "1px solid var(--border)", margin: "0 calc(var(--s8) * -1)", padding: "10px var(--s8)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* Avatar */}
        <div className="av-upload" onClick={() => avatarRef.current?.click()} title="更換頭像">
          {(watchedAvatarUrl || character?.avatarUrl)
            ? <img src={watchedAvatarUrl || character?.avatarUrl!} alt={watchedName} className="av-img" />
            : <div className="av" style={{ background: color, fontSize: 18, width: "100%", height: "100%" }}>{watchedName.slice(0, 1) || character?.name?.slice(0, 1) || "？"}</div>
          }
          <div className="av-overlay">{avatarUploading ? "…" : <Ic.Upload />}</div>
        </div>
        <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }} onChange={e => handleAvatarFile(e.target.files)} />
        <input ref={importRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={handleImportFile} />
        <input ref={albumImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleAlbumImageFile(e.target.files)} />

        <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 17, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{watchedName || "…"}</span>

        {/* Top tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", padding: 4, borderRadius: 11 }}>
          {([["edit","編輯資料"],["template","模板與展示"]] as [TopTab,string][]).map(([t,l]) => (
            <button key={t} type="button" onClick={() => setTopTab(t)}
              style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: "6px 13px", borderRadius: 8, border: "none", cursor: "pointer", background: topTab === t ? "var(--surface)" : "transparent", color: topTab === t ? "var(--text)" : "var(--text-dim)", boxShadow: topTab === t ? "0 1px 5px rgba(0,0,0,.09)" : "none", transition: "all .15s" }}
            >{l}</button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* 自動儲存 */}
        <span style={{ fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, color: isDirty ? "var(--accent)" : "var(--text-dim)", opacity: isDirty ? 1 : 0.8 }}>
          {mutation.isPending ? <><Ic.Reset />儲存中…</> : isDirty ? <><Ic.Check />有未儲存的更改</> : <><Ic.Check />已儲存</>}
        </span>

        <button type="button" title="備份與格式" style={S.ghostBtn} onClick={() => setShowBackupModal(true)}>
          <Ic.Doc /> 備份
        </button>
        <button type="button" style={S.ghostBtn} title="載入範例角色「莉央」" onClick={loadDemo}><Ic.Reset /> 載入範例</button>
        <button type="button" style={{ ...S.ghostBtn, color: "var(--avoid)" }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = "#c0584f"; el.style.borderColor = "#e0b3ad" }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = "var(--avoid)"; el.style.borderColor = "var(--border)" }}
          title="清空全部欄位" onClick={clearAll}><Ic.Trash /> 清空</button>

        <span style={{ width: 1, height: 22, background: "var(--border)", flexShrink: 0 }} />

        {character?.visibility !== "private" && character?.slug && (
          <a href={`/c/${character.slug}`} target="_blank" rel="noreferrer" style={{ ...S.ghostBtn, textDecoration: "none", fontSize: 12 }}>公開頁</a>
        )}
        <Link to={`/characters/${charId}`} style={{ ...S.ghostBtn, textDecoration: "none" }}>取消</Link>
        <button type="button" className="btn btn-accent" style={{ fontWeight: 700 }} disabled={mutation.isPending || !isDirty} onClick={handleSubmit(doSave)}>
          {mutation.isPending ? "儲存中…" : "儲存"}
        </button>
      </div>

      <div style={{ height: "var(--s5)" }} />

      {/* ══════════════════ 編輯資料 ══════════════════ */}
      {topTab === "edit" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(380px,100%),1fr))", gap: "var(--s8)", alignItems: "start" }}>
          {/* Left form */}
          <div style={{ minWidth: 0 }}>
            <div style={{ marginBottom: "var(--s5)" }}>
              <TabStrip tabs={SUB_TABS} active={tab} onChange={setTab} />
            </div>

            {/* ── 基礎 ── */}
            {tab === "basic" && (
              <form id="char-edit-form" onSubmit={handleSubmit(doSave)}>
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
              </form>
            )}

            {/* ── 圖設定 ── */}
            {tab === "image" && (
              <div>
                <Card Icon={Ic.Image} title="主要圖片">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 15 }}>
                    <Lbl text="頭像 URL">
                      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                        <div onClick={() => setShowAvatarCropper(true)} title="點擊上傳並裁切頭像"
                          style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: color, display: "grid", placeItems: "center", cursor: "pointer" }}>
                          {(watchedAvatarUrl || character?.avatarUrl)
                            ? <img src={watchedAvatarUrl || character?.avatarUrl!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <span style={{ color: "#fff", fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 18 }}>{watchedName.slice(0, 1) || character?.name?.slice(0, 1) || "？"}</span>
                          }
                        </div>
                        <InpOC placeholder="https://…" style={{ flex: 1 }} {...register("avatarUrl")} />
                        <button type="button" style={{ ...S.addBtn, flexShrink: 0 }} onClick={() => setShowAvatarCropper(true)}>
                          <Ic.Upload /> {avatarUploading ? "…" : "裁切上傳"}
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
                              onClick={(e) => { e.stopPropagation(); setPalette(p.colors.map(c => ({ id: uid(), label: c.label, hex: c.hex }))); markDirty(); ((e.currentTarget.closest("[style]") as HTMLElement | null)?.style && ((e.currentTarget.parentElement as HTMLElement).style.display = "none")) }}
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
              </div>
            )}
          </div>

          {/* Right: live preview */}
          <div style={{ position: "sticky", top: 72, width: 430, flexShrink: 0 }}>
            {/* Preview header with tabs */}
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
                  <CommissionPreview palette={palette} sections={sections} mainVisualUrl={watchedMain} color={color} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ 模板與展示 ══════════════════ */}
      {topTab === "template" && (
        <div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: "var(--s5)" }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 26, margin: 0, color: "var(--text)" }}>模板與展示</h1>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-dim)", maxWidth: 520 }}>管理積木順序和來源，或預覽在不同裝置上的展示效果。</p>
            </div>
            <div style={{ display: "flex", gap: 5, background: "var(--surface-2)", padding: 5, borderRadius: 13, flexShrink: 0 }}>
              {([["edit","編輯積木"],["preview","全螢幕預覽"]] as [TplMode,string][]).map(([t,l]) => (
                <button key={t} type="button" onClick={() => setTplMode(t)}
                  style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: "8px 14px", borderRadius: 9, border: "none", cursor: "pointer", background: tplMode === t ? "var(--surface)" : "transparent", color: tplMode === t ? "var(--text)" : "var(--text-dim)", boxShadow: tplMode === t ? "0 1px 5px rgba(0,0,0,.09)" : "none", transition: "all .15s" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {tplMode === "edit" && renderTplEdit()}

          {tplMode === "preview" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "var(--s4)", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", padding: 4, borderRadius: 11 }}>
                  {(["desktop","tablet","mobile"] as Device[]).map(d => {
                    const lbl: Record<Device,string> = { desktop:"電腦", tablet:"平板", mobile:"手機" }
                    return (
                      <button key={d} type="button"
                        style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "6px 11px", borderRadius: 8, border: "none", cursor: "pointer", background: device === d ? "var(--surface)" : "transparent", color: device === d ? "var(--text)" : "var(--text-dim)", transition: "all .15s" }}
                        onClick={() => setDevice(d)}>{lbl[d]}</button>
                    )
                  })}
                </div>
                <button type="button"
                  style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--accent)", border: "none", borderRadius: 11, padding: "9px 16px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, boxShadow: "0 6px 18px rgba(60,50,40,.18)", marginLeft: "auto" }}
                  onClick={() => fullscreenRef.current?.requestFullscreen?.()}>▶ 全螢幕展示</button>
              </div>
              <div ref={fullscreenRef} style={{ display: "flex", justifyContent: "center", background: "var(--surface-2)", borderRadius: 20, padding: "var(--s6)", minHeight: 400 }}>
                <div style={{ width: device === "desktop" ? "100%" : device === "tablet" ? 768 : 390, maxWidth: "100%", background: "#fff", borderRadius: device === "mobile" ? 30 : 16, overflow: "hidden", boxShadow: "0 12px 36px rgba(40,32,26,.2)", border: device !== "desktop" ? "8px solid #222" : "1px solid var(--border)" }}>
                  <TemplateCanvas character={liveCanvasChar} template={liveTemplate as any} design={liveDesign as any} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
