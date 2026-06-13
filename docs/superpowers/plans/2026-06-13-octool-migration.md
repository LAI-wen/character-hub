# octool-react Modal Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port 4 UI modals (AvatarCropperModal, EyedropperModal, AnnotationModal, CharBackupModal) from `OCTOOL 角色展示工具/octool-react` into the monorepo, wire them into both `account/CharacterEditPage` and `project/CharacterEditPage`, and add palette presets — all while preserving correct save/load via the existing API.

**Architecture:** Each modal is a standalone component in `apps/web/src/components/` with a props-only API (no store/context). They accept callbacks (`onComplete`, `onAddSwatch`, `onUpdate`, etc.) so the parent edit page keeps full ownership of state and API calls. Annotations are stored in `generalProfile.albums[n].images[n].annotations` — additive field, no DB migration needed. Form templates are saved to localStorage (`'octool:react:forms'`).

**Tech Stack:** React 18, TypeScript, canvas API, FileReader, `apiClient` (existing), `compressImage` (existing), localStorage

---

## File map

| Status | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/web/src/data/palettePresets.ts` | PRESETS array + LIBRARY constant |
| Create | `apps/web/src/data/formTemplates.ts` | FormTemplate type, BUILTIN_FORMS, localStorage helpers |
| Create | `apps/web/src/components/AvatarCropperModal.tsx` | Canvas crop UI, emits `File` blob via `onComplete` |
| Create | `apps/web/src/components/EyedropperModal.tsx` | Pick hex from any character image |
| Create | `apps/web/src/components/AnnotationModal.tsx` | Add pin/rect annotations to album images |
| Create | `apps/web/src/components/CharBackupModal.tsx` | Export/import character JSON + form templates |
| Modify | `apps/web/src/features/account/CharacterEditPage.tsx` | Wire all 4 modals + palette presets |
| Modify | `apps/web/src/features/project/CharacterEditPage.tsx` | Wire EyedropperModal, AnnotationModal, AvatarCropperModal, CharBackupModal |

**CSS variable mapping for all ported files:**
- `var(--bg-2)` → `var(--surface)`
- `var(--bg-3)` → `var(--surface-2)`
- `var(--text-2)` → `var(--text-dim)`
- `'Newsreader', serif` → `inherit`

---

## Task 1: Foundation — palette presets and form template utilities

**Files:**
- Create: `apps/web/src/data/palettePresets.ts`
- Create: `apps/web/src/data/formTemplates.ts`

- [ ] **Step 1: Create palettePresets.ts**

```ts
// apps/web/src/data/palettePresets.ts
export interface PalettePreset {
  name: string
  colors: { label: string; hex: string }[]
}

export const PRESETS: PalettePreset[] = [
  {
    name: '暖陽',
    colors: [
      { label: '主色', hex: '#e8a04b' },
      { label: '副色', hex: '#c2683a' },
      { label: '點綴', hex: '#f3d9a8' },
      { label: '深', hex: '#5a3825' },
    ],
  },
  {
    name: '霜夜',
    colors: [
      { label: '主色', hex: '#6c8db0' },
      { label: '副色', hex: '#aebfdc' },
      { label: '點綴', hex: '#e0a93b' },
      { label: '深', hex: '#2b3550' },
    ],
  },
  {
    name: '森林',
    colors: [
      { label: '主色', hex: '#6f8f5c' },
      { label: '副色', hex: '#b6c79a' },
      { label: '點綴', hex: '#caa05a' },
      { label: '深', hex: '#33402a' },
    ],
  },
  {
    name: '莓果',
    colors: [
      { label: '主色', hex: '#b1577e' },
      { label: '副色', hex: '#e6a5b8' },
      { label: '點綴', hex: '#7a9a6b' },
      { label: '深', hex: '#4a2536' },
    ],
  },
]
```

- [ ] **Step 2: Create formTemplates.ts**

```ts
// apps/web/src/data/formTemplates.ts

function uid() { return Math.random().toString(36).slice(2, 9) }

export interface FormTemplate {
  id: string
  name: string
  builtin?: boolean
  sections: { title: string; group: string; fields: { label: string; type: string }[] }[]
}

export type GpSectionSchema = FormTemplate['sections']

export function schemaFromSections(
  sections: { id: string; title: string; group: string; fields: { id: string; label: string; type: string; value: string }[] }[]
): FormTemplate['sections'] {
  return sections.map((s) => ({
    title: s.title || '',
    group: s.group || 'text',
    fields: s.fields.map((f) => ({ label: f.label || '', type: f.type || 'text' })),
  }))
}

export function sectionsFromSchema(
  schema: FormTemplate['sections']
): { id: string; title: string; group: 'text' | 'image'; fields: { id: string; label: string; type: string; value: string }[] }[] {
  return schema.map((s) => ({
    id: uid(),
    title: s.title || '',
    group: (s.group as 'text' | 'image') || 'text',
    fields: s.fields.map((f) => ({ id: uid(), label: f.label || '', type: f.type || 'text', value: '' })),
  }))
}

