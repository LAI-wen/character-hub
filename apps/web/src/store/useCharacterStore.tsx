// API-backed character store — same interface as octool-react's useOctool,
// but persists to D1/R2 via the app API instead of localStorage.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { compressImage } from '@/lib/compressImage'
import { showConfirm } from '@/components/ConfirmModal'
import { BUILTIN_FORMS, loadForms, saveForms, schemaFromSections, sectionsFromSchema } from '@/data/formTemplates'
import type { FormTemplate } from '@/data/formTemplates'
import {
  DEF_DESIGN,
  cloneBlk,
  detachFrom,
  findParentArr,
  insertRelId,
  makeBlock,
  mapTree,
  newTemplate,
  removeTree,
  uid,
} from '@/features/project/templateBuilder/blocks'

// ─── Types (octool-react shape) ──────────────────────────────────────────────

export type FieldType = 'text' | 'longtext' | 'tags' | 'check' | 'avoid' | 'attr' | 'object'
export type SectionGroup = 'text' | 'image'
export type AlbumKind = 'gallery' | 'ref'
export type AnnotationKind = 'pin' | 'rect'
export type DesignMode = 'edit' | 'preview'
export type FormTab = 'basic' | 'image' | 'text' | 'gallery'
export type AnnotateMode = 'list' | 'tooltip'
export type DeviceKey = 'desktop' | 'tablet' | 'phone'
export type BlockType = string

export interface Annotation {
  id: string; kind: AnnotationKind
  x: number; y: number; w?: number; h?: number
  label: string; note: string
}
export interface AlbumImage { id: string; url: string; caption: string; annotations: Annotation[] }
export interface Album { id: string; name: string; kind: AlbumKind; linkRef?: string; images: AlbumImage[] }
export interface Swatch { id: string; label: string; hex: string }
export interface Field { id: string; label: string; type: FieldType; value: string }
export interface Section { id: string; title: string; group: SectionGroup; fields: Field[] }
export interface BlockStyle { align?: 'left' | 'center' | 'right'; padding?: number; opacity?: number; radius?: number; bgColor?: string; custom?: boolean; borderColor?: string; borderWidth?: number; borderStyle?: string; [k: string]: unknown }
export interface Tag { id: string; label: string; color: string }
export interface Block { id: string; type: BlockType; style?: BlockStyle; sourceId?: string; size?: string; text?: string; title?: string; body?: string; popupImg?: string; trigger?: string; hideTitle?: boolean; titleOverride?: string; speed?: number; tags?: Tag[]; tagStyle?: string; mode?: string; ratio?: string; cols?: number; pvar?: string; variant?: string; widths?: number[]; valign?: string; children?: Block[][]; [k: string]: unknown }
export interface Design { bg?: string; bgImage?: string; bgImageTablet?: string; bgImagePhone?: string; bgRepeat?: string; bgSize?: string; bgAttach?: string; maskBright?: number; maskBlur?: number; maskSat?: number; primary?: string; font?: string; fontImport?: string; align?: string; width?: string; library?: string[]; pageFit?: string; autoNav?: boolean }
export interface Template { id?: string; name?: string; design?: Design; blocks: Block[] }

export interface Character {
  name: string; nickname: string; tagline: string
  avatarUrl: string; mainVisualUrl: string
  palette: Swatch[]; sections: Section[]; albums: Album[]; templates: Template[]
}

interface UIState {
  designMode: DesignMode; device: DeviceKey; annotateMode: AnnotateMode
  formTab: FormTab; activeTpl: string | null; selBlock: string | null
  albClosed: Record<string, boolean>; preview: string | null
  annot: { aid: string; iid: string } | null
  cropField: 'avatarUrl' | 'mainVisualUrl' | null
  eyedrop: boolean; formTpl: boolean; fold: boolean; pageView: number | 'all'
}

