import { useRef, useState, type CSSProperties, type ReactNode } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldType = 'text' | 'longtext' | 'tags' | 'check' | 'avoid' | 'attr' | 'object'
export interface Field { id: string; label: string; type: FieldType | string; value: string }
export type SectionGroup = 'text' | 'image'
export interface Section { id: string; title: string; group?: SectionGroup; fields: Field[] }
export type AnnotationKind = 'pin' | 'rect'
export interface Annotation { id: string; kind?: AnnotationKind | string; x: number; y: number; w?: number; h?: number; label?: string; note?: string }
export interface AlbumImage { id: string; url: string; caption?: string; annotations?: Annotation[] }
export type AlbumKind = 'gallery' | 'ref'
export interface Album { id: string; name: string; kind?: AlbumKind; linkRef?: string; images: AlbumImage[] }
export interface Swatch { id: string; label: string; hex: string }
export type BlockType =
  | 'heading' | 'tagline' | 'avatar' | 'cover' | 'section' | 'palette'
  | 'album' | 'badges' | 'popup' | 'text' | 'marquee' | 'button'
  | 'columns' | 'divider' | 'spacer' | 'pagebreak' | 'nav'
export interface BlockStyle {
  align?: 'left' | 'center' | 'right'
  padding?: number
  opacity?: number
  radius?: number
  bgColor?: string
  textColor?: string
  custom?: boolean
  borderColor?: string
  borderWidth?: number
  borderStyle?: string
  width?: 'full' | 'half' | 'third'
  fullBleed?: boolean
  fx?: string
  [k: string]: unknown
}
export interface Tag { id: string; label: string; color: string }
export interface Block {
  id: string
  type: BlockType | string
  style?: BlockStyle
  sourceId?: string
  size?: string
  text?: string
  title?: string
  body?: string
  popupImg?: string
  trigger?: string
  hideTitle?: boolean
  titleOverride?: string
  speed?: number
  tags?: Tag[]
  tagStyle?: string
  mode?: string
  ratio?: string
  cols?: number
  pvar?: string
  variant?: string
  widths?: number[]
  valign?: string
  children?: Block[][]
  [k: string]: unknown
}
export interface Design {
  bg?: string
  bgImage?: string
  bgImageTablet?: string
  bgImagePhone?: string
  bgRepeat?: string
  bgSize?: string
  bgAttach?: string
  maskBright?: number
  maskBlur?: number
  maskSat?: number
  primary?: string
  font?: string
  fontImport?: string
  align?: 'left' | 'center' | 'right'
  width?: 'narrow' | 'normal' | 'wide'
  library?: string[]
  pageFit?: string
  autoNav?: boolean
}
export interface Template { id?: string; name?: string; design?: Design; blocks: Block[] }
export interface Character {
  name: string
  nickname?: string
  tagline?: string
  avatarUrl?: string
  mainVisualUrl?: string
  palette?: Swatch[]
  sections?: Section[]
  albums?: Album[]
}

// ─── Backward-compat Canvas* aliases ─────────────────────────────────────────
export type CanvasCharacter = Character
export type CanvasBlock = Block
export type CanvasTemplate = Template
export type CanvasDesign = Design
export type CanvasSection = Section
export type CanvasSwatch = Swatch
export type CanvasAlbum = Album
export type CanvasAnnotation = Annotation

// ─── TemplateCanvas ───────────────────────────────────────────────────────────

const W_MAP: Record<string, string> = { full: '100%', half: 'calc(50% - 6px)', third: 'calc(33.333% - 8px)' }
const FONT_FAMILY: Record<string, string> = {
  'noto-serif': "'Noto Serif TC',serif",
  'noto-sans': "'Noto Sans TC',sans-serif",
  wenkai: "'LXGW WenKai TC','Noto Serif TC',serif",
  goround: "'Chiron GoRound TC','Noto Sans TC',sans-serif",
  newsreader: "'Newsreader',serif",
  outfit: "'Outfit','Noto Sans TC',sans-serif",
}
const HEAD_SIZE: Record<string, string> = { sm: '26px', md: '32px', lg: '40px', xl: '50px' }
const TAG_SIZE: Record<string, string> = { sm: '16px', md: '19px', lg: '23px', xl: '28px' }
const TEXT_SIZE: Record<string, string> = { sm: '14px', md: '15.5px', lg: '18px', xl: '22px' }
const RATIO: Record<string, string> = { square: '1 / 1', portrait: '3 / 4', landscape: '4 / 3', wide: '16 / 9' }
const COVERRATIO: Record<string, string> = { banner: '21 / 9', wide: '16 / 9', standard: '4 / 3', square: '1 / 1' }
const WIDTHS: Record<string, number> = { narrow: 560, normal: 780, wide: 980 }

const str = (x: unknown): string => (x == null ? '' : String(x)).trim()
const splitList = (s: unknown): string[] =>
  str(s)
    .split(/[、,，\n;；]/)
    .map((x) => x.trim())
    .filter(Boolean)

function hexToRgba(hex?: string, op?: number): string {
  if (!hex || hex === 'transparent') return 'transparent'
  if (hex[0] !== '#') return hex
  let h = hex.slice(1)
  if (h.length === 3) h = h.split('').map((x) => x + x).join('')
  const n = parseInt(h, 16)
  const a = (op == null ? 100 : op) / 100
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
function lum(hex?: string): number {
  if (!hex || hex[0] !== '#') return 255
  let h = hex.slice(1)
  if (h.length === 3) h = h.split('').map((x) => x + x).join('')
  const n = parseInt(h, 16)
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)
}

const ensured = new Set<string>()
function ensureFont(name?: string) {
  if (!name) return
  const id = 'octool-font-' + name.replace(/[^a-z0-9]/gi, '')
  if (ensured.has(id) || typeof document === 'undefined' || document.getElementById(id)) return
  ensured.add(id)
  const l = document.createElement('link')
  l.id = id
  l.rel = 'stylesheet'
  l.href =
    'https://fonts.googleapis.com/css2?family=' +
    encodeURIComponent(name.trim()).replace(/%20/g, '+') +
    ':wght@400;500;700&display=swap'
  document.head.appendChild(l)
}

interface LbImg {
  url: string
  caption: string
  annotations: Annotation[]
}