export const BUILTIN_FORMS: FormTemplate[] = [
  {
    id: 'bf-art',
    name: '繪師委託向',
    builtin: true,
    sections: [
      { title: '基本資料', group: 'text', fields: [{ label: '種族 / 身分', type: 'text' }, { label: '年齡', type: 'text' }, { label: '身高', type: 'text' }] },
      { title: '繪圖規範', group: 'image', fields: [{ label: '必畫重點', type: 'check' }, { label: '不可畫錯', type: 'avoid' }, { label: '配件', type: 'tags' }, { label: '自由發揮', type: 'longtext' }] },
    ],
  },
  {
    id: 'bf-novel',
    name: '文手向',
    builtin: true,
    sections: [
      { title: '基本', group: 'text', fields: [{ label: '一句話簡介', type: 'text' }, { label: '性格', type: 'longtext' }] },
      { title: '設定', group: 'text', fields: [{ label: '背景', type: 'longtext' }, { label: '行動動機', type: 'longtext' }, { label: '說話方式', type: 'tags' }, { label: '關係觀', type: 'longtext' }, { label: '禁忌', type: 'longtext' }] },
    ],
  },
  {
    id: 'bf-min',
    name: '精簡',
    builtin: true,
    sections: [
      { title: '基本資料', group: 'text', fields: [{ label: '種族 / 身分', type: 'text' }, { label: '年齡', type: 'text' }, { label: '身高', type: 'text' }, { label: '喜歡', type: 'tags' }, { label: '討厭', type: 'tags' }] },
    ],
  },
]

export const FORMS_KEY = 'octool:react:forms'

