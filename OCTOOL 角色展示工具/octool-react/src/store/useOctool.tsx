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
import type {
  AnnotateMode,
  Annotation,
  Block,
  BlockType,
  Character,
  DeviceKey,
  DesignMode,
  FieldType,
  FormTab,
  PersistedState,
  Template,
  ThemeKey,
  ViewKey,
  Visibility,
} from '../types'
import { DEMO } from '../data/demo'
import { THEMES } from '../data/themes'
import {
  BUILTIN_FORMS,
  DEF_DESIGN,
  FORMS_KEY,
  cloneBlk,
  detachFrom,
  findParentArr,
  insertRelId,
  loadForms,
  makeBlock,
  mapTree,
  newTemplate,
  removeTree,
  schemaFromSections,
  sectionsFromSchema,
  uid,
  type FormTemplate,
} from '../data/blocks'
import { downloadJSON, pickImage, pickImages, pickJSON } from '../data/upload'

const KEY = 'octool:react:v1'

interface UIState {
  view: ViewKey
  designMode: DesignMode
  theme: ThemeKey
  device: DeviceKey
  annotateMode: AnnotateMode
  formTab: FormTab
  activeTpl: string | null
  selBlock: string | null
  albClosed: Record<string, boolean>
  preview: string | null
  visibility: Visibility
  // modals
  annot: { aid: string; iid: string } | null
  cropField: 'avatarUrl' | 'mainVisualUrl' | null
  eyedrop: boolean
  formTpl: boolean
  fold: boolean
  pageView: number | 'all'
}

function loadPersisted(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) || {}
  } catch {
    /* ignore */
  }
  return {}
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export interface OctoolStore {
  // state
  character: Character
  ui: UIState
  // derived
  activeTemplate: Template | null
  // ui setters
  setView: (v: ViewKey) => void
  setDesignMode: (m: DesignMode) => void
  setTheme: (t: ThemeKey) => void
  setDevice: (d: DeviceKey) => void
  setAnnotateMode: (m: AnnotateMode) => void
  setFormTab: (t: FormTab) => void
  setPreview: (url: string | null) => void
  // modal toggles
  openAnnot: (aid: string, iid: string) => void
  closeAnnot: () => void
  openCropper: (field: 'avatarUrl' | 'mainVisualUrl') => void
  closeCropper: () => void
  openEyedrop: () => void
  closeEyedrop: () => void
  openFormTpl: () => void
  closeFormTpl: () => void
  toggleFold: () => void
  setPageView: (p: number | 'all') => void
  // core fields
  updateCore: (field: keyof Character, value: string) => void
  // palette
  addSwatch: () => void
  updateSwatch: (id: string, k: 'label' | 'hex', v: string) => void
  removeSwatch: (id: string) => void
  applyPreset: (cols: { label: string; hex: string }[]) => void
  // sections
  addSection: (group?: 'text' | 'image') => void
  updateSection: (sid: string, k: 'title' | 'group', v: string) => void
  removeSection: (sid: string) => void
  addField: (sid: string, type: FieldType) => void
  updateField: (sid: string, fid: string, k: 'label' | 'type' | 'value', v: string) => void
  removeField: (sid: string, fid: string) => void
  // albums
  addAlbum: (kind?: 'gallery' | 'ref') => void
  updateAlbum: (aid: string, k: 'name' | 'linkRef', v: string) => void
  removeAlbum: (aid: string) => void
  toggleAlbumCollapse: (aid: string) => void
  addImage: (aid: string) => void
  updateImage: (aid: string, iid: string, k: 'url' | 'caption', v: string) => void
  removeImage: (aid: string, iid: string) => void
  // templates
  setActiveTpl: (id: string) => void
  addTemplate: (kind: string) => void
  renameTemplate: (id: string, name: string) => void
  duplicateTemplate: (id: string) => void
  removeTemplate: (id: string) => void
  // blocks
  selectBlock: (id: string | null) => void
  addBlock: (type: BlockType) => void
  removeBlock: (id: string) => void
  duplicateBlock: (id: string) => void
  moveBlockDir: (id: string, dir: 1 | -1) => void
  updateBlock: (id: string, k: string, v: unknown) => void
  updateBlockStyle: (id: string, k: string, v: unknown) => void
  updateDesign: (k: string, v: unknown) => void
  // drag / columns
  moveBlock: (fromId: string, toId: string, pos: 'before' | 'after') => void
  dropToColumn: (fromId: string, colId: string, ci: number) => void
  colResize: (colId: string, i: number, a: number, b: number) => void
  setCols: (colId: string, n: number) => void
  setColWidth: (colId: string, ci: number, val: number) => void
  moveColChild: (childId: string, dir: 1 | -1) => void
  moveOut: (id: string) => void
  autoPaginate: (beforeIds: string[]) => void
  // badges (tags on selected block)
  addTag: (blockId: string) => void
  updateTag: (blockId: string, tagId: string, k: 'label' | 'color', v: string) => void
  removeTag: (blockId: string, tagId: string) => void
  // color library (per template design)
  libColors: () => string[]
  addLibColor: (hex: string) => void
  removeLibColor: (hex: string) => void
  // image upload
  uploadCore: (field: 'avatarUrl' | 'mainVisualUrl') => void
  uploadAlbumImage: (aid: string, iid: string) => void
  uploadManyImages: (aid: string) => void
  uploadBg: () => void
  // palette via eyedropper
  addSwatchHex: (hex: string) => void
  // annotations
  addAnno: (aid: string, iid: string, partial: Partial<Annotation>) => void
  updateAnno: (aid: string, iid: string, annId: string, k: 'label' | 'note', v: string) => void
  removeAnno: (aid: string, iid: string, annId: string) => void
  // backup & format
  formTemplates: FormTemplate[]
  exportChar: () => void
  importCharFile: () => void
  saveFormTemplate: () => void
  applyFormTemplate: (tpl: FormTemplate) => void
  removeFormTemplate: (id: string) => void
  exportFormTemplate: () => void
  importFormTemplate: () => void
  // whole-character ops
  resetDemo: () => void
  clearAll: () => void
  importCharacter: (c: Character) => void
}