export interface CanvasProps {
  character: Character
  template: { design?: Design; blocks: Block[] } | null
  design?: Design
  annotateMode?: 'list' | 'tooltip'
  viewport?: 'desktop' | 'tablet' | 'phone'
  pageView?: number | 'all' | null
  editable?: boolean
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  onReorder?: (fromId: string, toId: string, pos: 'before' | 'after') => void
  onDropToColumn?: (fromId: string, colId: string, ci: number) => void
  onColResize?: (colId: string, i: number, a: number, b: number) => void
  onNavTo?: (page: number) => void
}

export function TemplateCanvas(props: CanvasProps) {
  const {
    character: c,
    template: tplProp,
    annotateMode,
    viewport = 'desktop',
    pageView,
    editable = false,
    selectedId = null,
    onSelect,
    onReorder,
    onDropToColumn,
    onColResize,
    onNavTo,
  } = props

  const tpl = tplProp || { blocks: [] }
  const design: Design = props.design || tpl.design || {}
  const isTooltip = annotateMode === 'tooltip'
  const stack = viewport === 'phone'

  const [openAnn, setOpenAnn] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [overPos, setOverPos] = useState<'before' | 'after'>('before')
  const [lightbox, setLightbox] = useState<{ imgs: LbImg[]; i: number } | null>(null)
  const [carIdx, setCarIdx] = useState<Record<string, number>>({})
  const [popupId, setPopupId] = useState<string | null>(null)
  const drag = useRef<{ colId: string; i: number; startX: number; rowW: number; wA: number; wB: number } | null>(null)

  const sections = Array.isArray(c.sections) ? c.sections : []
  const albums = Array.isArray(c.albums) ? c.albums : []
  const palette = (Array.isArray(c.palette) ? c.palette : []).filter((p) => p && str(p.hex))
  const findSection = (id?: string) => sections.find((s) => s.id === id) || sections[0]
  const findAlbum = (id?: string) => albums.find((a) => a.id === id) || albums[0]
  const monogram = str(c.name).charAt(0) || '?'
  const gAlign = design.align

  const setCar = (bid: string, i: number) => setCarIdx((m) => ({ ...m, [bid]: i }))
  const openLightbox = (imgs: LbImg[], i: number) => {
    setLightbox({ imgs, i })
    setOpenAnn(null)
  }

  // ---- annotation markers ----
  function markerStyleFor(an: Annotation, interactive: boolean): CSSProperties {
    return an.kind !== 'rect'
      ? {
          position: 'absolute',
          left: `${an.x * 100}%`,
          top: `${an.y * 100}%`,
          width: 24,
          height: 24,
          transform: 'translate(-50%,-50%)',
          cursor: interactive ? 'pointer' : 'default',
          zIndex: 4,
        }
      : {
          position: 'absolute',
          left: `${an.x * 100}%`,
          top: `${an.y * 100}%`,
          width: `${(an.w || 0.1) * 100}%`,
          height: `${(an.h || 0.1) * 100}%`,
          cursor: interactive ? 'pointer' : 'default',
          zIndex: 3,
        }
  }
  function MarkerInner({ an, idx }: { an: Annotation; idx: number }) {
    if (an.kind !== 'rect')
      return (
        <span
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'var(--accent,#c98a5e)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 800,
            border: '2px solid #fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {idx + 1}
        </span>
      )
    return (
      <>
        <span
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            border: '2px solid var(--accent,#c98a5e)',
            borderRadius: 6,
            background: 'rgba(201,138,94,0.14)',
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: -9,
            top: -9,
            width: 19,
            height: 19,
            borderRadius: '50%',
            background: 'var(--accent,#c98a5e)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 800,
            border: '2px solid #fff',
          }}
        >
          {idx + 1}
        </span>
      </>
    )
  }

  // ---- album ----
  function AlbumImages({ al, b }: { al: Album | undefined; b: Block }) {
    const cols = b.cols || 3
    const mode = b.mode || 'grid'
    const ratioKey = b.ratio || 'square'
    const uniform = ratioKey !== ('natural' as string)
    if (!al) return <div style={{ color: 'var(--text-2,#8d7c69)', fontSize: 13 }}>（未綁定相簿）</div>
    const imgs = (al.images || []).filter((im) => im && str(im.url))
    if (!imgs.length)
      return (
        <div style={{ border: '1.5px dashed var(--border,#d8c9b3)', borderRadius: 14, padding: 26, textAlign: 'center', color: 'var(--text-2,#8d7c69)', fontSize: 13 }}>
          {(str(al.name) || '相簿') + '：尚無圖片'}
        </div>
      )
    const lbData: LbImg[] = imgs.map((im) => ({ url: im.url, caption: str(im.caption), annotations: im.annotations || [] }))

    const tile = (im: AlbumImage, ii: number) => {
      const anns = im.annotations || []
      const markers = anns.map((an, idx) => {
        const key = im.id + ':' + an.id
        const open = isTooltip && openAnn === key
        const onClick = isTooltip
          ? (e: React.MouseEvent) => {
              e.stopPropagation()
              setOpenAnn(openAnn === key ? null : key)
            }
          : undefined
        return (
          <div key={an.id} style={markerStyleFor(an, isTooltip)} onClick={onClick}>
            <MarkerInner an={an} idx={idx} />
            {open ? (
              <div
                style={{
                  position: 'absolute',
                  top: '112%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  minWidth: 130,
                  maxWidth: 190,
                  background: '#3a2f27',
                  color: '#fff',
                  padding: '8px 11px',
                  borderRadius: 10,
                  fontSize: 12,
                  lineHeight: 1.5,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  zIndex: 10,
                }}
              >
                <b>{str(an.label) || '標記 ' + (idx + 1)}</b>
                <br />
                {str(an.note)}
              </div>
            ) : null}
          </div>
        )
      })
      const list =
        !isTooltip && anns.length ? (
          <ol style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {anns.map((an, idx) => (
              <li key={an.id} style={{ display: 'flex', gap: 7, alignItems: 'baseline', fontSize: 12.5, color: 'inherit' }}>
                <span style={{ flexShrink: 0, width: 17, height: 17, borderRadius: '50%', background: 'var(--accent,#c98a5e)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                  {idx + 1}
                </span>
                <span>
                  <b>{str(an.label) || '標記 ' + (idx + 1)}</b>
                  {str(an.note) ? <span style={{ color: 'var(--text-2,#8d7c69)' }}> — {str(an.note)}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        ) : null
      const frameStyle: CSSProperties = {
        position: 'relative',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid var(--border,#e6dccb)',
        cursor: editable ? 'inherit' : 'zoom-in',
      }
      if (uniform) frameStyle.aspectRatio = RATIO[ratioKey] || '1 / 1'
      const imgStyle: CSSProperties = uniform
        ? { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
        : { width: '100%', display: 'block' }
      return (
        <figure key={im.id} style={{ margin: 0, width: '100%' }}>
          <div
            onClick={editable ? undefined : (e) => { e.stopPropagation(); openLightbox(lbData, ii) }}
            style={frameStyle}
          >
            <img src={im.url} alt="" draggable={false} style={imgStyle} />
            {markers}
          </div>
          {str(im.caption) ? (
            <figcaption style={{ fontSize: 12, color: 'var(--text-2,#8d7c69)', marginTop: 6 }}>{str(im.caption)}</figcaption>
          ) : null}
          {list}
        </figure>
      )
    }

    if (mode === 'carousel') {
      const n = imgs.length
      const idx = Math.min(carIdx[b.id] || 0, n - 1)
      const go = (d: number) => (e: React.MouseEvent) => {
        e.stopPropagation()
        setCar(b.id, (idx + d + n) % n)
      }
      const navBtn = (dir: number) => (
        <button
          onClick={go(dir)}
          style={{
            position: 'absolute',
            top: '50%',
            [dir < 0 ? 'left' : 'right']: 10,
            transform: 'translateY(-50%)',
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(20,16,13,0.5)',
            color: '#fff',
            cursor: 'pointer',
            display: n > 1 ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
          } as CSSProperties}
        >
          {dir < 0 ? '‹' : '›'}
        </button>
      )
      return (
        <div>
          <div style={{ position: 'relative' }}>
            {tile(imgs[idx], idx)}
            {navBtn(-1)}
            {navBtn(1)}
          </div>
          <div style={{ display: n > 1 ? 'flex' : 'none', gap: 7, justifyContent: 'center', marginTop: 12 }}>
            {imgs.map((im, di) => (
              <button
                key={im.id}
                onClick={(e) => { e.stopPropagation(); setCar(b.id, di) }}
                style={{
                  width: di === idx ? 22 : 8,
                  height: 8,
                  borderRadius: 999,
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  background: di === idx ? 'var(--accent,#c98a5e)' : 'var(--border,#d8c9b3)',
                  transition: 'all .2s',
                }}
              />
            ))}
          </div>
        </div>
      )
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 14, alignItems: 'start' }}>
        {imgs.map((im, ii) => tile(im, ii))}
      </div>
    )
  }

  // ---- section field ----
  function fieldEl(f: Field, _sec: Section, cards: boolean): ReactNode {
    const label = str(f.label) || '欄位'
    const val = str(f.value)
    if (!val) return null
    const box: CSSProperties = cards
      ? { background: 'var(--bg-3,#f1ece3)', borderRadius: 12, padding: '12px 14px' }
      : { marginBottom: 14 }
    const h3 = (color = 'var(--text-2,#8d7c69)') => (
      <h3 style={{ fontSize: 13, fontWeight: 700, color, margin: '0 0 6px' }}>{label}</h3>
    )
    if (f.type === 'longtext')
      return (
        <div key={f.id} style={box}>
          {h3()}
          <p style={{ fontSize: 15.5, lineHeight: 1.8, margin: 0, color: 'inherit', whiteSpace: 'pre-wrap' }}>{val}</p>
        </div>
      )
    if (f.type === 'tags')
      return (
        <div key={f.id} style={box}>
          {h3()}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {splitList(val).map((t, i) => (
              <span key={i} style={{ fontSize: 13, background: cards ? 'var(--bg-2,#fff)' : 'var(--bg-3,#ede2d0)', color: 'var(--text,#4a3f35)', padding: '5px 12px', borderRadius: 999 }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )
    if (f.type === 'attr') {
      const rows = val
        .split(/\n+/)
        .map((ln) => {
          const m = ln.split(/[:：=]/)
          return [(m[0] || '').trim(), (m.slice(1).join('：') || '').trim()]
        })
        .filter((r) => r[0] || r[1])
      if (!rows.length) return null
      return (
        <div key={f.id} style={box}>
          {h3()}
          <div>
            {rows.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline', borderBottom: '1px dashed var(--border,#e6dccb)', padding: '7px 0' }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-2,#8d7c69)' }}>{r[0]}</span>
                <span style={{ fontSize: 14.5, color: 'inherit', textAlign: 'right' }}>{r[1]}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    if (f.type === 'object') {
      const items = val
        .split(/\n+/)
        .map((ln) => ln.split('|').map((x) => x.trim()))
        .filter((p) => p[0] || p[1])
      if (!items.length) return null
      return (
        <div key={f.id} style={box}>
          {h3()}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
            {items.map((p, i) => (
              <div key={i} style={{ background: cards ? 'var(--bg-2,#fff)' : 'var(--bg-3,#ede2d0)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border,#e6dccb)' }}>
                <div style={{ aspectRatio: '1 / 1', background: 'linear-gradient(135deg,var(--accent-soft,#f1ddc7),var(--bg-3,#ede2d0))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p[1] ? <img src={p[1]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20, opacity: 0.4 }}>❀</span>}
                </div>
                <div style={{ padding: '9px 11px' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'inherit' }}>{p[0] || '物件'}</div>
                  {p[2] ? <div style={{ fontSize: 12, color: 'var(--text-2,#8d7c69)', marginTop: 3, lineHeight: 1.5 }}>{p[2]}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
    if (f.type === 'check' || f.type === 'avoid') {
      const ok = f.type === 'check'
      const mk = ok ? '✓' : '✕'
      const col = ok ? '#1f8a5b' : '#c0584f'
      const bg = ok ? 'rgba(31,138,91,0.10)' : 'rgba(192,88,79,0.10)'
      return (
        <div key={f.id} style={box}>
          {h3(col)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {splitList(val).map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14.5, lineHeight: 1.5, color: 'inherit', background: bg, borderRadius: 8, padding: '6px 10px' }}>
                <span style={{ color: col, fontWeight: 800, flexShrink: 0 }}>{mk}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    // text
    return (
      <div
        key={f.id}
        style={cards ? box : { display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline', borderBottom: '1px dashed var(--border,#e6dccb)', padding: '8px 0' }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2,#8d7c69)', display: 'block' }}>{label}</span>
        <span style={{ fontSize: 15, color: 'inherit', textAlign: cards ? 'left' : 'right', display: 'block', marginTop: cards ? 4 : 0 }}>{val}</span>
      </div>
    )
  }

  // ---- block content ----
  function buildContent(b: Block): ReactNode {
    const st = b.style || {}
    const sz = b.size || 'md'
    switch (b.type) {
      case 'heading':
        return (
          <h1 style={{ fontFamily: "var(--head-font,'Newsreader',serif)", fontWeight: 600, fontSize: HEAD_SIZE[sz] || HEAD_SIZE.md, margin: 0, lineHeight: 1.1, color: 'inherit' }}>
            {str(c.name) || '未命名角色'}
          </h1>
        )
      case 'tagline':
        return str(c.tagline) ? (
          <p style={{ fontFamily: "var(--head-font,'Newsreader',serif)", fontStyle: 'italic', fontSize: TAG_SIZE[sz] || TAG_SIZE.md, margin: 0, color: 'inherit', lineHeight: 1.5 }}>
            {'「' + str(c.tagline) + '」'}
          </p>
        ) : (
          <p style={{ color: 'var(--text-2,#8d7c69)', margin: 0, fontStyle: 'italic' }}>（尚無一句話介紹）</p>
        )
      case 'avatar': {
        const clickable = !editable && str(c.avatarUrl)
        const d = b.size === 'sm' ? 76 : b.size === 'lg' ? 140 : b.size === ('xl' as string) ? 180 : 108
        return str(c.avatarUrl) ? (
          <img
            src={c.avatarUrl}
            alt=""
            draggable={false}
            onClick={clickable ? (e) => { e.stopPropagation(); openLightbox([{ url: c.avatarUrl!, caption: '', annotations: [] }], 0) } : undefined}
            style={{ width: d, height: d, borderRadius: '50%', objectFit: 'cover', display: 'inline-block', border: '3px solid var(--bg-2,#fffdf8)', boxShadow: '0 8px 24px rgba(60,50,40,0.16)', cursor: clickable ? 'zoom-in' : 'inherit' }}
          />
        ) : (
          <span style={{ width: d, height: d, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,var(--accent-soft,#f1ddc7),var(--bg-3,#ede2d0))', fontFamily: "var(--head-font,'Newsreader',serif)", fontSize: d * 0.4, color: 'var(--accent,#c98a5e)' }}>
            {monogram}
          </span>
        )
      }
      case 'cover': {
        const clickable = !editable && str(c.mainVisualUrl)
        const al = st.align || gAlign || 'left'
        const wmap: Record<string, string> = { sm: '55%', md: '78%', lg: '92%', xl: '100%' }
        const w = wmap[b.size || 'md'] || '78%'
        const mx = al === 'center' ? '0 auto' : al === 'right' ? '0 0 0 auto' : '0'
        const rk = b.ratio || 'natural'
        const iStyle: CSSProperties = { width: w, margin: mx, borderRadius: (st.radius || 14), display: 'block', cursor: clickable ? 'zoom-in' : 'inherit' }
        if (rk !== ('natural' as string)) {
          iStyle.aspectRatio = COVERRATIO[rk] || '16 / 9'
          iStyle.objectFit = 'cover'
        } else {
          iStyle.maxHeight = ({ sm: 200, md: 380, lg: 500, xl: 640 } as Record<string, number>)[b.size || 'md'] + 'px'
          iStyle.objectFit = 'cover'
        }
        return str(c.mainVisualUrl) ? (
          <img src={c.mainVisualUrl} alt="" draggable={false} onClick={clickable ? (e) => { e.stopPropagation(); openLightbox([{ url: c.mainVisualUrl!, caption: '', annotations: [] }], 0) } : undefined} style={iStyle} />
        ) : (
          <div style={{ width: w, margin: mx, aspectRatio: rk !== ('natural' as string) ? COVERRATIO[rk] || '16 / 9' : '16 / 9', borderRadius: st.radius || 14, background: 'linear-gradient(135deg,var(--accent-soft,#f1ddc7),var(--bg-3,#ede2d0))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2,#8d7c69)', fontSize: 13 }}>
            尚未設定主視覺
          </div>
        )
      }
      case 'section': {
        const sec = findSection(b.sourceId)
        if (!sec) return <div style={{ color: 'var(--text-2,#8d7c69)', fontSize: 13 }}>（未綁定區塊）</div>
        const cards = b.variant === 'cards'
        const body = (sec.fields || []).map((f) => fieldEl(f, sec, cards)).filter(Boolean)
        const ttl = b.hideTitle ? null : (
          <h2 style={{ fontFamily: "var(--head-font,'Newsreader',serif)", fontWeight: 600, fontSize: 21, margin: '0 0 14px', color: 'inherit' }}>
            {str(b.titleOverride) || str(sec.title) || '區塊'}
          </h2>
        )
        return (
          <div>
            {ttl}
            {cards ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>{body}</div> : <div>{body}</div>}
          </div>
        )
      }
      case 'palette': {
        if (!palette.length) return <div style={{ color: 'var(--text-2,#8d7c69)', fontSize: 13 }}>（尚無配色）</div>
        const pv = b.pvar || 'swatch'
        const pjc = st.align === 'center' ? 'center' : st.align === 'right' ? 'flex-end' : 'flex-start'
        if (pv === ('bar' as string))
          return (
            <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', height: 46, border: '1px solid rgba(0,0,0,0.08)' }}>
              {palette.map((sw) => (
                <div key={sw.id} title={sw.label} style={{ flex: 1, background: sw.hex }} />
              ))}
            </div>
          )
        if (pv === 'dots')
          return (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: pjc }}>
              {palette.map((sw) => (
                <span key={sw.id} title={sw.label + ' ' + sw.hex} style={{ width: 30, height: 30, borderRadius: '50%', background: sw.hex, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 6px rgba(60,50,40,0.12)' }} />
              ))}
            </div>
          )
        return (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: pjc }}>
            {palette.map((sw) => (
              <div key={sw.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, display: 'block', background: sw.hex, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 3px 10px rgba(60,50,40,0.14)' }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'inherit' }}>{str(sw.label)}</span>
                <span style={{ fontSize: 10, color: 'var(--text-2,#8d7c69)' }}>{sw.hex}</span>
              </div>
            ))}
          </div>
        )
      }
      case 'album': {
        const al = findAlbum(b.sourceId)
        return (
          <div>
            {al ? (
              <h2 style={{ fontFamily: "var(--head-font,'Newsreader',serif)", fontWeight: 600, fontSize: 21, margin: '0 0 14px', color: 'inherit' }}>{str(al.name) || '相簿'}</h2>
            ) : null}
            <AlbumImages al={al} b={b} key={'al' + b.id} />
          </div>
        )
      }
      case 'badges': {
        const tags = (b.tags || []).filter((t) => str(t.label))
        if (!tags.length) return <div style={{ color: 'var(--text-2,#8d7c69)', fontSize: 13 }}>{editable ? '（在面板新增標籤）' : ''}</div>
        const jc = st.align === 'center' ? 'center' : st.align === 'right' ? 'flex-end' : 'flex-start'
        const outline = b.tagStyle === 'outline'
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: jc }}>
            {tags.map((t) => {
              const col = t.color || 'var(--accent,#c98a5e)'
              return (
                <span
                  key={t.id}
                  style={
                    outline
                      ? { fontSize: 13.5, fontWeight: 700, color: col, padding: '5px 13px', borderRadius: 999, border: '1.5px solid ' + col, background: 'transparent' }
                      : { fontSize: 13.5, fontWeight: 700, color: '#fff', padding: '6px 14px', borderRadius: 999, background: col, boxShadow: '0 2px 8px rgba(60,50,40,0.12)' }
                  }
                >
                  {str(t.label)}
                </span>
              )
            })}
          </div>
        )
      }
      case 'popup': {
        const trig = b.trigger || 'button'
        const onOpen = editable ? undefined : (e: React.MouseEvent) => { e.stopPropagation(); setPopupId(b.id) }
        if (trig === ('thumb' as string) && str(b.popupImg))
          return (
            <div onClick={onOpen} style={{ display: 'inline-block', cursor: editable ? 'inherit' : 'pointer', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border,#e6dccb)', maxWidth: 240, boxShadow: '0 6px 18px rgba(60,50,40,0.14)' }}>
              <img src={b.popupImg} alt="" draggable={false} style={{ width: '100%', display: 'block' }} />
              {str(b.text) ? <div style={{ fontSize: 13, fontWeight: 700, padding: '8px 12px', color: 'var(--text,#4a3f35)', background: 'var(--bg-2,#fffdf8)' }}>{str(b.text)}</div> : null}
            </div>
          )
        return (
          <button onClick={onOpen} style={{ fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#fff', background: 'var(--accent,#c98a5e)', border: 'none', borderRadius: 999, padding: '11px 24px', cursor: editable ? 'inherit' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {str(b.text) || '看更多'}
          </button>
        )
      }
      case 'text':
        return <p style={{ margin: 0, fontSize: TEXT_SIZE[sz] || TEXT_SIZE.md, lineHeight: 1.75, color: 'inherit', whiteSpace: 'pre-wrap' }}>{str(b.text) || (editable ? '（在面板輸入文字）' : '')}</p>
      case 'marquee': {
        const mtxt = str(b.text) || (editable ? '在面板輸入跑馬燈文字　★　' : '　★　')
        const spd = b.speed || 18
        const seg = (k: string) => (
          <span key={k} style={{ display: 'inline-block', padding: '0 40px', whiteSpace: 'nowrap' }}>
            {mtxt}
          </span>
        )
        return (
          <div style={{ width: '100%', overflow: 'hidden', whiteSpace: 'nowrap', background: st.bgColor ? hexToRgba(st.bgColor, st.opacity) : 'var(--accent-soft,#f1ddc7)', color: (st.textColor as string) || 'var(--accent,#b06a3c)', borderRadius: (st as { fullBleed?: boolean }).fullBleed ? 0 : (st.radius != null ? st.radius : 999), padding: '9px 0', fontWeight: 700, fontSize: 15 }}>
            <div style={{ display: 'inline-flex', whiteSpace: 'nowrap', animation: `oct-marquee ${spd}s linear infinite`, willChange: 'transform' }}>
              {seg('a')}
              {seg('b')}
            </div>
          </div>
        )
      }
      case 'divider': {
        const dc = (st.borderColor as string) || 'currentColor'
        const ds = st.borderStyle || 'solid'
        const dw = st.borderWidth || 1
        return <div style={{ width: '100%', borderTop: `${dw}px ${ds} ${dc}`, opacity: st.borderColor ? 1 : 0.3 }} />
      }
      case 'spacer':
        return <div style={{ height: 1 }} />
      case 'nav': {
        const tplb = Array.isArray(tpl.blocks) ? tpl.blocks : []
        const np = tplb.filter((x) => x.type === 'pagebreak').length + 1
        if (design.autoNav && np > 1)
          return editable ? (
            <div style={{ color: 'var(--text-2,#8d7c69)', fontSize: 12.5, fontStyle: 'italic', border: '1px dashed var(--border,#e7e0d4)', borderRadius: 10, padding: '10px 12px' }}>
              已改用「全域頁面導覽列」，這顆手動導覽積木展示時會自動隱藏（可刪除）
            </div>
          ) : (
            <div />
          )
        const jc = st.align === 'center' ? 'center' : st.align === 'right' ? 'flex-end' : 'flex-start'
        if (np <= 1)
          return editable ? <div style={{ color: 'var(--text-2,#8d7c69)', fontSize: 13 }}>導覽條：加入「分頁」積木後，這裡會列出各頁，公開時點了可跳頁</div> : <div />
        const items = []
        for (let i = 0; i < np; i++) {
          items.push(
            <button
              key={i}
              onClick={!editable && onNavTo ? (e) => { e.stopPropagation(); onNavTo(i) } : undefined}
              style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: 'var(--accent,#b06a3c)', background: 'var(--accent-soft,#f1ddc7)', border: 'none', borderRadius: 999, padding: '8px 16px', cursor: editable ? 'inherit' : 'pointer' }}
            >
              第 {i + 1} 頁
            </button>,
          )
        }
        return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: jc }}>{items}</div>
      }
      case 'pagebreak':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <div style={{ flex: 1, borderTop: '2px dashed var(--accent,#c98a5e)', opacity: 0.45 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent,#b06a3c)', background: 'var(--accent-soft,#f1ddc7)', borderRadius: 999, padding: '3px 12px', whiteSpace: 'nowrap' }}>⤓ 分頁</span>
            <div style={{ flex: 1, borderTop: '2px dashed var(--accent,#c98a5e)', opacity: 0.45 }} />
          </div>
        )
      case 'button': {
        const bw = st.borderWidth || 0
        return (
          <span style={{ display: 'inline-block', padding: '11px 24px', borderRadius: st.radius != null ? st.radius : 999, background: st.bgColor ? hexToRgba(st.bgColor, st.opacity) : 'var(--accent,#c98a5e)', color: (st.textColor as string) || '#fff', fontWeight: 700, fontSize: 15, border: bw ? `${bw}px ${st.borderStyle || 'solid'} ${st.borderColor || 'var(--border)'}` : 'none' }}>
            {str(b.text) || '按鈕'}
          </span>
        )
      }
      case 'columns': {
        const cols = b.children || []
        const va = b.valign === 'center' ? 'center' : b.valign === 'end' ? 'flex-end' : 'flex-start'
        const kids: ReactNode[] = []
        cols.forEach((col, ci) => {
          const w = (b.widths && b.widths[ci]) || Math.round(100 / (cols.length || 1))
          const colStyle: CSSProperties = editable
            ? { flex: `${w} 1 0`, minWidth: 120, borderRadius: 12, border: '1.5px dashed var(--border,#e6dccb)', padding: 8, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 64, background: 'rgba(0,0,0,0.015)' }
            : stack
              ? { flexBasis: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }
              : { flexBasis: `calc(${w}% - 7px)`, flexGrow: 0, flexShrink: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 10 }
          kids.push(
            <div
              key={'c' + ci}
              style={colStyle}
              onDragOver={editable ? (e) => e.preventDefault() : undefined}
              onDrop={
                editable
                  ? (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const from = dragId
                      setDragId(null)
                      setOverId(null)
                      if (from && onDropToColumn) onDropToColumn(from, b.id, ci)
                    }
                  : undefined
              }
            >
              {col.length ? col.map((cb) => BlockEl({ b: cb, nested: true })) : editable ? <div style={{ textAlign: 'center', color: 'var(--text-2,#8d7c69)', fontSize: 12, padding: '18px 4px' }}>此欄為空</div> : <div />}
            </div>,
          )
          if (editable && ci < cols.length - 1)
            kids.push(
              <div
                key={'d' + ci}
                title="拖曳調整欄寬"
                onPointerDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const row = (e.currentTarget.parentElement as HTMLElement) || null
                  const rw = row ? row.getBoundingClientRect().width : 1
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId)
                  } catch {
                    /* noop */
                  }
                  drag.current = { colId: b.id, i: ci, startX: e.clientX, rowW: rw, wA: (b.widths || [])[ci] || 50, wB: (b.widths || [])[ci + 1] || 50 }
                }}
                onPointerMove={(e) => {
                  const d = drag.current
                  if (!d) return
                  const dp = ((e.clientX - d.startX) / d.rowW) * 100
                  let a = Math.round(d.wA + dp)
                  let bb = Math.round(d.wB - dp)
                  if (a < 15) {
                    bb -= 15 - a
                    a = 15
                  }
                  if (bb < 15) {
                    a -= 15 - bb
                    bb = 15
                  }
                  if (onColResize) onColResize(d.colId, d.i, a, bb)
                }}
                onPointerUp={() => {
                  drag.current = null
                }}
                style={{ flex: '0 0 8px', alignSelf: 'stretch', cursor: 'col-resize', borderRadius: 4, background: 'var(--border,#e6dccb)', minHeight: 40, touchAction: 'none' }}
              />,
            )
        })
        return (
          <div style={{ display: 'flex', flexDirection: !editable && stack ? 'column' : 'row', flexWrap: editable ? 'nowrap' : 'wrap', gap: editable ? 6 : 14, width: '100%', alignItems: !editable && stack ? 'stretch' : va }}>
            {kids}
          </div>
        )
      }
      default:
        return <div />
    }
  }

  const styledTypes: Record<string, number> = { heading: 1, tagline: 1, section: 1, palette: 1, album: 1, text: 1, avatar: 1, cover: 1 }

  // ---- a single block wrapper (used both top-level and nested) ----
  function BlockEl({ b, nested = false }: { b: Block; nested?: boolean }): ReactNode {
    const st = b.style || {}
    const useCustom = styledTypes[b.type] && st.custom
    const bw = st.borderWidth || 0
    const wrap: CSSProperties = {
      position: 'relative',
      boxSizing: 'border-box',
      width: nested ? '100%' : W_MAP[(st as { width?: string }).width || 'full'] || '100%',
      textAlign: st.align || gAlign || 'left',
      padding: (st.padding != null ? st.padding : b.type === 'spacer' ? 18 : 14),
      cursor: editable ? 'pointer' : 'default',
      transition: 'outline .12s ease',
    }
    if (b.type === 'spacer') wrap.minHeight = st.padding != null ? st.padding : 36
    if (useCustom) {
      wrap.background = st.bgColor ? hexToRgba(st.bgColor, st.opacity) : 'transparent'
      wrap.color = (st.textColor as string) || 'var(--text,#4a3f35)'
      wrap.border = bw ? `${bw}px ${st.borderStyle || 'solid'} ${st.borderColor || 'var(--border,#e6dccb)'}` : 'none'
      wrap.borderRadius = st.radius || 0
    }
    const fx = (st as { fx?: string }).fx
    if (fx === 'soft') wrap.boxShadow = '0 6px 18px rgba(40,32,26,0.12)'
    else if (fx === 'float') {
      wrap.boxShadow = '0 18px 40px -10px rgba(40,32,26,0.30)'
      if (!wrap.borderRadius) wrap.borderRadius = 16
    } else if (fx === 'glow') wrap.boxShadow = '0 0 22px -2px var(--accent,#c98a5e)'
    else if (fx === 'glass') {
      wrap.background = 'rgba(255,255,255,0.12)'
      wrap.backdropFilter = 'blur(8px)'
      ;(wrap as { WebkitBackdropFilter?: string }).WebkitBackdropFilter = 'blur(8px)'
      wrap.border = '1px solid rgba(255,255,255,0.22)'
      wrap.boxShadow = '0 8px 30px rgba(0,0,0,0.12)'
      if (!wrap.borderRadius) wrap.borderRadius = 16
    }
    const selected = editable && selectedId === b.id
    if (selected) {
      wrap.outline = '2px solid var(--accent,#c98a5e)'
      wrap.outlineOffset = 2
    }
    if (editable && dragId && dragId !== b.id && overId === b.id) {
      wrap.boxShadow = (overPos === 'before' ? '0 -3px' : '0 3px') + ' 0 -0.5px var(--accent,#c98a5e)'
    }
    if (editable && dragId === b.id) wrap.opacity = 0.4
    if (editable) wrap.paddingLeft = (st.padding != null ? st.padding : 14) + 28
    if (!nested && (st as { width?: string }).width && (st as { width?: string }).width !== 'full') {
      const al = st.align || gAlign || 'left'
      if (al === 'center') {
        wrap.marginLeft = 'auto'
        wrap.marginRight = 'auto'
      } else if (al === 'right') wrap.marginLeft = 'auto'
    }
    if (!nested && (st as { fullBleed?: boolean }).fullBleed) {
      wrap.width = '100vw'
      wrap.maxWidth = '100vw'
      wrap.marginLeft = 'calc(50% - 50vw)'
      wrap.marginRight = 'calc(50% - 50vw)'
      wrap.padding = 0
      wrap.borderRadius = 0
    }
    const handle = editable ? (
      <div
        title="拖曳排序"
        style={{ position: 'absolute', top: '50%', left: 4, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 28, color: '#fff', background: selected ? 'var(--accent,#c98a5e)' : 'rgba(140,124,105,0.55)', borderRadius: 7, cursor: 'grab', zIndex: 6, pointerEvents: 'none', fontSize: 11, letterSpacing: -1 }}
      >
        ⠿
      </div>
    ) : null
    return (
      <div
        key={b.id}
        style={wrap}
        data-bid={b.id}
        draggable={editable}
        onClick={editable ? (e) => { e.stopPropagation(); onSelect?.(b.id) } : undefined}
        onDragStart={
          editable
            ? (e) => {
                e.stopPropagation()
                try {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', b.id)
                } catch {
                  /* noop */
                }
                const id = b.id
                setTimeout(() => setDragId(id), 0)
              }
            : undefined
        }
        onDragEnd={editable ? () => { setDragId(null); setOverId(null) } : undefined}
        onDragOver={
          editable
            ? (e) => {
                e.preventDefault()
                e.stopPropagation()
                const r = e.currentTarget.getBoundingClientRect()
                const pos = e.clientY - r.top < r.height / 2 ? 'before' : 'after'
                if (overId !== b.id || overPos !== pos) {
                  setOverId(b.id)
                  setOverPos(pos)
                }
              }
            : undefined
        }
        onDrop={
          editable
            ? (e) => {
                e.preventDefault()
                e.stopPropagation()
                const from = dragId
                const pos = overPos
                setDragId(null)
                setOverId(null)
                if (from && from !== b.id && onReorder) onReorder(from, b.id, pos)
              }
            : undefined
        }
      >
        {handle}
        {buildContent(b)}
      </div>
    )
  }

  // ---- page splitting ----
  const blocksSrc0 = Array.isArray(tpl.blocks) ? tpl.blocks : []
  let blocksSrc = blocksSrc0
  if (pageView != null && pageView !== 'all' && (pageView as unknown) !== '') {
    const pages: Block[][] = []
    let cur: Block[] = []
    blocksSrc0.forEach((b) => {
      if (b.type === 'pagebreak') {
        pages.push(cur)
        cur = []
      } else cur.push(b)
    })
    pages.push(cur)
    blocksSrc = pages[Number(pageView)] || []
  }

  // ---- page design / vars ----
  const dbg = design.bg || '#ffffff'
  const dprimary = design.primary || '#c98a5e'
  ensureFont(design.fontImport)
  const fam = design.fontImport && str(design.fontImport) ? `'${str(design.fontImport)}',sans-serif` : FONT_FAMILY[design.font || 'noto-serif'] || FONT_FAMILY['noto-serif']
  const dmaxw = WIDTHS[design.width || 'normal'] || WIDTHS.normal
  const dark = lum(dbg) < 140 && !design.bgImage
  const vars: Record<string, string> = {
    '--accent': dprimary,
    '--accent-soft': hexToRgba(dprimary, 16),
    '--head-font': fam,
    '--text': dark ? '#f3ece1' : '#3a322c',
    '--text-2': dark ? '#c4b8a7' : '#8a7c6a',
    '--bg-2': dark ? 'rgba(255,255,255,0.06)' : '#ffffff',
    '--bg-3': dark ? 'rgba(255,255,255,0.12)' : '#f1ece3',
    '--border': dark ? 'rgba(255,255,255,0.18)' : '#e7e0d4',
  }
  const rootStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    minHeight: 340,
    background: dbg,
    color: 'var(--text)',
    fontFamily: fam,
    borderRadius: 14,
    transition: 'background .3s ease',
    ...(vars as CSSProperties),
  }
  const bgPick = str(viewport === 'phone' ? design.bgImagePhone || design.bgImage : viewport === 'tablet' ? design.bgImageTablet || design.bgImage : design.bgImage)
  const bgImageOn = !!bgPick
  const bgLayerStyle: CSSProperties | null = bgImageOn
    ? {
        position: 'absolute',
        inset: 0,
        backgroundImage: `url("${bgPick}")`,
        backgroundSize: design.bgSize || 'cover',
        backgroundRepeat: design.bgRepeat || 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: design.bgAttach || 'scroll',
        filter: `brightness(${(design.maskBright == null ? 100 : design.maskBright) / 100}) blur(${design.maskBlur || 0}px) saturate(${(design.maskSat == null ? 100 : design.maskSat) / 100})`,
        zIndex: 0,
        pointerEvents: 'none',
      }
    : null
  const vpCap = viewport === 'phone' ? 390 : viewport === 'tablet' ? 768 : dmaxw
  const effW = Math.min(dmaxw, vpCap)
  const contentStyle: CSSProperties = {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: effW,
    margin: '0 auto',
    padding: stack ? '24px 16px' : '30px 24px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  }

  // 固定一屏
  const singleP = pageView != null && pageView !== 'all' && (pageView as unknown) !== ''
  if (design.pageFit === 'fixed' && singleP) {
    const fh = viewport === 'phone' ? 844 : viewport === 'tablet' ? 1024 : typeof window !== 'undefined' ? window.innerHeight : 800
    rootStyle.minHeight = fh
    contentStyle.minHeight = fh
    contentStyle.justifyContent = 'center'
  }

  // ---- popup / lightbox state ----
  const findBlockById = (bs: Block[], id: string): Block | null => {
    for (const bb of bs || []) {
      if (bb.id === id) return bb
      if (bb.type === 'columns' && bb.children) {
        for (const col of bb.children) {
          const r = findBlockById(col, id)
          if (r) return r
        }
      }
    }
    return null
  }
  const pop = popupId ? findBlockById(blocksSrc0, popupId) : null
  const lb = lightbox && lightbox.imgs[lightbox.i] ? lightbox.imgs[lightbox.i] : null

  // ---- auto nav ----
  const np = blocksSrc0.filter((x) => x.type === 'pagebreak').length + 1
  const pageViewSingle = pageView != null && pageView !== 'all' && (pageView as unknown) !== ''
  const showAutoNav = !!design.autoNav && np > 1 && !pageViewSingle

  return (
    <>
      <style>{`@keyframes oct-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      <div style={rootStyle} onClick={editable && onSelect ? () => onSelect(null) : undefined}>
        {bgLayerStyle ? <div style={bgLayerStyle} /> : null}
        {showAutoNav ? (
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', padding: '12px 16px 2px' }}>
            {Array.from({ length: np }).map((_, i) => (
              <button
                key={i}
                onClick={!editable && onNavTo ? (e) => { e.stopPropagation(); onNavTo(i) } : undefined}
                style={{ fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: 'var(--accent,#b06a3c)', background: 'var(--accent-soft,#f1ddc7)', border: 'none', borderRadius: 999, padding: '7px 15px', cursor: editable ? 'default' : 'pointer' }}
              >
                第 {i + 1} 頁
              </button>
            ))}
          </div>
        ) : null}

        <div style={contentStyle}>
          {blocksSrc.map((b) => BlockEl({ b }))}
          {blocksSrc.length === 0 ? (
            <div style={{ width: '100%', border: '1.5px dashed var(--border,#d8c9b3)', borderRadius: 16, padding: 46, textAlign: 'center', color: 'var(--text-2,#8d7c69)', fontSize: 14 }}>
              {editable ? '從上方加入積木，開始設計這個模板' : '這個模板還沒有內容'}
            </div>
          ) : null}
        </div>

        {/* lightbox */}
        {lb ? (
          <div
            onClick={() => setLightbox(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(20,16,13,0.86)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          >
            <div style={{ position: 'relative', maxWidth: '92vw', maxHeight: '78vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
                <img src={lb.url} alt="" draggable={false} style={{ maxWidth: '92vw', maxHeight: '78vh', display: 'block', borderRadius: 12, boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }} />
                {(lb.annotations || []).map((an, idx) => (
                  <div key={an.id} style={markerStyleFor(an, false)}>
                    <MarkerInner an={an} idx={idx} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 16, maxWidth: 560, textAlign: 'center', color: '#f4ecdf' }} onClick={(e) => e.stopPropagation()}>
              {lb.caption ? <div style={{ fontFamily: "'Newsreader',serif", fontSize: 17, marginBottom: 8 }}>{lb.caption}</div> : null}
              {(lb.annotations || []).length ? (
                <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'inline-flex', flexDirection: 'column', gap: 5, textAlign: 'left' }}>
                  {lb.annotations.map((an, idx) => (
                    <li key={an.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 13, color: '#e7dccb' }}>
                      <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: '50%', background: 'var(--accent,#c98a5e)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{idx + 1}</span>
                      <span>
                        <b style={{ color: '#fff' }}>{str(an.label) || '標記 ' + (idx + 1)}</b> {str(an.note)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
            <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 18, right: 20, width: 42, height: 42, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.14)', color: '#fff', cursor: 'pointer', fontSize: 20 }}>
              ×
            </button>
            {lightbox && lightbox.imgs.length > 1 ? (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightbox((s) => (s ? { imgs: s.imgs, i: (s.i - 1 + s.imgs.length) % s.imgs.length } : s)) }}
                  style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', width: 46, height: 46, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.14)', color: '#fff', cursor: 'pointer', fontSize: 22 }}
                >
                  ‹
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightbox((s) => (s ? { imgs: s.imgs, i: (s.i + 1) % s.imgs.length } : s)) }}
                  style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', width: 46, height: 46, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.14)', color: '#fff', cursor: 'pointer', fontSize: 22 }}
                >
                  ›
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {/* popup */}
        {pop ? (
          <div
            onClick={() => setPopupId(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 92, background: 'rgba(20,16,13,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-2,#fffdf8)', color: 'var(--text,#3a322c)', borderRadius: 18, boxShadow: '0 30px 80px rgba(0,0,0,0.45)', maxWidth: 520, width: '100%', maxHeight: '86vh', overflowY: 'auto' }}>
              {str(pop.popupImg) ? <img src={pop.popupImg} alt="" style={{ width: '100%', display: 'block', borderRadius: '18px 18px 0 0' }} /> : null}
              <div style={{ padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <h3 style={{ fontFamily: "var(--head-font,'Newsreader',serif)", fontWeight: 600, fontSize: 20, margin: 0, color: 'inherit' }}>{str(pop.title)}</h3>
                  <button onClick={() => setPopupId(null)} style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 9, border: '1px solid var(--border,#e6dccb)', background: 'var(--bg-3,#ede2d0)', color: 'var(--text-2,#8d7c69)', cursor: 'pointer', fontSize: 17 }}>
                    ×
                  </button>
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap', color: 'inherit' }}>{str(pop.body)}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}

// ─── Default template builder ─────────────────────────────────────────────────

let _uid = 0
function uid() { return `b${++_uid}` }

export function buildDefaultTemplate(c: Character): Template {
  const blocks: Block[] = []

  blocks.push({
    id: uid(), type: 'columns',
    style: { align: 'center', padding: 20 },
    widths: [25, 75],
    children: [
      [{ id: uid(), type: 'avatar', size: 'md' }],
      [
        { id: uid(), type: 'heading', size: 'lg' },
        { id: uid(), type: 'tagline', size: 'md' },
      ],
    ],
  })

  if (c.mainVisualUrl) {
    blocks.push({ id: uid(), type: 'cover', size: 'md', ratio: 'natural', style: { align: 'center' } })
  }

  if ((c.palette ?? []).length > 0) {
    blocks.push({ id: uid(), type: 'palette', pvar: 'swatch', style: { align: 'center' } })
  }

  for (const sec of (c.sections ?? [])) {
    if (sec.fields.some(f => str(f.value))) {
      blocks.push({ id: uid(), type: 'section', sourceId: sec.id })
    }
  }

  for (const al of (c.albums ?? [])) {
    if ((al.images ?? []).length > 0) {
      blocks.push({ id: uid(), type: 'album', sourceId: al.id, mode: 'grid', cols: 3 })
    }
  }

  return { blocks }
}