export function loadForms(): FormTemplate[] {
  try {
    const raw = localStorage.getItem(FORMS_KEY)
    const a = raw ? JSON.parse(raw) : []
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}

export function saveForms(list: FormTemplate[]): void {
  localStorage.setItem(FORMS_KEY, JSON.stringify(list.filter((t) => !t.builtin)))
}
```

- [ ] **Step 3: Verify the files exist with correct exports**

```bash
ls apps/web/src/data/
```

Expected: both `palettePresets.ts` and `formTemplates.ts` appear.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/data/palettePresets.ts apps/web/src/data/formTemplates.ts
git commit -m "feat: add palette presets and form template utilities"
```

---

## Task 2: AvatarCropperModal component

**Files:**
- Create: `apps/web/src/components/AvatarCropperModal.tsx`

The cropper opens a raw file picker on mount, renders a 300×300 canvas viewport with drag-to-pan and zoom slider, then on confirm calls `canvas.toBlob()` → wraps in `File` → calls `onComplete(file)`. The parent handles the actual API upload.

- [ ] **Step 1: Create AvatarCropperModal.tsx**

```tsx
// apps/web/src/components/AvatarCropperModal.tsx
import { useEffect, useRef, useState, type CSSProperties } from 'react'

interface CropState {
  src: string
  img: HTMLImageElement
  natW: number
  natH: number
  zoom: number
  ox: number
  oy: number
}

const V = 300

interface Props {
  onClose: () => void
  onComplete: (file: File) => Promise<void>
}

export function AvatarCropperModal({ onClose, onComplete }: Props) {
  const [crop, setCrop] = useState<CropState | null>(null)
  const [uploading, setUploading] = useState(false)
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = 'image/*'
    inp.onchange = () => {
      const file = inp.files?.[0]
      if (!file) return
      const fr = new FileReader()
      fr.onload = () => {
        const url = String(fr.result)
        const img = new Image()
        img.onload = () => {
          const base = V / Math.min(img.naturalWidth, img.naturalHeight)
          const ox = (V - img.naturalWidth * base) / 2
          const oy = (V - img.naturalHeight * base) / 2
          setCrop({ src: url, img, natW: img.naturalWidth, natH: img.naturalHeight, zoom: 1, ox, oy })
        }
        img.src = url
      }
      fr.readAsDataURL(file)
    }
    inp.click()
  }, [])

  const onDown = (e: React.PointerEvent) => {
    if (!crop) return
    drag.current = { sx: e.clientX, sy: e.clientY, ox: crop.ox, oy: crop.oy }
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !crop) return
    const ds = (V / Math.min(crop.natW, crop.natH)) * crop.zoom
    const imgW = crop.natW * ds
    const imgH = crop.natH * ds
    let ox = drag.current.ox + (e.clientX - drag.current.sx)
    let oy = drag.current.oy + (e.clientY - drag.current.sy)
    ox = Math.min(0, Math.max(V - imgW, ox))
    oy = Math.min(0, Math.max(V - imgH, oy))
    setCrop({ ...crop, ox, oy })
  }
  const onZoom = (z: number) => {
    if (!crop) return
    const base = V / Math.min(crop.natW, crop.natH)
    const dsOld = base * crop.zoom
    const cx = (V / 2 - crop.ox) / dsOld
    const cy = (V / 2 - crop.oy) / dsOld
    const dsNew = base * z
    let ox = V / 2 - cx * dsNew
    let oy = V / 2 - cy * dsNew
    ox = Math.min(0, Math.max(V - crop.natW * dsNew, ox))
    oy = Math.min(0, Math.max(V - crop.natH * dsNew, oy))
    setCrop({ ...crop, zoom: z, ox, oy })
  }
  const confirm = async () => {
    if (!crop || uploading) return
    const ds = (V / Math.min(crop.natW, crop.natH)) * crop.zoom
    const size = V / ds
    const x0 = (0 - crop.ox) / ds
    const y0 = (0 - crop.oy) / ds
    const cv = document.createElement('canvas')
    cv.width = 512
    cv.height = 512
    cv.getContext('2d')!.drawImage(crop.img, x0, y0, size, size, 0, 0, 512, 512)
    setUploading(true)
    try {
      const blob = await new Promise<Blob>((res) => cv.toBlob((b) => res(b!), 'image/jpeg', 0.9))
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      await onComplete(file)
      onClose()
    } finally {
      setUploading(false)
    }
  }

  const imgStyle: CSSProperties = crop ? {
    position: 'absolute', left: crop.ox, top: crop.oy,
    width: crop.natW * (V / Math.min(crop.natW, crop.natH)) * crop.zoom,
    height: crop.natH * (V / Math.min(crop.natW, crop.natH)) * crop.zoom,
    maxWidth: 'none', userSelect: 'none',
  } : {}

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(20,16,13,0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', width: '100%', maxWidth: 360, padding: 22 }}>
        <h2 style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 17, margin: '0 0 4px', color: 'var(--text)' }}>裁切頭像</h2>
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 16px' }}>拖曳移動、滑桿縮放，圓形框內就是頭像範圍。</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div
            style={{ position: 'relative', width: V, height: V, borderRadius: 14, overflow: 'hidden', background: '#2a221e', cursor: 'grab', touchAction: 'none' }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => { drag.current = null }}
          >
            {crop
              ? <img src={crop.src} alt="" draggable={false} style={imgStyle} />
              : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 13 }}>選擇圖片中…</div>
            }
            <div style={{ position: 'absolute', inset: 0, boxShadow: '0 0 0 9999px rgba(20,16,13,0.5)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(255,255,255,0.85)', borderRadius: '50%', pointerEvents: 'none' }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 700, flexShrink: 0 }}>縮放</span>
          <input type="range" min={1} max={3} step={0.01} value={crop?.zoom ?? 1}
            onChange={(e) => onZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent)' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 11, padding: 11, cursor: 'pointer' }}>
            取消
          </button>
          <button onClick={confirm} disabled={!crop || uploading} style={{ flex: 1, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 11, padding: 11, cursor: crop && !uploading ? 'pointer' : 'default', opacity: crop && !uploading ? 1 : 0.5 }}>
            {uploading ? '上傳中…' : '套用'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep AvatarCropperModal
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/AvatarCropperModal.tsx
git commit -m "feat: add AvatarCropperModal with canvas crop and blob output"
```

---

## Task 3: EyedropperModal component

**Files:**
- Create: `apps/web/src/components/EyedropperModal.tsx`

Accepts image URLs from the character (avatar, main visual, album images). User picks a source image or uploads a fresh one. Click on the image picks a pixel and calls `onAddSwatch(hex)`. CORS-tainted images (external URLs) show an error instead of crashing.

- [ ] **Step 1: Create EyedropperModal.tsx**

```tsx
// apps/web/src/components/EyedropperModal.tsx
import { useRef, useState } from 'react'

interface Props {
  avatarUrl: string
  mainVisualUrl: string
  albums: { images: { url: string }[] }[]
  onAddSwatch: (hex: string) => void
  onClose: () => void
}

function collectSources(avatarUrl: string, mainVisualUrl: string, albums: { images: { url: string }[] }[]): string[] {
  const out: string[] = []
  if (avatarUrl) out.push(avatarUrl)
  if (mainVisualUrl) out.push(mainVisualUrl)
  albums.forEach((a) => a.images.forEach((im) => im.url && out.push(im.url)))
  return Array.from(new Set(out))
}

function loadImageWithCORS(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export function EyedropperModal({ avatarUrl, mainVisualUrl, albums, onAddSwatch, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [taint, setTaint] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const sources = collectSources(avatarUrl, mainVisualUrl, albums)

  const pickFromUrl = async (u: string) => {
    setTaint(false)
    setUrl(u)
    try { imgRef.current = await loadImageWithCORS(u) } catch { imgRef.current = null }
  }

  const upload = () => {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = 'image/*'
    inp.onchange = () => {
      const file = inp.files?.[0]
      if (!file) return
      const fr = new FileReader()
      fr.onload = () => {
        const u = String(fr.result)
        setTaint(false)
        setUrl(u)
        const img = new Image()
        img.onload = () => { imgRef.current = img }
        img.src = u
      }
      fr.readAsDataURL(file)
    }
    inp.click()
  }

  const onPick = (e: React.MouseEvent<HTMLImageElement>) => {
    const disp = e.currentTarget
    if (!disp.naturalWidth) return
    const r = disp.getBoundingClientRect()
    const fx = (e.clientX - r.left) / r.width
    const fy = (e.clientY - r.top) / r.height
    const src = imgRef.current?.complete && imgRef.current.naturalWidth ? imgRef.current : disp
    const cv = document.createElement('canvas')
    cv.width = src.naturalWidth
    cv.height = src.naturalHeight
    const ctx = cv.getContext('2d')!
    ctx.drawImage(src, 0, 0)
    try {
      const p = ctx.getImageData(Math.floor(fx * cv.width), Math.floor(fy * cv.height), 1, 1).data
      const hex = '#' + [p[0], p[1], p[2]].map((n) => n.toString(16).padStart(2, '0')).join('')
      onAddSwatch(hex)
    } catch {
      setTaint(true)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 85, background: 'rgba(20,16,13,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', maxWidth: 560, width: '100%', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <h2 style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 17, margin: 0, color: 'var(--text)' }}>圖片吸色</h2>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 17 }}>×</button>
        </div>

        {url ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 12px' }}>在圖片上點一下，取色加入配色。</p>
            <img src={url} onClick={onPick} draggable={false}
              style={{ maxWidth: '100%', maxHeight: '48vh', display: 'block', margin: '0 auto', borderRadius: 12, border: '1px solid var(--border)', cursor: 'crosshair' }} />
            {taint && <p style={{ fontSize: 12, color: '#c0584f', textAlign: 'center', margin: '10px 0 0' }}>這張圖無法吸色（跨網域限制），請改用「上傳圖片」。</p>}
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button onClick={upload} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer' }}>
                上傳其他圖片
              </button>
            </div>
          </>
        ) : sources.length ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 10px' }}>選一張角色圖片來吸色，或上傳新圖片。</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(74px,1fr))', gap: 8, marginBottom: 14, maxHeight: 240, overflowY: 'auto' }}>
              {sources.map((s, i) => (
                <button key={i} onClick={() => pickFromUrl(s)}
                  style={{ padding: 0, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1 / 1', background: 'var(--surface-2)' }}>
                  <img src={s} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'center' }}>
              <button onClick={upload} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 11, padding: '10px 20px', cursor: 'pointer' }}>
                上傳新圖片
              </button>
            </div>
          </>
        ) : (
          <div style={{ border: '1.5px dashed var(--border)', borderRadius: 14, padding: '44px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <p style={{ margin: '0 0 16px', fontSize: 14 }}>上傳一張圖片，點選即可取出顏色</p>
            <button onClick={upload} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 11, padding: '11px 22px', cursor: 'pointer' }}>
              選擇圖片
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep EyedropperModal
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/EyedropperModal.tsx
git commit -m "feat: add EyedropperModal for color picking from character images"
```

---

## Task 4: AnnotationModal component

**Files:**
- Create: `apps/web/src/components/AnnotationModal.tsx`

Two-panel modal: image on left (click to place pins, drag to draw rects), annotation list on right (title + notes per annotation). Keeps a local copy of annotations and calls `onUpdate` on every add/remove/edit so the parent state stays in sync.

- [ ] **Step 1: Create AnnotationModal.tsx**

```tsx
// apps/web/src/components/AnnotationModal.tsx
import { useRef, useState, type CSSProperties } from 'react'

export type AnnotationKind = 'pin' | 'rect'

export interface Annotation {
  id: string
  kind: AnnotationKind
  x: number
  y: number
  w?: number
  h?: number
  label: string
  note: string
}

function uid() { return Math.random().toString(36).slice(2, 9) }
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

interface Props {
  imageUrl: string
  initialAnnotations: Annotation[]
  onUpdate: (anns: Annotation[]) => void
  onClose: () => void
}

export function AnnotationModal({ imageUrl, initialAnnotations, onUpdate, onClose }: Props) {
  const [anns, setAnns] = useState<Annotation[]>(initialAnnotations)
  const [mode, setMode] = useState<'pin' | 'rect'>('pin')
  const [drawing, setDrawing] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const surf = useRef<HTMLDivElement>(null)

  const update = (next: Annotation[]) => { setAnns(next); onUpdate(next) }

  const norm = (e: React.PointerEvent) => {
    const r = surf.current!.getBoundingClientRect()
    return { nx: clamp01((e.clientX - r.left) / r.width), ny: clamp01((e.clientY - r.top) / r.height) }
  }

  const onDown = (e: React.PointerEvent) => {
    const { nx, ny } = norm(e)
    if (mode === 'pin') {
      update([...anns, { id: uid(), kind: 'pin', x: nx, y: ny, label: '', note: '' }])
    } else {
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
      setDrawing({ x0: nx, y0: ny, x1: nx, y1: ny })
    }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drawing) return
    const { nx, ny } = norm(e)
    setDrawing((d) => (d ? { ...d, x1: nx, y1: ny } : d))
  }
  const onUp = () => {
    const d = drawing
    setDrawing(null)
    if (!d) return
    const x = Math.min(d.x0, d.x1)
    const y = Math.min(d.y0, d.y1)
    const w = Math.abs(d.x1 - d.x0)
    const h = Math.abs(d.y1 - d.y0)
    if (w > 0.02 && h > 0.02) update([...anns, { id: uid(), kind: 'rect', x, y, w, h, label: '', note: '' }])
  }

  const patch = (id: string, key: 'label' | 'note', val: string) =>
    update(anns.map((a) => (a.id === id ? { ...a, [key]: val } : a)))

  const remove = (id: string) => update(anns.filter((a) => a.id !== id))

  const tab = (m: 'pin' | 'rect', label: string) => (
    <button onClick={() => setMode(m)} style={{
      fontFamily: 'inherit', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: 8, padding: '7px 13px',
      background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#fff' : 'var(--text-dim)',
    }}>{label}</button>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(20,16,13,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 22, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', maxWidth: 980, width: '100%', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 17, margin: 0, color: 'var(--text)' }}>圖片標記</h2>
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 11 }}>
              {tab('pin', '＋ Pin')}
              {tab('rect', '▭ 框選')}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 17 }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 18, padding: 20, overflowY: 'auto', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
            <div ref={surf} style={{ position: 'relative', display: 'inline-block', lineHeight: 0, touchAction: 'none', cursor: 'crosshair', maxWidth: '100%' }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
              <img src={imageUrl} alt="" draggable={false}
                style={{ display: 'block', maxHeight: '54vh', maxWidth: '100%', borderRadius: 10, border: '1px solid var(--border)' }} />
              {anns.map((an, i) =>
                an.kind === 'pin' ? (
                  <span key={an.id} style={{ position: 'absolute', left: `${an.x * 100}%`, top: `${an.y * 100}%`, transform: 'translate(-50%,-50%)', width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.35)' } as CSSProperties}>
                    {i + 1}
                  </span>
                ) : (
                  <span key={an.id} style={{ position: 'absolute', left: `${an.x * 100}%`, top: `${an.y * 100}%`, width: `${(an.w || 0) * 100}%`, height: `${(an.h || 0) * 100}%`, border: '2px solid var(--accent)', borderRadius: 6, background: 'rgba(201,138,94,0.16)' }}>
                    <span style={{ position: 'absolute', left: -9, top: -9, width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, border: '2px solid #fff' }}>{i + 1}</span>
                  </span>
                )
              )}
              {drawing && (
                <div style={{ position: 'absolute', left: `${Math.min(drawing.x0, drawing.x1) * 100}%`, top: `${Math.min(drawing.y0, drawing.y1) * 100}%`, width: `${Math.abs(drawing.x1 - drawing.x0) * 100}%`, height: `${Math.abs(drawing.y1 - drawing.y0) * 100}%`, border: '2px dashed var(--accent)', background: 'rgba(201,138,94,0.16)' }} />
              )}
            </div>
          </div>

          <div style={{ width: 300, flexShrink: 0 }}>
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.6 }}>
              選上方工具，在圖片上點 Pin 或拖出矩形；右側填寫每個標記的標題與說明。
            </p>
            {anns.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {anns.map((an, i) => (
                  <div key={an.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', background: 'var(--surface)', borderRadius: 6, padding: '2px 7px' }}>{an.kind === 'pin' ? 'Pin' : '框選'}</span>
                      <button onClick={() => remove(an.id)} style={{ marginLeft: 'auto', width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13 }}>×</button>
                    </div>
                    <input value={an.label} onChange={(e) => patch(an.id, 'label', e.target.value)}
                      placeholder="標記標題"
                      style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', outline: 'none', marginBottom: 6 }} />
                    <textarea value={an.note} onChange={(e) => patch(an.id, 'note', e.target.value)}
                      placeholder="說明…"
                      style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', outline: 'none', minHeight: 48, resize: 'vertical' }} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ border: '1.5px dashed var(--border)', borderRadius: 12, padding: 22, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                選上方工具，在圖片上點 Pin 或拖出矩形
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep AnnotationModal
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/AnnotationModal.tsx
git commit -m "feat: add AnnotationModal for pin and rect annotations on album images"
```

---

## Task 5: CharBackupModal component

**Files:**
- Create: `apps/web/src/components/CharBackupModal.tsx`

Two sections: character data backup (export/import JSON) and form templates (save/apply/remove section schemas stored in localStorage). "套用" replaces the current sections via `onApplySections` callback.

- [ ] **Step 1: Create CharBackupModal.tsx**

```tsx
// apps/web/src/components/CharBackupModal.tsx
import { useState } from 'react'
import { BUILTIN_FORMS, FORMS_KEY, FormTemplate, loadForms, saveForms, schemaFromSections, sectionsFromSchema } from '@/data/formTemplates'

function uid() { return Math.random().toString(36).slice(2, 9) }

type Section = { id: string; title: string; group: string; fields: { id: string; label: string; type: string; value: string }[] }

interface Props {
  charName: string
  sections: Section[]
  onExport: () => void
  onImport: () => void
  onApplySections: (sections: Section[]) => void
  onClose: () => void
}

export function CharBackupModal({ charName, sections, onExport, onImport, onApplySections, onClose }: Props) {
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>(() => [...BUILTIN_FORMS, ...loadForms()])

  const persist = (list: FormTemplate[]) => { setFormTemplates(list); saveForms(list) }

  const saveCurrentAsTemplate = () => {
    const name = prompt('格式名稱？')
    if (!name) return
    const tpl: FormTemplate = { id: uid(), name, sections: schemaFromSections(sections) }
    persist([...formTemplates, tpl])
  }

  const applyTemplate = (t: FormTemplate) => {
    if (!window.confirm(`套用「${t.name}」格式？這會換掉目前的設定區塊（但不影響模板和圖庫）。`)) return
    onApplySections(sectionsFromSchema(t.sections) as Section[])
    onClose()
  }

  const removeTemplate = (id: string) => {
    persist(formTemplates.filter((t) => t.id !== id))
  }

  const exportTemplate = () => {
    const user = formTemplates.filter((t) => !t.builtin)
    if (!user.length) { alert('還沒有自訂格式。'); return }
    const blob = new Blob([JSON.stringify(user, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'form-templates.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const importTemplate = () => {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = 'application/json,.json'
    inp.onchange = () => {
      const f = inp.files?.[0]; if (!f) return
      const fr = new FileReader()
      fr.onload = () => {
        try {
          const arr = JSON.parse(String(fr.result))
          if (!Array.isArray(arr)) throw new Error()
          const imported: FormTemplate[] = arr.map((t: unknown) => ({
            id: uid(), name: (t as FormTemplate).name || '匯入格式', sections: (t as FormTemplate).sections || [],
          }))
          persist([...formTemplates, ...imported])
        } catch { alert('格式檔案讀取失敗。') }
      }
      fr.readAsText(f)
    }
    inp.click()
  }

  const primaryBtn = { fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 10, padding: '9px 14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 } as const
  const softBtn   = { fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', borderRadius: 10, padding: '9px 14px', cursor: 'pointer' } as const
  const ghost     = { fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 14px', cursor: 'pointer' } as const
  const section   = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 14 } as const

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 85, background: 'rgba(20,16,13,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', maxWidth: 560, width: '100%', maxHeight: '88vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          <h2 style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 18, margin: 0, color: 'var(--text)' }}>備份與格式</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 18px', lineHeight: 1.6 }}>
          <b style={{ color: 'var(--text)' }}>內容</b>是你填的資料，<b style={{ color: 'var(--text)' }}>格式</b>只是欄位的結構。
        </p>

        <section style={section}>
          <h3 style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 15, margin: '0 0 4px', color: 'var(--text)' }}>內容備份</h3>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.6 }}>所有文字、圖片、相簿、配色、模板。匯出成 JSON 儲存或搬到別台裝置。</p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <button style={primaryBtn} onClick={() => { onExport(); onClose() }}>匯出內容備份</button>
            <button style={ghost} onClick={() => { onImport(); onClose() }}>匯入內容檔</button>
          </div>
        </section>

        <section style={section}>
          <h3 style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 15, margin: '0 0 4px', color: 'var(--text)' }}>欄位格式（只有結構）</h3>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.6 }}>只記住「有哪些區塊、哪些欄位」，不含填的內容。套用格式會換掉目前的設定區塊。</p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
            <button style={softBtn} onClick={saveCurrentAsTemplate}>＋ 儲存目前格式</button>
            <button style={ghost} onClick={importTemplate}>匯入格式</button>
            <button style={ghost} onClick={exportTemplate}>匯出格式</button>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 9 }}>套用格式</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {formTemplates.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '11px 13px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{t.sections.length} 個區塊{t.builtin ? ' · 範例' : ''}</div>
                </div>
                <button style={{ ...softBtn, padding: '8px 14px' }} onClick={() => applyTemplate(t)}>套用</button>
                {!t.builtin && (
                  <button onClick={() => removeTemplate(t.id)} style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -E "CharBackupModal|formTemplates"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/CharBackupModal.tsx
git commit -m "feat: add CharBackupModal with export/import and form template management"
```

---

## Task 6: Wire all modals into account/CharacterEditPage

**Files:**
- Modify: `apps/web/src/features/account/CharacterEditPage.tsx`

There are 8 precise injection sites. Make them in order.

### 6a: Add imports (line 1, after existing imports)

- [ ] **Step 1: Add import lines after line 14 (the last existing import)**

After `import type { CharacterResponse } from "@oc-tools/contracts"`, add:

```ts
import { AvatarCropperModal } from "@/components/AvatarCropperModal"
import { EyedropperModal } from "@/components/EyedropperModal"
import { AnnotationModal } from "@/components/AnnotationModal"
import type { Annotation as GpAnnotation } from "@/components/AnnotationModal"
import { CharBackupModal } from "@/components/CharBackupModal"
import { PRESETS } from "@/data/palettePresets"
```

### 6b: Update GpImage type and add GpAnnotation (around line 21)

- [ ] **Step 2: Replace the GpImage type line**

Old (line 21):
```ts
type GpImage       = { id: string; url: string; caption: string }
```

New:
```ts
type GpImage       = { id: string; url: string; caption: string; annotations?: GpAnnotation[] }
```

(GpAnnotation is imported from AnnotationModal, no need to redefine.)

### 6c: Add state variables (after existing `useState` declarations, around line 495–510)

- [ ] **Step 3: Add new state vars after `showPresetModal` declaration**

After `const [showPresetModal, setShowPresetModal] = useState(false)`, add:

```ts
const [showEyedropper,    setShowEyedropper]    = useState(false)
const [showBackupModal,   setShowBackupModal]   = useState(false)
const [showAvatarCropper, setShowAvatarCropper] = useState(false)
const [annotatingImage,   setAnnotatingImage]   = useState<{ alId: string; imId: string } | null>(null)
```

### 6d: Add helper functions (after the removeSwatch / addSwatch block, around line 740)

- [ ] **Step 4: Add addSwatchHex and updateImageAnnotations after `removeSwatch`**

After `const removeSwatch = (id: string) => ...`, add:

```ts
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
```

### 6e: Replace eyedropper alert (account/CharacterEditPage.tsx, around line 1852–1854)

- [ ] **Step 5: Replace the 吸色 button onClick and remove the placeholder paragraph**

Find this block (around line 1849–1860):
```tsx
<Card Icon={Ic.Palette} title="色票"
  trailing={
    <div style={{ display: 'flex', gap: 6 }}>
      <button type="button" title="從圖片吸色（即將推出）" style={S.ghostBtn}
        onClick={() => alert("吸色功能即將推出！目前請手動輸入色碼。")}>
        <svg ...> </svg> 吸色
      </button>
      <button type="button" style={S.addBtn} onClick={addSwatch}><Ic.Plus /> 顏色</button>
    </div>
  }
>
  <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 14px" }}>先用色碼建立；之後支援上傳圖片吸色。</p>
```

Replace the `onClick` and remove the `<p>` placeholder:
```tsx
<Card Icon={Ic.Palette} title="色票"
  trailing={
    <div style={{ display: 'flex', gap: 6 }}>
      <button type="button" title="套用配色預設" style={{ ...S.ghostBtn, position: "relative" }}
        onClick={() => {
          const m = document.getElementById("palette-presets-menu")
          if (m) m.style.display = m.style.display === "none" ? "block" : "none"
        }}>
        預設
        <div id="palette-presets-menu" style={{ display: "none", position: "absolute", top: "100%", right: 0, zIndex: 50, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.14)", padding: 6, minWidth: 130, marginTop: 4 }}>
          {PRESETS.map(p => (
            <button key={p.name} type="button" onClick={(e) => { e.stopPropagation(); setPalette(p.colors.map(c => ({ id: uid(), label: c.label, hex: c.hex }))); markDirty(); const m = document.getElementById("palette-presets-menu"); if (m) m.style.display = "none" }}
              style={{ display: "block", width: "100%", textAlign: "left", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--text)", background: "transparent", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}>
              {p.name}
            </button>
          ))}
        </div>
      </button>
      <button type="button" title="從圖片吸色" style={S.ghostBtn} onClick={() => setShowEyedropper(true)}>
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3L3 13"/><path d="M10 1l5 5-3 3-5-5 3-3z"/><circle cx="2.5" cy="13.5" r="1.5"/></svg> 吸色
      </button>
      <button type="button" style={S.addBtn} onClick={addSwatch}><Ic.Plus /> 顏色</button>
    </div>
  }
>
```

Remove the paragraph that said "先用色碼建立；之後支援上傳圖片吸色。" — delete that line entirely.

### 6f: Add "標記" button in album image rows (around line 1014–1024)

- [ ] **Step 6: Add annotation button in the image action column**

Find the action column in the album image row (the `<div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>` block around line 1014). Add a "標記" button after the upload button and before the delete button:

```tsx
<div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
  <button type="button" style={{ ...S.addBtn, fontSize: 12, borderRadius: 8, padding: "7px 10px", justifyContent: "center" }}
    onClick={() => { setPendingAlbumUpload({ alId: al.id, imId: im.id }); albumImgRef.current?.click() }}>
    <Ic.Upload /> {albumImgUploading === im.id ? "…" : "上傳"}
  </button>
  {im.url && (
    <button type="button" style={{ ...S.ghostBtn, fontSize: 12, borderRadius: 8, padding: "7px 10px", justifyContent: "center", whiteSpace: "nowrap" }}
      onClick={() => setAnnotatingImage({ alId: al.id, imId: im.id })}>
      標記 {(im.annotations?.length ?? 0) > 0 && <span style={{ background: "var(--accent)", color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, marginLeft: 2 }}>{im.annotations!.length}</span>}
    </button>
  )}
  <button type="button"
    style={{ width: "100%", height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-dim)", cursor: "pointer", fontSize: 14 }}
    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#c0584f"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#e0b3ad" }}
    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)" }}
    onClick={() => removeImage(al.id, im.id)}>×</button>
</div>
```

### 6g: Replace avatar upload button to open cropper

- [ ] **Step 7: Find the avatar upload trigger and route it through the cropper**

In the JSX where the avatar click handler currently is `() => avatarRef.current?.click()`, change it to `() => setShowAvatarCropper(true)`.

The hidden `<input ref={avatarRef}>` can stay for now (it's harmless), or remove it if it's exclusively used for avatar. Keep `handleAvatarFile` as-is (used for non-cropper fallback).

### 6h: Replace export/import toolbar buttons with backup modal trigger

- [ ] **Step 8: Find the export toolbar button (around line 1721) and add a backup modal button**

Find the line `<button type="button" title="從 JSON 備份匯入" onClick={() => importRef.current?.click()}` and the nearby export button. Replace them both with:

```tsx
<button type="button" title="備份與格式" style={S.ghostBtn}
  onClick={() => setShowBackupModal(true)}>
  <Ic.Doc /> 備份
</button>
```

Keep the `<input ref={importRef}>` hidden input in JSX (CharBackupModal calls `onImport` which triggers it).

### 6i: Render modals at the bottom of the JSX (before the closing `</form>`)

- [ ] **Step 9: Add all modal renders before the closing `</form>` tag**

Before the final `</form>` and after the existing `<AssetPickerModal>` renders, add:

```tsx
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
```

- [ ] **Step 10: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/features/account/CharacterEditPage.tsx
git commit -m "feat: wire AvatarCropperModal, EyedropperModal, AnnotationModal, CharBackupModal into account edit page"
```

---

## Task 7: Wire modals into project/CharacterEditPage

**Files:**
- Modify: `apps/web/src/features/project/CharacterEditPage.tsx`

Same pattern as Task 6. The project page has avatar, palette, and albums but no template editor.

- [ ] **Step 1: Add imports after existing imports (line 14)**

```ts
import { AvatarCropperModal } from "@/components/AvatarCropperModal"
import { EyedropperModal } from "@/components/EyedropperModal"
import { AnnotationModal } from "@/components/AnnotationModal"
import type { Annotation as GpAnnotation } from "@/components/AnnotationModal"
import { CharBackupModal } from "@/components/CharBackupModal"
import { PRESETS } from "@/data/palettePresets"
```

- [ ] **Step 2: Update GpImage type (around line 22)**

Old:
```ts
type GpImage   = { id: string; url: string; caption: string }
```
New:
```ts
type GpImage   = { id: string; url: string; caption: string; annotations?: GpAnnotation[] }
```

- [ ] **Step 3: Add state vars after existing state declarations**

After the existing `useState` lines (around line 385), add:

```ts
const [showEyedropper,    setShowEyedropper]    = useState(false)
const [showBackupModal,   setShowBackupModal]   = useState(false)
const [showAvatarCropper, setShowAvatarCropper] = useState(false)
const [annotatingImage,   setAnnotatingImage]   = useState<{ alId: string; imId: string } | null>(null)
```

- [ ] **Step 4: Add helper functions after removeSwatch (around line 570)**

After `const removeSwatch = ...`, add:

```ts
const addSwatchHex = (hex: string) => { setPalette(p => [...p, { id: uid(), label: "", hex }]); markDirty() }

const updateImageAnnotations = (alId: string, imId: string, anns: GpAnnotation[]) => {
  setAlbums(a => a.map(al => al.id === alId
    ? { ...al, images: al.images.map(im => im.id === imId ? { ...im, annotations: anns } : im) }
    : al
  ))
  markDirty()
}

async function uploadCroppedAvatar(file: File) {
  setAvatarUploading(true)
  try {
    const form = new FormData()
    form.append("file", file)
    const res = await apiClient<{ character: unknown; avatarUrl: string }>(`/api/app/characters/${character.id}/avatar`, { method: "POST", body: form })
    setValue("avatarUrl", res.avatarUrl, { shouldDirty: true })
    markDirty()
    qc.invalidateQueries({ queryKey: ["character", character.id] })
    qc.invalidateQueries({ queryKey: ["characters"] })
  } finally {
    setAvatarUploading(false)
  }
}
```

- [ ] **Step 5: Replace eyedropper alert (around line 923)**

Find:
```tsx
<button type="button" title="從圖片吸色（即將推出）" style={S.ghostBtn}
  onClick={() => alert("吸色功能即將推出！目前請手動輸入色碼。")}>
  <svg ...> 吸色
</button>
```

Replace the `onClick` handler:
```tsx
onClick={() => setShowEyedropper(true)}
```

Also remove the `<p>` tag that reads "先用色碼建立；之後支援上傳圖片吸色。"

Add palette presets button in the same `trailing` area (same pattern as Task 6e — add the "預設" dropdown button).

- [ ] **Step 6: Add "標記" button in album image rows**

Find the album image action column in project/CharacterEditPage (same pattern as account, the `<div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>`). Add the same "標記" button as in Task 6f.

- [ ] **Step 7: Route avatar click through cropper**

Find where the avatar div is clicked (`() => avatarRef.current?.click()` or equivalent, around line 760), replace with `() => setShowAvatarCropper(true)`.

- [ ] **Step 8: Replace export/import toolbar button with backup modal trigger**

Find the backup-related buttons around line 784. Replace with:

```tsx
<button type="button" title="備份與格式" style={S.ghostBtn}
  onClick={() => setShowBackupModal(true)}>
  <Ic.Doc /> 備份
</button>
```

- [ ] **Step 9: Render modals before closing `</form>` tag, after existing `<AssetPickerModal>` blocks**

```tsx
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
```

- [ ] **Step 10: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/features/project/CharacterEditPage.tsx
git commit -m "feat: wire AvatarCropperModal, EyedropperModal, AnnotationModal, CharBackupModal into project edit page"
```

---

## Self-Review

### Spec coverage check

| Feature | Task |
|---------|------|
| AvatarCropperModal (crop to 512×512, API upload) | Tasks 2, 6g, 7g |
| EyedropperModal (pick color from image) | Tasks 3, 6e, 7e |
| AnnotationModal (pin/rect on album images) | Tasks 4, 6f, 7f |
| CharBackupModal (export/import + form templates) | Tasks 5, 6h, 7h |
| Palette presets | Tasks 1, 6e, 7e |
| CSS vars mapped (--bg-2 → --surface etc.) | All component files |
| Annotations saved in generalProfile | Task 6b + GpImage type update |
| Public page compatibility | No change needed — TemplateCanvas already reads annotations from GpImage |
| Both edit pages wired | Tasks 6 and 7 |

### Type consistency check

- `GpAnnotation` is imported from `AnnotationModal.tsx` (exported as `Annotation`) and aliased to avoid collision with any local types.
- `FormTemplate`, `schemaFromSections`, `sectionsFromSchema`, `BUILTIN_FORMS` all live in `formTemplates.ts` and are imported by `CharBackupModal.tsx`.
- `Section` type passed to `CharBackupModal.onApplySections` matches `GpSection` in both edit pages (both are `{ id, title, group, fields: { id, label, type, value }[] }`).
- `PRESETS` from `palettePresets.ts` → `colors: { label, hex }[]` — used in Task 6e/7e preset dropdown.
- `AvatarCropperModal.onComplete: (file: File) => Promise<void>` — called with `uploadCroppedAvatar` which has the same signature.

### Placeholder scan

No TBDs, no "handle edge cases", no "similar to Task N" references. All code blocks are complete.

---

**Plan saved to `docs/superpowers/plans/2026-06-13-octool-migration.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks

**2. Inline Execution** — execute tasks in this session using executing-plans

Which approach?