export interface CharacterStore {
  character: Character; ui: UIState; activeTemplate: Template | null
  saving: boolean; saveError: boolean; charId: string
  setDesignMode: (m: DesignMode) => void
  setDevice: (d: DeviceKey) => void
  setAnnotateMode: (m: AnnotateMode) => void
  setFormTab: (t: FormTab) => void
  setPreview: (url: string | null) => void
  openAnnot: (aid: string, iid: string) => void
  closeAnnot: () => void
  openCropper: (field?: 'avatarUrl' | 'mainVisualUrl') => void
  closeCropper: () => void
  openEyedrop: () => void
  closeEyedrop: () => void
  openFormTpl: () => void
  closeFormTpl: () => void
  toggleFold: () => void
  setPageView: (p: number | 'all') => void
  updateCore: (field: keyof Character, value: string) => void
  addSwatch: () => void
  updateSwatch: (id: string, k: 'label' | 'hex', v: string) => void
  removeSwatch: (id: string) => void
  applyPreset: (cols: { label: string; hex: string }[]) => void
  addSection: (group?: SectionGroup) => void
  updateSection: (sid: string, k: 'title' | 'group', v: string) => void
  removeSection: (sid: string) => void
  addField: (sid: string, type: FieldType) => void
  updateField: (sid: string, fid: string, k: 'label' | 'type' | 'value', v: string) => void
  removeField: (sid: string, fid: string) => void
  addAlbum: (kind?: AlbumKind) => void
  updateAlbum: (aid: string, k: 'name' | 'linkRef', v: string) => void
  removeAlbum: (aid: string) => void
  toggleAlbumCollapse: (aid: string) => void
  addImage: (aid: string) => void
  updateImage: (aid: string, iid: string, k: 'url' | 'caption', v: string) => void
  removeImage: (aid: string, iid: string) => void
  setActiveTpl: (id: string) => void
  addTemplate: (kind?: string) => void
  renameTemplate: (id: string, name: string) => void
  duplicateTemplate: (id: string) => void
  removeTemplate: (id: string) => void
  selectBlock: (id: string | null) => void
  addBlock: (type: BlockType) => void
  removeBlock: (id: string) => void
  duplicateBlock: (id: string) => void
  moveBlockDir: (id: string, dir: 1 | -1) => void
  updateBlock: (id: string, k: string, v: unknown) => void
  updateBlockStyle: (id: string, k: string, v: unknown) => void
  updateDesign: (k: string, v: unknown) => void
  moveBlock: (fromId: string, toId: string, pos: 'before' | 'after') => void
  dropToColumn: (fromId: string, colId: string, ci: number) => void
  colResize: (colId: string, i: number, a: number, b: number) => void
  setCols: (colId: string, n: number) => void
  setColWidth: (colId: string, ci: number, val: number) => void
  moveColChild: (childId: string, dir: 1 | -1) => void
  moveOut: (id: string) => void
  autoPaginate: (beforeIds: string[]) => void
  addTag: (blockId: string) => void
  updateTag: (blockId: string, tagId: string, k: 'label' | 'color', v: string) => void
  removeTag: (blockId: string, tagId: string) => void
  libColors: () => string[]
  addLibColor: (hex: string) => void
  removeLibColor: (hex: string) => void
  uploadCore: (field: 'avatarUrl' | 'mainVisualUrl') => void
  uploadAlbumImage: (aid: string, iid: string) => void
  uploadManyImages: (aid: string) => void
  uploadBg: () => void
  addSwatchHex: (hex: string) => void
  addAnno: (aid: string, iid: string, partial: Partial<Annotation>) => void
  updateAnno: (aid: string, iid: string, annId: string, k: 'label' | 'note', v: string) => void
  removeAnno: (aid: string, iid: string, annId: string) => void
  setAnnotations: (aid: string, iid: string, anns: Annotation[]) => void
  formTemplates: FormTemplate[]
  exportChar: () => void
  importCharFile: () => void
  saveFormTemplate: () => void
  applyFormTemplate: (tpl: FormTemplate) => void
  removeFormTemplate: (id: string) => void
  exportFormTemplate: () => void
  importFormTemplate: () => void
  resetDemo: () => void
  clearAll: () => void
  importCharacter: (c: Character) => void
}

const EMPTY_CHAR: Character = {
  name: '', nickname: '', tagline: '', avatarUrl: '', mainVisualUrl: '',
  palette: [], sections: [], albums: [], templates: [],
}