const Ctx = createContext<OctoolStore | null>(null)

export function OctoolProvider({ children }: { children: ReactNode }) {
  const saved = useRef(loadPersisted())

  const [character, setCharacter] = useState<Character>(
    () => saved.current.character || clone(DEMO),
  )
  const [ui, setUi] = useState<UIState>(() => {
    const s = saved.current
    return {
      view: s.view === 'design' ? 'design' : s.view === 'help' ? 'help' : 'form',
      designMode: s.designMode === 'preview' ? 'preview' : 'edit',
      theme: s.theme && THEMES[s.theme] ? s.theme : 'cream',
      device:
        s.device || (typeof window !== 'undefined' && window.innerWidth < 900 ? 'phone' : 'desktop'),
      annotateMode: s.annotateMode || 'list',
      formTab: 'basic',
      activeTpl: s.activeTpl || null,
      selBlock: null,
      albClosed: {},
      preview: null,
      visibility: s.visibility || { sections: {}, palette: true, albums: true },
      annot: null,
      cropField: null,
      eyedrop: false,
      formTpl: false,
      fold: false,
      pageView: 'all',
    }
  })

  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>(() => [
    ...BUILTIN_FORMS,
    ...loadForms(),
  ])

  const persistForms = useCallback((list: FormTemplate[]) => {
    try {
      localStorage.setItem(FORMS_KEY, JSON.stringify(list.filter((t) => !t.builtin)))
    } catch {
      /* ignore */
    }
  }, [])

  // persistence — mirrors persist() in the original
  useEffect(() => {
    try {
      const data: PersistedState = {
        view: ui.view,
        designMode: ui.designMode,
        character,
        template: 'sheet',
        annotateMode: ui.annotateMode,
        theme: ui.theme,
        visibility: ui.visibility,
        activeTpl: ui.activeTpl,
        device: ui.device,
      }
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* quota / private mode — ignore */
    }
  }, [character, ui])

  const patchUi = useCallback((p: Partial<UIState>) => setUi((s) => ({ ...s, ...p })), [])

  // ---- derived ----
  const activeTemplate = useMemo<Template | null>(() => {
    const ts = character.templates || []
    let id = ui.activeTpl
    if (!ts.find((t) => t.id === id)) id = ts[0]?.id ?? null
    return ts.find((t) => t.id === id) || null
  }, [character.templates, ui.activeTpl])

  const curTplId = useCallback(() => activeTemplate?.id ?? null, [activeTemplate])

  // ---- helpers ----
  const mutTpl = useCallback(
    (fn: (t: Template) => Template) => {
      const id = curTplId()
      if (!id) return
      setCharacter((c) => ({
        ...c,
        templates: (c.templates || []).map((t) => (t.id === id ? fn(t) : t)),
      }))
    },
    [curTplId],
  )

  // ---- build the store object ----
  const store = useMemo<OctoolStore>(() => {
    const setChar = (updater: (c: Character) => Character) => setCharacter(updater)

    return {
      character,
      ui,
      activeTemplate,

      setView: (v) => patchUi({ view: v }),
      setDesignMode: (m) => patchUi({ designMode: m }),
      setTheme: (t) => patchUi({ theme: t }),
      setDevice: (d) => patchUi({ device: d }),
      setAnnotateMode: (m) => patchUi({ annotateMode: m }),
      setFormTab: (t) => patchUi({ formTab: t }),
      setPreview: (url) => patchUi({ preview: url }),
      openAnnot: (aid, iid) => patchUi({ annot: { aid, iid } }),
      closeAnnot: () => patchUi({ annot: null }),
      openCropper: (field) => patchUi({ cropField: field }),
      closeCropper: () => patchUi({ cropField: null }),
      openEyedrop: () => patchUi({ eyedrop: true }),
      closeEyedrop: () => patchUi({ eyedrop: false }),
      openFormTpl: () => patchUi({ formTpl: true }),
      closeFormTpl: () => patchUi({ formTpl: false }),
      toggleFold: () => patchUi({ fold: !ui.fold }),
      setPageView: (p) => patchUi({ pageView: p }),

      updateCore: (field, value) => setChar((c) => ({ ...c, [field]: value })),

      // palette
      addSwatch: () =>
        setChar((c) => ({
          ...c,
          palette: [...(c.palette || []), { id: uid('p'), label: '', hex: '#c98a5e' }],
        })),
      updateSwatch: (id, k, v) =>
        setChar((c) => ({
          ...c,
          palette: (c.palette || []).map((s) => (s.id === id ? { ...s, [k]: v } : s)),
        })),
      removeSwatch: (id) =>
        setChar((c) => ({ ...c, palette: (c.palette || []).filter((s) => s.id !== id) })),
      applyPreset: (cols) =>
        setChar((c) => ({
          ...c,
          palette: cols.map((x) => ({ id: uid('p'), label: x.label, hex: x.hex })),
        })),

      // sections
      addSection: (group) =>
        setChar((c) => ({
          ...c,
          sections: [
            ...(c.sections || []),
            {
              id: uid('s'),
              title: group === 'image' ? '新繪圖規範' : '新區塊',
              group: group || 'text',
              fields: [],
            },
          ],
        })),
      updateSection: (sid, k, v) =>
        setChar((c) => ({
          ...c,
          sections: (c.sections || []).map((s) =>
            s.id === sid ? { ...s, [k]: v } : s,
          ),
        })),
      removeSection: (sid) => {
        const sec = (character.sections || []).find((s) => s.id === sid)
        const hasContent = sec && (sec.fields || []).some((f) => f.value)
        if (
          hasContent &&
          !confirm(`刪除區塊「${sec?.title || '未命名'}」？\n\n裡面已填寫的內容會一併刪除。`)
        )
          return
        setChar((c) => ({ ...c, sections: (c.sections || []).filter((s) => s.id !== sid) }))
      },
      addField: (sid, type) =>
        setChar((c) => ({
          ...c,
          sections: (c.sections || []).map((s) =>
            s.id === sid
              ? { ...s, fields: [...(s.fields || []), { id: uid('f'), label: '', type, value: '' }] }
              : s,
          ),
        })),
      updateField: (sid, fid, k, v) =>
        setChar((c) => ({
          ...c,
          sections: (c.sections || []).map((s) =>
            s.id === sid
              ? { ...s, fields: s.fields.map((f) => (f.id === fid ? { ...f, [k]: v } : f)) }
              : s,
          ),
        })),
      removeField: (sid, fid) =>
        setChar((c) => ({
          ...c,
          sections: (c.sections || []).map((s) =>
            s.id === sid ? { ...s, fields: s.fields.filter((f) => f.id !== fid) } : s,
          ),
        })),

      // albums
      addAlbum: (kind) =>
        setChar((c) => ({
          ...c,
          albums: [
            ...(c.albums || []),
            {
              id: uid('a'),
              name: kind === 'ref' ? '新設定相簿' : '新相簿',
              kind: kind || 'gallery',
              images: [],
            },
          ],
        })),
      updateAlbum: (aid, k, v) =>
        setChar((c) => ({
          ...c,
          albums: (c.albums || []).map((a) => (a.id === aid ? { ...a, [k]: v } : a)),
        })),
      removeAlbum: (aid) => {
        const al = (character.albums || []).find((a) => a.id === aid)
        const hasImgs = al && (al.images || []).length > 0
        if (
          hasImgs &&
          !confirm(
            `刪除相簿「${al?.name || '未命名'}」？\n\n裡面的 ${al?.images.length} 張圖片會一併刪除。`,
          )
        )
          return
        setChar((c) => ({ ...c, albums: (c.albums || []).filter((a) => a.id !== aid) }))
      },
      toggleAlbumCollapse: (aid) =>
        patchUi({ albClosed: { ...ui.albClosed, [aid]: !ui.albClosed[aid] } }),
      addImage: (aid) =>
        setChar((c) => ({
          ...c,
          albums: (c.albums || []).map((a) =>
            a.id === aid
              ? { ...a, images: [...(a.images || []), { id: uid('i'), url: '', caption: '', annotations: [] }] }
              : a,
          ),
        })),
      updateImage: (aid, iid, k, v) =>
        setChar((c) => ({
          ...c,
          albums: (c.albums || []).map((a) =>
            a.id === aid
              ? { ...a, images: a.images.map((im) => (im.id === iid ? { ...im, [k]: v } : im)) }
              : a,
          ),
        })),
      removeImage: (aid, iid) =>
        setChar((c) => ({
          ...c,
          albums: (c.albums || []).map((a) =>
            a.id === aid ? { ...a, images: a.images.filter((im) => im.id !== iid) } : a,
          ),
        })),

      // templates
      setActiveTpl: (id) => patchUi({ activeTpl: id, selBlock: null }),
      addTemplate: (kind) => {
        const tpl = newTemplate(kind, character)
        setChar((c) => ({ ...c, templates: [...(c.templates || []), tpl] }))
        patchUi({ activeTpl: tpl.id, selBlock: null })
      },
      renameTemplate: (id, name) =>
        setChar((c) => ({
          ...c,
          templates: (c.templates || []).map((t) => (t.id === id ? { ...t, name } : t)),
        })),
      duplicateTemplate: (id) => {
        const t = (character.templates || []).find((x) => x.id === id)
        if (!t) return
        const nid = uid('t')
        const copy: Template = {
          id: nid,
          name: `${t.name || '模板'} 複本`,
          design: { ...DEF_DESIGN, ...(t.design || {}) },
          blocks: (t.blocks || []).map((b) => cloneBlk(b)),
        }
        setChar((c) => ({ ...c, templates: [...(c.templates || []), copy] }))
        patchUi({ activeTpl: nid, selBlock: null })
      },
      removeTemplate: (id) => {
        const t = (character.templates || []).find((x) => x.id === id)
        if (!confirm(`刪除模板「${t?.name || '未命名'}」？\n\n這套版型的所有排版設定都會消失。`)) return
        setChar((c) => ({ ...c, templates: (c.templates || []).filter((x) => x.id !== id) }))
        patchUi({ selBlock: null })
      },

      // blocks
      selectBlock: (id) => patchUi({ selBlock: id }),
      addBlock: (type) => {
        const nb = makeBlock(type, character)
        const sel = ui.selBlock
        mutTpl((t) => {
          const bs: Block[] = clone(t.blocks || [])
          if (sel) {
            const loc = findParentArr(bs, sel)
            if (loc) {
              loc.arr.splice(loc.idx + 1, 0, nb)
              return { ...t, blocks: bs }
            }
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
      moveBlockDir: (id, dir) =>
        mutTpl((t) => {
          const bs: Block[] = clone(t.blocks || [])
          const loc = findParentArr(bs, id)
          if (!loc) return t
          const ni = loc.idx + dir
          if (ni < 0 || ni >= loc.arr.length) return t
          const tmp = loc.arr[ni]
          loc.arr[ni] = loc.arr[loc.idx]
          loc.arr[loc.idx] = tmp
          return { ...t, blocks: bs }
        }),
      updateBlock: (id, k, v) =>
        mutTpl((t) => ({ ...t, blocks: mapTree(t.blocks, id, (b) => ({ ...b, [k]: v })) })),
      updateBlockStyle: (id, k, v) =>
        mutTpl((t) => ({
          ...t,
          blocks: mapTree(t.blocks, id, (b) => ({ ...b, style: { ...(b.style || {}), [k]: v } })),
        })),
      updateDesign: (k, v) =>
        mutTpl((t) => ({ ...t, design: { ...DEF_DESIGN, ...(t.design || {}), [k]: v } })),

      // drag / columns
      moveBlock: (fromId, toId, pos) => {
        if (fromId === toId) return
        mutTpl((t) => {
          const bs: Block[] = clone(t.blocks || [])
          const b = detachFrom(bs, fromId)
          if (!b) return t
          const after = pos === 'after'
          if (b.type === 'columns') {
            const top = bs.some((x) => x.id === toId)
            if (top) insertRelId(bs, toId, b, after)
            else bs.push(b)
          } else if (!insertRelId(bs, toId, b, after)) {
            bs.push(b)
          }
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
      colResize: (colId, i, a, b) =>
        mutTpl((t) => ({
          ...t,
          blocks: (t.blocks || []).map((x) => {
            if (x.id !== colId) return x
            const w = (x.widths || []).slice()
            w[i] = a
            w[i + 1] = b
            return { ...x, widths: w }
          }),
        })),
      setCols: (colId, n) =>
        mutTpl((t) => ({
          ...t,
          blocks: (t.blocks || []).map((x) => {
            if (x.id !== colId) return x
            const ch = (x.children || []).slice()
            if (n > ch.length) {
              while (ch.length < n) ch.push([])
            } else if (n < ch.length) {
              const extra = ch.slice(n)
              ch.length = n
              extra.forEach((col) => {
                ch[n - 1] = ch[n - 1].concat(col)
              })
            }
            const even = Math.round(100 / n)
            return { ...x, cols: n, children: ch, widths: ch.map(() => even) }
          }),
        })),
      setColWidth: (colId, ci, val) =>
        mutTpl((t) => ({
          ...t,
          blocks: (t.blocks || []).map((x) => {
            if (x.id !== colId) return x
            const w = (x.widths || []).slice()
            w[ci] = val
            return { ...x, widths: w }
          }),
        })),
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
      moveColChild: (childId, dir) =>
        mutTpl((t) => {
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
      moveOut: (id) =>
        mutTpl((t) => {
          const bs: Block[] = clone(t.blocks || [])
          const b = detachFrom(bs, id)
          if (!b) return t
          bs.push(b)
          return { ...t, blocks: bs }
        }),

      // badges
      addTag: (blockId) =>
        mutTpl((t) => ({
          ...t,
          blocks: mapTree(t.blocks, blockId, (b) => ({
            ...b,
            tags: [...(b.tags || []), { id: uid('tg'), label: '新標籤', color: '#c98a5e' }],
          })),
        })),
      updateTag: (blockId, tagId, k, v) =>
        mutTpl((t) => ({
          ...t,
          blocks: mapTree(t.blocks, blockId, (b) => ({
            ...b,
            tags: (b.tags || []).map((x) => (x.id === tagId ? { ...x, [k]: v } : x)),
          })),
        })),
      removeTag: (blockId, tagId) =>
        mutTpl((t) => ({
          ...t,
          blocks: mapTree(t.blocks, blockId, (b) => ({
            ...b,
            tags: (b.tags || []).filter((x) => x.id !== tagId),
          })),
        })),

      // color library
      libColors: () => activeTemplate?.design?.library || DEF_DESIGN.library || [],
      addLibColor: (hex) => {
        const cur = activeTemplate?.design?.library || DEF_DESIGN.library || []
        if (cur.indexOf(hex) >= 0) return
        mutTpl((t) => ({ ...t, design: { ...DEF_DESIGN, ...(t.design || {}), library: [...cur, hex] } }))
      },
      removeLibColor: (hex) => {
        const cur = activeTemplate?.design?.library || DEF_DESIGN.library || []
        mutTpl((t) => ({ ...t, design: { ...DEF_DESIGN, ...(t.design || {}), library: cur.filter((x) => x !== hex) } }))
      },

      // image upload
      uploadCore: (field) => pickImage((url) => setChar((c) => ({ ...c, [field]: url }))),
      uploadAlbumImage: (aid, iid) =>
        pickImage((url) =>
          setChar((c) => ({
            ...c,
            albums: (c.albums || []).map((a) =>
              a.id === aid ? { ...a, images: a.images.map((im) => (im.id === iid ? { ...im, url } : im)) } : a,
            ),
          })),
        ),
      uploadManyImages: (aid) =>
        pickImages((url) =>
          setChar((c) => ({
            ...c,
            albums: (c.albums || []).map((a) =>
              a.id === aid ? { ...a, images: [...(a.images || []), { id: uid('i'), url, caption: '', annotations: [] }] } : a,
            ),
          })),
        ),
      uploadBg: () =>
        pickImage((url) => mutTpl((t) => ({ ...t, design: { ...DEF_DESIGN, ...(t.design || {}), bgImage: url } }))),

      // eyedropper
      addSwatchHex: (hex) =>
        setChar((c) => ({ ...c, palette: [...(c.palette || []), { id: uid('p'), label: '', hex }] })),

      // annotations
      addAnno: (aid, iid, partial) =>
        setChar((c) => ({
          ...c,
          albums: (c.albums || []).map((al) =>
            al.id === aid
              ? {
                  ...al,
                  images: al.images.map((im) =>
                    im.id === iid
                      ? { ...im, annotations: [...(im.annotations || []), { id: uid('an'), kind: 'pin', x: 0.5, y: 0.5, label: '', note: '', ...partial } as Annotation] }
                      : im,
                  ),
                }
              : al,
          ),
        })),
      updateAnno: (aid, iid, annId, k, v) =>
        setChar((c) => ({
          ...c,
          albums: (c.albums || []).map((al) =>
            al.id === aid
              ? { ...al, images: al.images.map((im) => (im.id === iid ? { ...im, annotations: im.annotations.map((an) => (an.id === annId ? { ...an, [k]: v } : an)) } : im)) }
              : al,
          ),
        })),
      removeAnno: (aid, iid, annId) =>
        setChar((c) => ({
          ...c,
          albums: (c.albums || []).map((al) =>
            al.id === aid
              ? { ...al, images: al.images.map((im) => (im.id === iid ? { ...im, annotations: im.annotations.filter((an) => an.id !== annId) } : im)) }
              : al,
          ),
        })),

      // backup & format
      formTemplates,
      exportChar: () => downloadJSON((character.name || 'character') + '-octool.json', character),
      importCharFile: () =>
        pickJSON((obj) => {
          if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            setCharacter(obj as Character)
            patchUi({ selBlock: null })
          } else alert('檔案格式不正確')
        }),
      saveFormTemplate: () => {
        const name = prompt('表單格式名稱：', '我的格式')
        if (!name) return
        const tpl: FormTemplate = { id: 'f' + Date.now().toString(36), name, sections: schemaFromSections(character.sections) }
        setFormTemplates((list) => {
          const next = [...list, tpl]
          persistForms(next)
          return next
        })
      },
      applyFormTemplate: (tpl) => {
        setChar((c) => ({ ...c, sections: sectionsFromSchema(tpl.sections) }))
        patchUi({ selBlock: null })
      },
      removeFormTemplate: (id) =>
        setFormTemplates((list) => {
          const next = list.filter((t) => t.id !== id)
          persistForms(next)
          return next
        }),
      exportFormTemplate: () =>
        downloadJSON('octool-form.json', { octoolForm: 1, sections: schemaFromSections(character.sections) }),
      importFormTemplate: () =>
        pickJSON((obj, fname) => {
          const o = obj as { sections?: FormTemplate['sections'] }
          const schema = Array.isArray(o) ? o : o.sections
          if (Array.isArray(schema)) {
            const tpl: FormTemplate = { id: 'f' + Date.now().toString(36), name: (fname || '匯入格式').replace(/\.json$/i, ''), sections: schema }
            setFormTemplates((list) => {
              const next = [...list, tpl]
              persistForms(next)
              return next
            })
          } else alert('格式檔不正確')
        }),

      // whole-character
      resetDemo: () => {
        if (!confirm('確定要重設嗎？\n\n這會清除目前所有內容，並還原成範例角色「莉央」。')) return
        setCharacter(clone(DEMO))
        patchUi({ visibility: { sections: {}, palette: true, albums: true }, selBlock: null })
      },
      clearAll: () => {
        if (!confirm('確定要清空全部嗎？\n\n所有角色資料都會清除，變成全新空白。')) return
        const blank: Character = {
          name: '',
          nickname: '',
          tagline: '',
          avatarUrl: '',
          mainVisualUrl: '',
          palette: [],
          sections: [],
          albums: [],
          templates: [],
        }
        const tpl = newTemplate('sheet', blank)
        blank.templates = [tpl]
        setCharacter(blank)
        patchUi({
          visibility: { sections: {}, palette: true, albums: true },
          activeTpl: tpl.id,
          selBlock: null,
        })
      },
      importCharacter: (c) => {
        setCharacter(c)
        patchUi({ selBlock: null })
      },
    }
  }, [character, ui, activeTemplate, patchUi, mutTpl, formTemplates, persistForms])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useOctool(): OctoolStore {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useOctool must be used within <OctoolProvider>')
  return ctx
}