const DEFAULT_UI: UIState = {
  designMode: 'edit', device: 'desktop', annotateMode: 'list',
  formTab: 'basic', activeTpl: null, selBlock: null,
  albClosed: {}, preview: null, annot: null, cropField: null,
  eyedrop: false, formTpl: false, fold: false, pageView: 'all',
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

const DEMO: Character = {
  name: '莉央', nickname: '小央',
  tagline: '我把每一個願望，都記在星圖上。',
  avatarUrl: 'https://picsum.photos/seed/octool-luna-av/400/400',
  mainVisualUrl: 'https://picsum.photos/seed/octool-luna-main/1280/820',
  palette: [
    { id: 'p1', label: '髮色', hex: '#aebfdc' },
    { id: 'p2', label: '瞳色', hex: '#e0a93b' },
    { id: 'p3', label: '膚色', hex: '#f3e2d2' },
    { id: 'p4', label: '主服裝', hex: '#39456b' },
    { id: 'p5', label: '點綴金', hex: '#d9a441' },
  ],
  sections: [
    { id: 's1', title: '基本資料', group: 'text', fields: [
      { id: 'f1', label: '種族 / 身分', type: 'text', value: '半精靈・星辰守望者' },
      { id: 'f2', label: '年齡', type: 'text', value: '看起來 19，實際 124' },
    ]},
    { id: 's2', title: '繪圖注意', group: 'image', fields: [
      { id: 'f3', label: '必畫重點', type: 'check', value: '髮末藍色漸層、耳尖特徵' },
      { id: 'f4', label: '不可畫錯', type: 'avoid', value: '黑髮' },
    ]},
  ],
  albums: [], templates: [],
}

// ─── Context ─────────────────────────────────────────────────────────────────

const Ctx = createContext<CharacterStore | null>(null)

export function CharacterStoreProvider({
  charId,
  children,
}: { charId: string; children: ReactNode }) {
  const qc = useQueryClient()

  const { data: apiData } = useQuery({
    queryKey: ['character', charId],
    queryFn: () => apiClient<{ character: Record<string, unknown> }>(`/api/app/characters/${charId}`),
    enabled: !!charId,
  })

  const [char, setCharRaw] = useState<Character>(EMPTY_CHAR)
  const [ui, setUi] = useState<UIState>(DEFAULT_UI)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>(() => [
    ...BUILTIN_FORMS,
    ...loadForms(),
  ])

  const initialized = useRef(false)
  const pendingChar = useRef(char)
  const apiCharRef = useRef<Record<string, unknown> | null>(null)

  // Initialize from API once
  useEffect(() => {
    const apiChar = apiData?.character
    if (!apiChar || initialized.current) return
    initialized.current = true
    apiCharRef.current = apiChar
    const gp = (apiChar.generalProfile ?? {}) as Record<string, unknown>
    const tpls = (gp.templates as Template[] | undefined) ?? []
    setCharRaw({
      name: String(apiChar.name ?? ''),
      nickname: String(apiChar.nickname ?? ''),
      tagline: String(gp.tagline ?? ''),
      avatarUrl: String(gp.avatarUrl ?? apiChar.avatarUrl ?? ''),
      mainVisualUrl: String(gp.mainVisualUrl ?? ''),
      palette: (gp.palette as Swatch[] | undefined) ?? [],
      sections: (gp.sections as Section[] | undefined) ?? [],
      albums: (gp.albums as Album[] | undefined) ?? [],
      templates: tpls,
    })
    if (tpls.length > 0) {
      setUi((u) => ({ ...u, activeTpl: tpls[0].id ?? null }))
    }
  }, [apiData])

  // Sync apiCharRef on subsequent loads (for generalProfile spread)
  useEffect(() => {
    if (apiData?.character) apiCharRef.current = apiData.character
  }, [apiData])

  // Debounced auto-save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const c = pendingChar.current
      const existingGp = (apiCharRef.current?.generalProfile ?? {}) as Record<string, unknown>
      setSaving(true)
      setSaveError(false)
      try {
        await apiClient(`/api/app/characters/${charId}`, {
          method: 'PATCH',
          body: {
            name: c.name,
            nickname: c.nickname || undefined,
            generalProfile: {
              ...existingGp,
              tagline: c.tagline || undefined,
              avatarUrl: c.avatarUrl || undefined,
              mainVisualUrl: c.mainVisualUrl || undefined,
              palette: c.palette,
              sections: c.sections,
              albums: c.albums,
              templates: c.templates,
            },
          },
        })
        qc.invalidateQueries({ queryKey: ['character', charId] })
        qc.invalidateQueries({ queryKey: ['characters'] })
      } catch {
        setSaveError(true)
      } finally {
        setSaving(false)
      }
    }, 1500)
  }, [charId, qc])

  const setChar = useCallback((updater: (c: Character) => Character) => {
    setCharRaw((prev) => {
      const next = updater(prev)
      pendingChar.current = next
      scheduleSave()
      return next
    })
  }, [scheduleSave])

  const patchUi = useCallback((p: Partial<UIState>) => setUi((s) => ({ ...s, ...p })), [])

  const activeTemplate = useMemo<Template | null>(() => {
    const ts = char.templates || []
    let id = ui.activeTpl
    if (!ts.find((t) => t.id === id)) id = ts[0]?.id ?? null
    return ts.find((t) => t.id === id) || null
  }, [char.templates, ui.activeTpl])

  const curTplId = useCallback(() => activeTemplate?.id ?? null, [activeTemplate])

  const mutTpl = useCallback((fn: (t: Template) => Template) => {
    const id = curTplId()
    if (!id) return
    setChar((c) => ({
      ...c,
      templates: (c.templates || []).map((t) => (t.id === id ? fn(t) : t)),
    }))
  }, [curTplId, setChar])

  // ── Image upload helpers ───────────────────────────────────────────────────

  const uploadFile = useCallback(async (file: File, endpoint: string) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient<{ url?: string; avatarUrl?: string }>(endpoint, { method: 'POST', body: form })
  }, [])

  const persistForms = useCallback((list: FormTemplate[]) => {
    setFormTemplates(list)
    saveForms(list.filter((t) => !t.builtin))
  }, [])

  // ── Build store ───────────────────────────────────────────────────────────

  const store = useMemo<CharacterStore>(() => ({
    character: char,
    ui,
    activeTemplate,
    saving,
    saveError,
    charId,

    // UI
    setDesignMode: (m) => patchUi({ designMode: m }),
    setDevice: (d) => patchUi({ device: d }),
    setAnnotateMode: (m) => patchUi({ annotateMode: m }),
    setFormTab: (t) => patchUi({ formTab: t }),
    setPreview: (url) => patchUi({ preview: url }),
    openAnnot: (aid, iid) => patchUi({ annot: { aid, iid } }),
    closeAnnot: () => patchUi({ annot: null }),
    openCropper: (field = 'avatarUrl') => patchUi({ cropField: field }),
    closeCropper: () => patchUi({ cropField: null }),
    openEyedrop: () => patchUi({ eyedrop: true }),
    closeEyedrop: () => patchUi({ eyedrop: false }),
    openFormTpl: () => patchUi({ formTpl: true }),
    closeFormTpl: () => patchUi({ formTpl: false }),
    toggleFold: () => patchUi({ fold: !ui.fold }),
    setPageView: (p) => patchUi({ pageView: p }),

    // Core fields
    updateCore: (field, value) => setChar((c) => ({ ...c, [field]: value })),

    // Palette
    addSwatch: () => setChar((c) => ({ ...c, palette: [...(c.palette || []), { id: uid('p'), label: '', hex: '#c98a5e' }] })),
    updateSwatch: (id, k, v) => setChar((c) => ({ ...c, palette: (c.palette || []).map((s) => (s.id === id ? { ...s, [k]: v } : s)) })),
    removeSwatch: (id) => setChar((c) => ({ ...c, palette: (c.palette || []).filter((s) => s.id !== id) })),
    applyPreset: (cols) => setChar((c) => ({ ...c, palette: cols.map((x) => ({ id: uid('p'), label: x.label, hex: x.hex })) })),

    // Sections
    addSection: (group = 'text') => setChar((c) => ({
      ...c, sections: [...(c.sections || []), { id: uid('s'), title: group === 'image' ? '新繪圖規範' : '新區塊', group, fields: [] }],
    })),
    updateSection: (sid, k, v) => setChar((c) => ({ ...c, sections: (c.sections || []).map((s) => s.id === sid ? { ...s, [k]: v } : s) })),
    removeSection: async (sid) => {
      const sec = char.sections.find((s) => s.id === sid)
      const hasContent = sec && sec.fields.some((f) => f.value)
      if (hasContent && !await showConfirm(`裡面已填寫的內容會一併刪除。`, { title: `刪除區塊「${sec?.title || '未命名'}」？`, confirmLabel: '刪除', danger: true })) return
      setChar((c) => ({ ...c, sections: (c.sections || []).filter((s) => s.id !== sid) }))
    },
    addField: (sid, type) => setChar((c) => ({
      ...c, sections: (c.sections || []).map((s) => s.id === sid ? { ...s, fields: [...(s.fields || []), { id: uid('f'), label: '', type, value: '' }] } : s),
    })),
    updateField: (sid, fid, k, v) => setChar((c) => ({
      ...c, sections: (c.sections || []).map((s) => s.id === sid ? { ...s, fields: s.fields.map((f) => f.id === fid ? { ...f, [k]: v } : f) } : s),
    })),
    removeField: (sid, fid) => setChar((c) => ({
      ...c, sections: (c.sections || []).map((s) => s.id === sid ? { ...s, fields: s.fields.filter((f) => f.id !== fid) } : s),
    })),

    // Albums
    addAlbum: (kind = 'gallery') => setChar((c) => ({
      ...c, albums: [...(c.albums || []), { id: uid('a'), name: kind === 'ref' ? '新設定相簿' : '新相簿', kind, images: [] }],
    })),
    updateAlbum: (aid, k, v) => setChar((c) => ({ ...c, albums: (c.albums || []).map((a) => a.id === aid ? { ...a, [k]: v } : a) })),
    removeAlbum: async (aid) => {
      const al = char.albums.find((a) => a.id === aid)
      const hasImgs = al && al.images.length > 0
      if (hasImgs && !await showConfirm(`裡面的 ${al?.images.length} 張圖片會一併刪除。`, { title: `刪除相簿「${al?.name || '未命名'}」？`, confirmLabel: '刪除', danger: true })) return
      setChar((c) => ({ ...c, albums: (c.albums || []).filter((a) => a.id !== aid) }))
    },
    toggleAlbumCollapse: (aid) => patchUi({ albClosed: { ...ui.albClosed, [aid]: !ui.albClosed[aid] } }),
    addImage: (aid) => setChar((c) => ({
      ...c, albums: (c.albums || []).map((a) => a.id === aid ? { ...a, images: [...(a.images || []), { id: uid('i'), url: '', caption: '', annotations: [] }] } : a),
    })),
    updateImage: (aid, iid, k, v) => setChar((c) => ({
      ...c, albums: (c.albums || []).map((a) => a.id === aid ? { ...a, images: a.images.map((im) => im.id === iid ? { ...im, [k]: v } : im) } : a),
    })),
    removeImage: (aid, iid) => setChar((c) => ({
      ...c, albums: (c.albums || []).map((a) => a.id === aid ? { ...a, images: a.images.filter((im) => im.id !== iid) } : a),
    })),

    // Templates
    setActiveTpl: (id) => patchUi({ activeTpl: id, selBlock: null }),
    addTemplate: (kind = '') => {
      const tpl = newTemplate(kind, char as unknown as Parameters<typeof newTemplate>[1])
      setChar((c) => ({ ...c, templates: [...(c.templates || []), tpl] }))
      patchUi({ activeTpl: tpl.id ?? null, selBlock: null })
    },
    renameTemplate: (id, name) => setChar((c) => ({ ...c, templates: (c.templates || []).map((t) => t.id === id ? { ...t, name } : t) })),
    duplicateTemplate: (id) => {
      const t = char.templates.find((x) => x.id === id)
      if (!t) return
      const nid = uid('t')
      const copy: Template = { id: nid, name: `${t.name || '模板'} 複本`, design: { ...DEF_DESIGN, ...(t.design || {}) }, blocks: (t.blocks || []).map((b) => cloneBlk(b)) }
      setChar((c) => ({ ...c, templates: [...(c.templates || []), copy] }))
      patchUi({ activeTpl: nid, selBlock: null })
    },
    removeTemplate: async (id) => {
      const t = char.templates.find((x) => x.id === id)
      if (!await showConfirm('這套版型的所有排版設定都會消失。', { title: `刪除模板「${t?.name || '未命名'}」？`, confirmLabel: '刪除', danger: true })) return
      setChar((c) => ({ ...c, templates: (c.templates || []).filter((x) => x.id !== id) }))
      patchUi({ selBlock: null })
    },

    // Blocks
    selectBlock: (id) => patchUi({ selBlock: id }),
    addBlock: (type) => {
      const nb = makeBlock(type, char as unknown as Parameters<typeof makeBlock>[1])
      const sel = ui.selBlock
      mutTpl((t) => {
        const bs: Block[] = clone(t.blocks || [])
        if (sel) {
          const loc = findParentArr(bs, sel)
          if (loc) { loc.arr.splice(loc.idx + 1, 0, nb); return { ...t, blocks: bs } }
        }
        bs.push(nb)
        return { ...t, blocks: bs }
      })
      patchUi({ selBlock: nb.id })
    },
    removeBlock: (id) => {
      mutTpl((t) => ({ ...t, blocks: removeTree(t.blocks, id) }))
      if (ui.selBlock === id) patchUi({ selBlock: null })
    },
    duplicateBlock: (id) => {
      const nid = uid('b')
      mutTpl((t) => {
        const bs: Block[] = clone(t.blocks || [])
        const loc = findParentArr(bs, id)
        if (!loc) return t
        const copy = cloneBlk(loc.arr[loc.idx])
        copy.id = nid
        loc.arr.splice(loc.idx + 1, 0, copy)
        return { ...t, blocks: bs }
      })
      patchUi({ selBlock: nid })
    },
    moveBlockDir: (id, dir) => mutTpl((t) => {
      const bs: Block[] = clone(t.blocks || [])
      const loc = findParentArr(bs, id)
      if (!loc) return t
      const ni = loc.idx + dir
      if (ni < 0 || ni >= loc.arr.length) return t
      const tmp = loc.arr[ni]; loc.arr[ni] = loc.arr[loc.idx]; loc.arr[loc.idx] = tmp
      return { ...t, blocks: bs }
    }),
    updateBlock: (id, k, v) => mutTpl((t) => ({ ...t, blocks: mapTree(t.blocks, id, (b) => ({ ...b, [k]: v })) })),
    updateBlockStyle: (id, k, v) => mutTpl((t) => ({ ...t, blocks: mapTree(t.blocks, id, (b) => ({ ...b, style: { ...(b.style || {}), [k]: v } })) })),
    updateDesign: (k, v) => mutTpl((t) => ({ ...t, design: { ...DEF_DESIGN, ...(t.design || {}), [k]: v } })),

    // Drag / columns
    moveBlock: (fromId, toId, pos) => {
      if (fromId === toId) return
      mutTpl((t) => {
        const bs: Block[] = clone(t.blocks || [])
        const b = detachFrom(bs, fromId)
        if (!b) return t
        const after = pos === 'after'
        if (b.type === 'columns') {
          if (bs.some((x) => x.id === toId)) insertRelId(bs, toId, b, after)
          else bs.push(b)
        } else if (!insertRelId(bs, toId, b, after)) { bs.push(b) }
        return { ...t, blocks: bs }
      })
    },
    dropToColumn: (fromId, colId, ci) => {
      if (fromId === colId) return
      mutTpl((t) => {
        const bs: Block[] = clone(t.blocks || [])
        const b = detachFrom(bs, fromId)
        if (!b || b.type === 'columns') return t
        const col = bs.find((x) => x.id === colId)
        if (!col) return t
        if (!col.children) col.children = []
        while (col.children.length <= ci) col.children.push([])
        col.children[ci].push(b)
        return { ...t, blocks: bs }
      })
    },
    colResize: (colId, i, a, b) => mutTpl((t) => ({
      ...t, blocks: (t.blocks || []).map((x) => {
        if (x.id !== colId) return x
        const w = (x.widths || []).slice(); w[i] = a; w[i + 1] = b
        return { ...x, widths: w }
      }),
    })),
    setCols: (colId, n) => mutTpl((t) => ({
      ...t, blocks: (t.blocks || []).map((x) => {
        if (x.id !== colId) return x
        const ch = (x.children || []).slice()
        if (n > ch.length) while (ch.length < n) ch.push([])
        else if (n < ch.length) { const extra = ch.splice(n); extra.forEach((col) => { ch[n - 1] = ch[n - 1].concat(col) }) }
        const even = Math.round(100 / n)
        return { ...x, cols: n, children: ch, widths: ch.map(() => even) }
      }),
    })),
    setColWidth: (colId, ci, val) => mutTpl((t) => ({
      ...t, blocks: (t.blocks || []).map((x) => {
        if (x.id !== colId) return x
        const w = (x.widths || []).slice(); w[ci] = val
        return { ...x, widths: w }
      }),
    })),
    moveColChild: (childId, dir) => mutTpl((t) => {
      const bs: Block[] = clone(t.blocks || [])
      for (const col of bs) {
        if (col.type === 'columns' && col.children) {
          for (let ci = 0; ci < col.children.length; ci++) {
            const j = col.children[ci].findIndex((x) => x.id === childId)
            if (j >= 0) {
              const ni = ci + dir
              if (ni < 0 || ni >= col.children.length) return t
              const [blk] = col.children[ci].splice(j, 1)
              col.children[ni].push(blk)
              return { ...t, blocks: bs }
            }
          }
        }
      }
      return t
    }),
    moveOut: (id) => mutTpl((t) => {
      const bs: Block[] = clone(t.blocks || [])
      const b = detachFrom(bs, id)
      if (!b) return t
      bs.push(b)
      return { ...t, blocks: bs }
    }),
    autoPaginate: (beforeIds) => {
      if (!beforeIds.length) return
      const set = new Set(beforeIds)
      mutTpl((t) => {
        const out: Block[] = []
        ;(t.blocks || []).forEach((b) => {
          if (set.has(b.id)) out.push({ id: uid('b'), type: 'pagebreak' })
          out.push(b)
        })
        return { ...t, blocks: out }
      })
    },

    // Badges
    addTag: (blockId) => mutTpl((t) => ({ ...t, blocks: mapTree(t.blocks, blockId, (b) => ({ ...b, tags: [...(b.tags || []), { id: uid('tg'), label: '新標籤', color: '#c98a5e' }] })) })),
    updateTag: (blockId, tagId, k, v) => mutTpl((t) => ({ ...t, blocks: mapTree(t.blocks, blockId, (b) => ({ ...b, tags: (b.tags || []).map((x) => x.id === tagId ? { ...x, [k]: v } : x) })) })),
    removeTag: (blockId, tagId) => mutTpl((t) => ({ ...t, blocks: mapTree(t.blocks, blockId, (b) => ({ ...b, tags: (b.tags || []).filter((x) => x.id !== tagId) })) })),

    // Color library
    libColors: () => activeTemplate?.design?.library || DEF_DESIGN.library || [],
    addLibColor: (hex) => {
      const cur = activeTemplate?.design?.library || DEF_DESIGN.library || []
      if (cur.includes(hex)) return
      mutTpl((t) => ({ ...t, design: { ...DEF_DESIGN, ...(t.design || {}), library: [...cur, hex] } }))
    },
    removeLibColor: (hex) => {
      const cur = activeTemplate?.design?.library || DEF_DESIGN.library || []
      mutTpl((t) => ({ ...t, design: { ...DEF_DESIGN, ...(t.design || {}), library: cur.filter((x) => x !== hex) } }))
    },

    // Image uploads (API)
    uploadCore: (field) => {
      const inp = document.createElement('input')
      inp.type = 'file'; inp.accept = 'image/*'
      inp.onchange = async () => {
        const file = inp.files?.[0]; if (!file) return
        const compressed = await compressImage(file)
        if (field === 'avatarUrl') {
          const res = await uploadFile(compressed, `/api/app/characters/${charId}/avatar`)
          if (res.avatarUrl) setChar((c) => ({ ...c, avatarUrl: res.avatarUrl! }))
        } else {
          const res = await uploadFile(compressed, `/api/app/characters/${charId}/main-visual`)
          if (res.url) setChar((c) => ({ ...c, mainVisualUrl: res.url! }))
        }
      }
      inp.click()
    },
    uploadAlbumImage: (aid, iid) => {
      const inp = document.createElement('input')
      inp.type = 'file'; inp.accept = 'image/*'
      inp.onchange = async () => {
        const file = inp.files?.[0]; if (!file) return
        const res = await uploadFile(file, `/api/app/characters/${charId}/upload`)
        if (res.url) setChar((c) => ({
          ...c, albums: (c.albums || []).map((a) => a.id === aid ? { ...a, images: a.images.map((im) => im.id === iid ? { ...im, url: res.url! } : im) } : a),
        }))
      }
      inp.click()
    },
    uploadManyImages: (aid) => {
      const inp = document.createElement('input')
      inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true
      inp.onchange = async () => {
        const files = Array.from(inp.files ?? [])
        for (const file of files) {
          const res = await uploadFile(file, `/api/app/characters/${charId}/upload`)
          if (res.url) setChar((c) => ({
            ...c, albums: (c.albums || []).map((a) => a.id === aid ? { ...a, images: [...(a.images || []), { id: uid('i'), url: res.url!, caption: '', annotations: [] }] } : a),
          }))
        }
      }
      inp.click()
    },
    uploadBg: () => {
      const inp = document.createElement('input')
      inp.type = 'file'; inp.accept = 'image/*'
      inp.onchange = async () => {
        const file = inp.files?.[0]; if (!file) return
        const res = await uploadFile(file, `/api/app/characters/${charId}/upload`)
        if (res.url) mutTpl((t) => ({ ...t, design: { ...DEF_DESIGN, ...(t.design || {}), bgImage: res.url } }))
      }
      inp.click()
    },

    // Eyedropper
    addSwatchHex: (hex) => setChar((c) => ({ ...c, palette: [...(c.palette || []), { id: uid('p'), label: '', hex }] })),

    // Annotations
    addAnno: (aid, iid, partial) => setChar((c) => ({
      ...c, albums: (c.albums || []).map((al) => al.id === aid ? {
        ...al, images: al.images.map((im) => im.id === iid ? {
          ...im, annotations: [...(im.annotations || []), { id: uid('an'), kind: 'pin', x: 0.5, y: 0.5, label: '', note: '', ...partial } as Annotation],
        } : im),
      } : al),
    })),
    updateAnno: (aid, iid, annId, k, v) => setChar((c) => ({
      ...c, albums: (c.albums || []).map((al) => al.id === aid ? {
        ...al, images: al.images.map((im) => im.id === iid ? { ...im, annotations: im.annotations.map((an) => an.id === annId ? { ...an, [k]: v } : an) } : im),
      } : al),
    })),
    removeAnno: (aid, iid, annId) => setChar((c) => ({
      ...c, albums: (c.albums || []).map((al) => al.id === aid ? {
        ...al, images: al.images.map((im) => im.id === iid ? { ...im, annotations: im.annotations.filter((an) => an.id !== annId) } : im),
      } : al),
    })),
    setAnnotations: (aid, iid, anns) => setChar((c) => ({
      ...c, albums: (c.albums || []).map((al) => al.id === aid ? {
        ...al, images: al.images.map((im) => im.id === iid ? { ...im, annotations: anns } : im),
      } : al),
    })),

    // Form templates
    formTemplates,
    exportChar: () => {
      const blob = new Blob([JSON.stringify(char, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = (char.name || 'character') + '-octool.json'; a.click()
      URL.revokeObjectURL(url)
    },
    importCharFile: () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json'
      inp.onchange = () => {
        const f = inp.files?.[0]; if (!f) return
        const fr = new FileReader()
        fr.onload = () => {
          try {
            const obj = JSON.parse(String(fr.result))
            if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
              const c = obj as Character
              setChar(() => c)
              patchUi({ selBlock: null })
            } else alert('檔案格式不正確')
          } catch { alert('檔案讀取失敗') }
        }
        fr.readAsText(f)
      }
      inp.click()
    },
    saveFormTemplate: () => {
      const name = prompt('表單格式名稱：', '我的格式'); if (!name) return
      const tpl: FormTemplate = { id: 'f' + Date.now().toString(36), name, sections: schemaFromSections(char.sections as Parameters<typeof schemaFromSections>[0]) }
      const next = [...formTemplates, tpl]
      persistForms(next)
    },
    applyFormTemplate: async (tpl) => {
      if (!await showConfirm('這會換掉目前的設定區塊（但不影響模板和圖庫）。', { title: `套用「${tpl.name || ''}」格式？`, confirmLabel: '套用' })) return
      const newSections = sectionsFromSchema(tpl.sections) as Section[]
      setChar((c) => ({ ...c, sections: newSections }))
    },
    removeFormTemplate: (id) => persistForms(formTemplates.filter((t) => t.id !== id)),
    exportFormTemplate: () => {
      const user = formTemplates.filter((t) => !t.builtin)
      if (!user.length) { alert('還沒有自訂格式。'); return }
      const blob = new Blob([JSON.stringify(user, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'form-templates.json'; a.click()
      URL.revokeObjectURL(url)
    },
    importFormTemplate: () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json'
      inp.onchange = () => {
        const f = inp.files?.[0]; if (!f) return
        const fr = new FileReader()
        fr.onload = () => {
          try {
            const arr = JSON.parse(String(fr.result))
            if (!Array.isArray(arr)) throw new Error()
            const imported: FormTemplate[] = arr.map((t: unknown) => ({ id: uid('f'), name: (t as FormTemplate).name || '匯入格式', sections: (t as FormTemplate).sections || [] }))
            persistForms([...formTemplates, ...imported])
          } catch { alert('格式檔案讀取失敗。') }
        }
        fr.readAsText(f)
      }
      inp.click()
    },

    // Whole-character ops
    resetDemo: async () => {
      if (!await showConfirm('這會覆蓋目前的名稱、暱稱、一句話、文設定、色票，且無法還原。', { title: '載入範例角色？', confirmLabel: '載入', danger: true })) return
      setChar(() => clone(DEMO))
      patchUi({ selBlock: null })
    },
    clearAll: async () => {
      if (!await showConfirm('這個動作會清空全部欄位，且無法還原。', { title: '清空全部欄位？', confirmLabel: '清空', danger: true })) return
      setChar(() => ({ ...EMPTY_CHAR }))
      patchUi({ selBlock: null })
    },
    importCharacter: (c) => {
      setChar(() => clone(c))
      patchUi({ selBlock: null })
    },
  }), [char, ui, activeTemplate, saving, saveError, charId, mutTpl, patchUi, setChar, formTemplates, persistForms, uploadFile])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useCharacterStore(): CharacterStore {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCharacterStore must be used inside CharacterStoreProvider')
  return ctx
}
