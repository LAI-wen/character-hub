import { useEffect, useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { ContextHeader } from "@/components/ContextHeader"
import { Icon, TYPE_ICON } from "@/components/Icon"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import { useAuth } from "@/lib/auth/context"
import { apiClient } from "@/lib/api/client"
import {
  TemplateCanvas,
  type CanvasBlock,
  type CanvasTemplate,
  type CanvasDesign,
  type CanvasCharacter,
  type CanvasSection,
  type CanvasSwatch,
  type CanvasAlbum,
} from "@/components/TemplateCanvas"
import {
  uid, DEF_DESIGN, BLOCK_TYPES, INFO_TYPES, TYPE_LABEL,
  makeBlock, mapTree, removeTree, detachFrom, insertRelId,
  findParentArr, cloneBlk, newTemplate, PRESET_CARDS,
} from "./templateBuilder/blocks"
import { BlockInspector, type InspectorCtx } from "./templateBuilder/BlockInspector"
import { BlockListPanel, type ListCtx } from "./templateBuilder/BlockListPanel"
import { GlobalDesignPanel, type DesignCtx } from "./templateBuilder/GlobalDesignPanel"

type DeviceKey = "desktop" | "tablet" | "phone"
type SavedTpl = { id: string; name: string; template: CanvasTemplate }

const seg = (active: boolean) => ({
  fontFamily: "inherit", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
  borderRadius: 10, padding: "8px 14px",
  background: active ? "var(--accent)" : "transparent",
  color: active ? "#fff" : "var(--text-2)",
})

const DEVICES: { key: DeviceKey; label: string; icon: string }[] = [
  { key: "desktop", label: "電腦", icon: "monitor" },
  { key: "tablet", label: "平板", icon: "tablet" },
  { key: "phone", label: "手機", icon: "phone" },
]
const DEVICE_CAP: Record<DeviceKey, number | undefined> = { desktop: undefined, tablet: 768, phone: 390 }
const FOLD_H: Record<DeviceKey, number> = { desktop: 800, tablet: 1024, phone: 844 }

function findBlock(blocks: CanvasBlock[], id: string | null): CanvasBlock | null {
  if (!id) return null
  const loc = findParentArr(blocks, id)
  return loc ? loc.arr[loc.idx] : null
}

const iconBtn = {
  width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)",
  background: "var(--bg-2)", color: "var(--text-2)", cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
} as const

const DEMO_CHAR: CanvasCharacter = {
  name: "範例角色", tagline: "一句話介紹這個角色",
  palette: [
    { id: "sw1", label: "主色", hex: "#c98a5e" },
    { id: "sw2", label: "輔色", hex: "#f1ddc7" },
    { id: "sw3", label: "深色", hex: "#4a3f35" },
  ],
  sections: [{ id: "sec1", title: "基本資料", group: "text", fields: [
    { id: "f1", label: "年齡", type: "text", value: "18歲" },
    { id: "f2", label: "性別", type: "text", value: "女性" },
    { id: "f3", label: "職業", type: "text", value: "魔法師" },
  ]}],
  albums: [],
}

export function TemplateBuilderPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useProjectContext()
  const { viewer } = useAuth()
  const queryClient = useQueryClient()
  const isOwner = project.ownerUserId === viewer?.id
  const wrapRef = useRef<HTMLDivElement>(null)

  // ── Remote: template data ─────────────────────────────────────────────────
  const { data: tplData } = useQuery({
    queryKey: ["project", projectId, "template"],
    queryFn: () => apiClient<{ fields: unknown[]; canvasTemplates: SavedTpl[]; canvasDesign: CanvasDesign }>(
      `/api/app/projects/${projectId}/template`
    ),
    enabled: !!projectId,
  })

  const saveMutation = useMutation({
    mutationFn: (body: { canvasTemplates: SavedTpl[] }) =>
      apiClient(`/api/app/projects/${projectId}/template`, {
        method: "PUT",
        body: { fields: tplData?.fields ?? [], ...body, canvasDesign: {} },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "template"] })
      setDirty(false)
    },
  })

  // ── Remote: character list ────────────────────────────────────────────────
  const { data: charListData } = useQuery({
    queryKey: ["project", projectId, "roster"],
    queryFn: () => apiClient<{ characters: Array<{ id: string; linkId: string; name: string; avatarUrl?: string }> }>(
      `/api/app/projects/${projectId}/characters`
    ),
    enabled: !!projectId,
  })
  const charList = charListData?.characters ?? []

  const [previewLinkId, setPreviewLinkId] = useState<string>("")
  useEffect(() => {
    if (!previewLinkId && charList.length > 0) setPreviewLinkId(charList[0].linkId)
  }, [charList, previewLinkId])

  const { data: charData } = useQuery({
    queryKey: ["project", projectId, "character", previewLinkId],
    queryFn: () => apiClient<{ character: { id: string; name: string; tagline?: string; avatarUrl?: string; mainVisualUrl?: string; generalProfile?: Record<string, unknown> } }>(
      `/api/app/projects/${projectId}/characters/${previewLinkId}`
    ),
    enabled: !!previewLinkId,
  })

  const character: CanvasCharacter = (() => {
    if (!charData?.character) return DEMO_CHAR
    const c = charData.character
    const gp = (c.generalProfile ?? {}) as Record<string, unknown>
    return {
      name: c.name || "角色",
      tagline: c.tagline || "",
      avatarUrl: c.avatarUrl || undefined,
      mainVisualUrl: (gp.mainVisualUrl as string | undefined) || undefined,
      sections: (gp.sections as CanvasSection[] | undefined) ?? [],
      palette: (gp.palette as CanvasSwatch[] | undefined) ?? [],
      albums: ((gp.albums as CanvasAlbum[] | undefined) ?? []).filter(a => (a as { kind?: string }).kind !== "ref"),
    }
  })()

  // ── Local state ───────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<SavedTpl[]>([])
  const [activeTplId, setActiveTplId] = useState<string>("")
  const [selBlock, setSelBlock] = useState<string | null>(null)
  const [panelTab, setPanelTab] = useState<"blocks" | "list" | "design">("design")
  const [mode, setMode] = useState<"edit" | "preview">("edit")
  const [device, setDevice] = useState<DeviceKey>("desktop")
  const [fold, setFold] = useState(false)
  const [pageView, setPageView] = useState<number | "all">("all")
  const [annotateMode, setAnnotateMode] = useState<"list" | "tooltip">("list")
  const [fs, setFs] = useState(false)
  const [fsPage, setFsPage] = useState(0)
  const [sheet, setSheet] = useState<"none" | "add" | "inspect">("none")
  const [pickOpen, setPickOpen] = useState(false)
  const [addGroup, setAddGroup] = useState<"info" | "layout" | null>("info")
  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  const [winH, setWinH] = useState(typeof window !== "undefined" ? window.innerHeight : 900)
  const [contentH, setContentH] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const mobile = vw < 900

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeTpl = templates.find(t => t.id === activeTplId) ?? null
  const allBlocks = activeTpl?.template.blocks ?? []
  const pageCount = allBlocks.filter(b => b.type === "pagebreak").length + 1
  const selected = findBlock(allBlocks, selBlock)
  const cap = DEVICE_CAP[device]
  const foldH = device === "desktop" ? winH : FOLD_H[device]
  const overflow = fold && contentH > foldH + 8
  const infoBtns = BLOCK_TYPES.filter(b => INFO_TYPES.includes(b.type))
  const layoutBtns = BLOCK_TYPES.filter(b => !INFO_TYPES.includes(b.type))

  // ── Sync from API ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tplData) return
    const loaded = Array.isArray(tplData.canvasTemplates) ? tplData.canvasTemplates as SavedTpl[] : []
    const migrated = loaded.map(t => {
      if (!t.template.design) {
        return { ...t, template: { ...t.template, design: { ...DEF_DESIGN, ...((tplData.canvasDesign as CanvasDesign) ?? {}) } } }
      }
      return t
    })
    setTemplates(migrated)
    setActiveTplId(migrated[0]?.id ?? "")
    setDirty(false)
    if (migrated.length === 0) setPickOpen(true)
  }, [tplData])

  useEffect(() => { if (selBlock) setPanelTab("list") }, [selBlock])

  useEffect(() => {
    const onResize = () => { setVw(window.innerWidth); setWinH(window.innerHeight) }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => {
      const inner = el.querySelector("[data-bid]")?.parentElement
      setContentH(inner ? inner.scrollHeight : el.scrollHeight)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!fs) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFs(false)
      else if (e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); setFsPage(p => Math.min(pageCount - 1, p + 1)) }
      else if (e.key === "ArrowUp") { e.preventDefault(); setFsPage(p => Math.max(0, p - 1)) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fs, pageCount])

  // ── Template mutations ────────────────────────────────────────────────────
  function mutateTpls(next: SavedTpl[]) { setTemplates(next); setDirty(true) }

  function updateActiveTpl(tpl: CanvasTemplate) {
    mutateTpls(templates.map(t => t.id === activeTplId ? { ...t, template: tpl } : t))
  }

  function addNewTemplate(kind: string) {
    const tpl = newTemplate(kind, character)
    const saved: SavedTpl = { id: uid("t"), name: tpl.name || "", template: tpl }
    const next = [...templates, saved]
    mutateTpls(next)
    setActiveTplId(saved.id)
    setPickOpen(false)
  }

  function renameTemplate(id: string, name: string) {
    mutateTpls(templates.map(t => t.id === id ? { ...t, name } : t))
  }

  function duplicateTemplate(id: string) {
    const src = templates.find(t => t.id === id)
    if (!src) return
    const copy: SavedTpl = { id: uid("t"), name: src.name + " 副本", template: JSON.parse(JSON.stringify(src.template)) }
    const idx = templates.findIndex(t => t.id === id)
    const next = [...templates.slice(0, idx + 1), copy, ...templates.slice(idx + 1)]
    mutateTpls(next)
    setActiveTplId(copy.id)
  }

  function removeTemplate(id: string) {
    if (templates.length <= 1) return
    const next = templates.filter(t => t.id !== id)
    mutateTpls(next)
    setActiveTplId(next[0]?.id ?? "")
    setSelBlock(null)
  }

  // ── Design mutations ──────────────────────────────────────────────────────
  function updateDesign(key: string, val: unknown) {
    if (!activeTpl) return
    updateActiveTpl({ ...activeTpl.template, design: { ...(activeTpl.template.design ?? DEF_DESIGN), [key]: val } })
  }

  function libColors(): string[] {
    return (activeTpl?.template.design?.library as string[] | undefined) ?? DEF_DESIGN.library ?? []
  }

  function addLibColor(hex: string) { updateDesign("library", [...libColors(), hex]) }
  function removeLibColor(hex: string) { updateDesign("library", libColors().filter(c => c !== hex)) }

  // ── Block mutations ───────────────────────────────────────────────────────
  function addBlock(type: string) {
    if (!activeTpl) return
    const nb = makeBlock(type, character)
    const blocks = [...activeTpl.template.blocks]
    if (selBlock) {
      const ok = insertRelId(blocks, selBlock, nb, true)
      if (ok) { updateActiveTpl({ ...activeTpl.template, blocks }); setSelBlock(nb.id); return }
    }
    updateActiveTpl({ ...activeTpl.template, blocks: [...activeTpl.template.blocks, nb] })
    setSelBlock(nb.id)
    if (mobile) setSheet("none")
  }

  function selectBlock(id: string | null) {
    setSelBlock(id)
    if (!id) setPanelTab("design")
  }

  function removeBlock(id: string) {
    if (!activeTpl) return
    updateActiveTpl({ ...activeTpl.template, blocks: removeTree(activeTpl.template.blocks, id) })
    if (selBlock === id) setSelBlock(null)
  }

  function moveBlockDir(id: string, dir: -1 | 1) {
    if (!activeTpl) return
    const blocks = [...activeTpl.template.blocks]
    const idx = blocks.findIndex(b => b.id === id)
    if (idx >= 0) {
      const ni = idx + dir
      if (ni >= 0 && ni < blocks.length) { [blocks[idx], blocks[ni]] = [blocks[ni], blocks[idx]]; updateActiveTpl({ ...activeTpl.template, blocks }); return }
    }
    const next = activeTpl.template.blocks.map(b => {
      if (b.type !== "columns" || !b.children) return b
      const children = b.children.map(col => {
        const ci = col.findIndex(x => x.id === id)
        if (ci < 0) return col
        const ni2 = ci + dir
        if (ni2 < 0 || ni2 >= col.length) return col
        const nc = [...col];
        [nc[ci], nc[ni2]] = [nc[ni2], nc[ci]]
        return nc
      })
      return { ...b, children }
    })
    updateActiveTpl({ ...activeTpl.template, blocks: next })
  }

  function duplicateBlock(id: string) {
    if (!activeTpl) return
    const loc = findParentArr([...activeTpl.template.blocks], id)
    if (!loc) return
    const copy = cloneBlk(loc.arr[loc.idx])
    const blocks = [...activeTpl.template.blocks]
    const inserted = insertRelId(blocks, id, copy, true)
    if (inserted) { updateActiveTpl({ ...activeTpl.template, blocks }); setSelBlock(copy.id) }
  }

  function updateBlock(id: string, key: string, val: unknown) {
    if (!activeTpl) return
    updateActiveTpl({ ...activeTpl.template, blocks: mapTree(activeTpl.template.blocks, id, b => ({ ...b, [key]: val })) })
  }

  function updateBlockStyle(id: string, key: string, val: unknown) {
    if (!activeTpl) return
    updateActiveTpl({ ...activeTpl.template, blocks: mapTree(activeTpl.template.blocks, id, b => ({ ...b, style: { ...(b.style ?? {}), [key]: val } })) })
  }

  function setCols(id: string, n: number) {
    if (!activeTpl) return
    updateActiveTpl({ ...activeTpl.template, blocks: mapTree(activeTpl.template.blocks, id, b => {
      const cur = b.children ?? []
      const children: CanvasBlock[][] = Array.from({ length: n }, (_, i) => cur[i] ?? [])
      const pct = Math.round(100 / n)
      return { ...b, cols: n, children, widths: Array.from({ length: n }, () => pct) }
    })})
  }

  function setColWidth(id: string, colIdx: number, pct: number) {
    if (!activeTpl) return
    updateActiveTpl({ ...activeTpl.template, blocks: mapTree(activeTpl.template.blocks, id, b => {
      const widths = [...(b.widths ?? [])]
      widths[colIdx] = pct
      return { ...b, widths }
    })})
  }

  function addTag(blockId: string) {
    if (!activeTpl) return
    updateActiveTpl({ ...activeTpl.template, blocks: mapTree(activeTpl.template.blocks, blockId, b => ({
      ...b, tags: [...(b.tags ?? []), { id: uid("tg"), label: "標籤", color: "#c98a5e" }],
    }))})
  }

  function updateTag(blockId: string, tagId: string, key: string, val: unknown) {
    if (!activeTpl) return
    updateActiveTpl({ ...activeTpl.template, blocks: mapTree(activeTpl.template.blocks, blockId, b => ({
      ...b, tags: (b.tags ?? []).map(tg => tg.id === tagId ? { ...tg, [key]: val } : tg),
    }))})
  }

  function removeTag(blockId: string, tagId: string) {
    if (!activeTpl) return
    updateActiveTpl({ ...activeTpl.template, blocks: mapTree(activeTpl.template.blocks, blockId, b => ({
      ...b, tags: (b.tags ?? []).filter(tg => tg.id !== tagId),
    }))})
  }

  function moveOut(id: string) {
    if (!activeTpl) return
    const blocks = JSON.parse(JSON.stringify(activeTpl.template.blocks)) as CanvasBlock[]
    const blk = detachFrom(blocks, id)
    if (!blk) return
    updateActiveTpl({ ...activeTpl.template, blocks: [...blocks, blk] })
  }

  function moveColChild(id: string, dir: -1 | 1) {
    if (!activeTpl) return
    const blocks = activeTpl.template.blocks.map(b => {
      if (b.type !== "columns" || !b.children) return b
      const children = b.children
      let fromCol = -1, fromIdx = -1
      for (let c = 0; c < children.length; c++) {
        const j = children[c].findIndex(x => x.id === id)
        if (j >= 0) { fromCol = c; fromIdx = j; break }
      }
      if (fromCol < 0) return b
      const toCol = fromCol + dir
      if (toCol < 0 || toCol >= children.length) return b
      const newChildren = children.map(col => [...col])
      const [blk] = newChildren[fromCol].splice(fromIdx, 1)
      newChildren[toCol].push(blk)
      return { ...b, children: newChildren }
    })
    updateActiveTpl({ ...activeTpl.template, blocks })
  }

  function moveBlock(from: string, to: string, pos: "before" | "after") {
    if (!activeTpl) return
    const blocks = activeTpl.template.blocks.filter(b => b.id !== from)
    const toIdx = blocks.findIndex(b => b.id === to)
    if (toIdx < 0) return
    const src = activeTpl.template.blocks.find(b => b.id === from)
    if (!src) return
    blocks.splice(toIdx + (pos === "after" ? 1 : 0), 0, src)
    updateActiveTpl({ ...activeTpl.template, blocks })
  }

  function dropToColumn(blockId: string, colBlockId: string, colIdx: number) {
    if (!activeTpl) return
    const blocks = JSON.parse(JSON.stringify(activeTpl.template.blocks)) as CanvasBlock[]
    const blk = detachFrom(blocks, blockId)
    if (!blk) return
    for (const b of blocks) {
      if (b.id === colBlockId && b.type === "columns" && b.children) {
        b.children[colIdx] = [...(b.children[colIdx] ?? []), blk]
        break
      }
    }
    updateActiveTpl({ ...activeTpl.template, blocks })
  }

  function colResize(id: string, i: number, a: number, b: number) {
    if (!activeTpl) return
    updateActiveTpl({ ...activeTpl.template, blocks: mapTree(activeTpl.template.blocks, id, blk => {
      const widths = [...(blk.widths || [])]
      widths[i] = a
      widths[i + 1] = b
      return { ...blk, widths }
    })})
  }

  function autoPaginate(ids: string[]) {
    if (!activeTpl || !ids.length) return
    let blocks = activeTpl.template.blocks
    for (const id of ids) {
      const pb: CanvasBlock = { id: uid("pb"), type: "pagebreak" }
      const nb = [...blocks]
      insertRelId(nb, id, pb, false)
      blocks = nb
    }
    updateActiveTpl({ ...activeTpl.template, blocks })
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  function save() {
    saveMutation.mutate({ canvasTemplates: templates })
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  // ── Auto-paginate ─────────────────────────────────────────────────────────
  function runAutoSplit() {
    const el = wrapRef.current
    if (!el) return
    const all = Array.from(el.querySelectorAll("[data-bid]")) as HTMLElement[]
    if (all.length < 2) return
    const container = all[0].parentElement
    const tops = all.filter(x => x.parentElement === container)
    if (tops.length < 2) return
    const y0 = tops[0].getBoundingClientRect().top
    let threshold = foldH
    const ids: string[] = []
    for (let i = 1; i < tops.length; i++) {
      const top = tops[i].getBoundingClientRect().top - y0
      if (top >= threshold - 8) {
        ids.push(tops[i].getAttribute("data-bid") || "")
        while (top >= threshold - 8) threshold += foldH
      }
    }
    autoPaginate(ids.filter(Boolean))
  }

  // ── Ctx objects ───────────────────────────────────────────────────────────
  const inspectorCtx: InspectorCtx = {
    character, activeTemplate: activeTpl?.template ?? null,
    selectBlock, moveBlockDir, duplicateBlock, removeBlock,
    updateBlock, updateBlockStyle, setCols, setColWidth,
    addTag, updateTag, removeTag, libColors, moveOut,
  }
  const listCtx: ListCtx = {
    selBlock, activeTemplate: activeTpl?.template ?? null,
    selectBlock, moveBlockDir, duplicateBlock, removeBlock, moveColChild,
  }
  const designCtx: DesignCtx = {
    character, activeTemplate: activeTpl?.template ?? null,
    updateDesign, libColors, addLibColor, removeLibColor,
  }

  // ── Non-owner guard ───────────────────────────────────────────────────────
  if (!isOwner) {
    return (
      <div className="page">
        <ContextHeader scope="project" crumbs={[{ label: project.name, href: `/p/${projectId}` }, "模板與展示"]} />
        <div className="state">
          <span className="ti">僅主持人可管理模板</span>
          <p className="bd">請聯絡企劃主持人查看模板內容。</p>
        </div>
      </div>
    )
  }

  // ── Canvas helper ─────────────────────────────────────────────────────────
  const canvas = (editable: boolean, page: number | "all" | null) => (
    <TemplateCanvas
      character={character}
      template={activeTpl?.template ?? { id: "", name: "", design: DEF_DESIGN, blocks: [] }}
      annotateMode={annotateMode}
      viewport={device}
      pageView={page}
      editable={editable}
      selectedId={editable ? selBlock : null}
      onSelect={editable ? selectBlock : undefined}
      onReorder={editable ? moveBlock : undefined}
      onDropToColumn={editable ? dropToColumn : undefined}
      onColResize={editable ? colResize : undefined}
      onNavTo={!editable ? p => setPageView(p) : undefined}
    />
  )

  // ── Add panel ─────────────────────────────────────────────────────────────
  const addPanel = activeTpl === null ? (
    <div style={{ border: "1.5px dashed var(--border)", borderRadius: 14, padding: "20px 16px", textAlign: "center", color: "var(--text-2)", fontSize: 13, lineHeight: 1.7 }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>📄</div>
      <p style={{ margin: "0 0 12px", fontWeight: 600, color: "var(--text)" }}>請先建立模板</p>
      <p style={{ margin: "0 0 14px" }}>點下方「＋ 新增模板」建立起始版型後，才能加入積木。</p>
      <button
        className="btn btn-accent"
        onClick={() => setPickOpen(true)}
        style={{ fontSize: 13 }}
      >
        ＋ 新增模板
      </button>
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {(["info", "layout"] as const).map(grp => {
        const open = addGroup === grp
        const list = grp === "info" ? infoBtns : layoutBtns
        return (
          <div key={grp}>
            <button onClick={() => setAddGroup(open ? null : grp)} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", cursor: "pointer", background: open ? "var(--bg-3)" : "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              <Icon name={grp === "info" ? "list" : "columns"} size={16} />
              <span style={{ flex: 1, textAlign: "left" }}>{grp === "info" ? "資訊積木" : "排版積木"}</span>
              <Icon name={open ? "chevUp" : "chevDown"} size={15} />
            </button>
            {open ? (
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", padding: "11px 2px 4px" }}>
                {list.map(bt => (
                  <button key={bt.type} onClick={() => { addBlock(bt.type); if (mobile) setSheet("none") }} style={{ fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "var(--text)", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "7px 12px 7px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Icon name={TYPE_ICON[bt.type] || "list"} size={15} />
                    {bt.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
      <p style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.6, margin: "4px 0 0" }}>
        點積木加到模板最底部。<b>先選取一個積木</b>，新積木就會加在它下方。
      </p>
    </div>
  )

  // ── Side panel content ────────────────────────────────────────────────────
  const noSelPanel = (
    <>
      <div style={{ display: "flex", gap: 5, background: "var(--bg-3)", padding: 5, borderRadius: 12, marginBottom: 14 }}>
        <button style={{ ...seg(panelTab === "design"), flex: 1, padding: "8px 4px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }} onClick={() => setPanelTab("design")}>
          <Icon name="palette" size={13} /> 設計
        </button>
        <button style={{ ...seg(panelTab === "blocks"), flex: 1, padding: "8px 4px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }} onClick={() => setPanelTab("blocks")}>
          <Icon name="plus" size={13} /> 加入
        </button>
        <button style={{ ...seg(panelTab === "list"), flex: 1, padding: "8px 4px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }} onClick={() => setPanelTab("list")}>
          <Icon name="list" size={13} /> 列表
        </button>
      </div>
      {panelTab === "design" ? <GlobalDesignPanel ctx={designCtx} /> : panelTab === "list" ? <BlockListPanel ctx={listCtx} /> : addPanel}
    </>
  )

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[{ label: project.name, href: `/p/${projectId}` }, "模板與展示"]} />

      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 26, margin: 0, color: "var(--text)" }}>模板與展示</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-2)", maxWidth: 520 }}>
            {mode === "edit" ? "用積木拼出展示頁，點積木調整、拖曳握把排序。" : "預覽最終展示效果，可切換圖片標記顯示方式。"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
          {charList.length > 1 ? (
            <select value={previewLinkId} onChange={e => setPreviewLinkId(e.target.value)} style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--text)", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 11px", outline: "none", cursor: "pointer" }}>
              {charList.map(c => <option key={c.linkId} value={c.linkId}>{c.name}</option>)}
            </select>
          ) : null}
          {dirty ? (
            <button onClick={save} style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#fff", background: savedFlash ? "#5b8a72" : "var(--accent)", border: "none", borderRadius: 11, padding: "9px 16px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name={savedFlash ? "check" : "save"} size={14} /> {savedFlash ? "已儲存" : "儲存"}
            </button>
          ) : null}
          <div style={{ display: "flex", gap: 5, background: "var(--bg-3)", padding: 5, borderRadius: 14, flexShrink: 0 }}>
            <button style={seg(mode === "edit")} onClick={() => setMode("edit")}>編輯</button>
            <button style={seg(mode === "preview")} onClick={() => setMode("preview")}>預覽</button>
          </div>
        </div>
      </div>

      {/* template toolbar */}
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 5, background: "var(--bg-3)", padding: 5, borderRadius: 13, flexWrap: "wrap" }}>
          {templates.map(t => (
            <button key={t.id} onClick={() => setActiveTplId(t.id)} style={{ ...seg(t.id === activeTplId), background: t.id === activeTplId ? "var(--accent)" : "var(--bg-2)" }}>
              {t.name || "模板"}
            </button>
          ))}
        </div>
        {activeTpl ? (
          <input value={activeTpl.name} onChange={e => renameTemplate(activeTpl.id, e.target.value)} placeholder="模板名稱" style={{ width: 130, boxSizing: "border-box", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--text)", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 11px", outline: "none" }} />
        ) : null}
        <button style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "none", borderRadius: 10, padding: "8px 13px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }} onClick={() => setPickOpen(true)}>
          <Icon name="plus" size={14} /> 模板
        </button>
        {activeTpl ? (
          <>
            <button style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--text-2)", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 13px", cursor: "pointer" }} onClick={() => duplicateTemplate(activeTpl.id)}>複製</button>
            {templates.length > 1 ? (
              <button style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#c0584f", background: "var(--bg-2)", border: "1px solid #e0b3ad", borderRadius: 10, padding: "8px 13px", cursor: "pointer" }} onClick={() => removeTemplate(activeTpl.id)}>刪除</button>
            ) : null}
          </>
        ) : null}

        {mode === "edit" ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)" }}>裝置</span>
              <div style={{ display: "flex", gap: 4, background: "var(--bg-3)", padding: 4, borderRadius: 11 }}>
                {DEVICES.map(d => (
                  <button key={d.key} onClick={() => setDevice(d.key)} title={d.label} style={{ ...seg(device === d.key), padding: "6px 9px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon name={d.icon} size={14} />
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setFold(f => !f)} style={{ ...seg(fold), background: fold ? "var(--accent)" : "var(--bg-2)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Icon name="minus" size={14} /> 首屏輔助線
            </button>
            {overflow ? (
              <button onClick={runAutoSplit} style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#fff", background: "#c0584f", border: "none", borderRadius: 10, padding: "8px 13px", cursor: "pointer" }}>
                ⤓ 自動分頁這頁
              </button>
            ) : null}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 9, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 5, background: "var(--bg-3)", padding: 5, borderRadius: 11 }}>
              {(["list", "tooltip"] as const).map(m => (
                <button key={m} style={seg(annotateMode === m)} onClick={() => setAnnotateMode(m)}>
                  {m === "list" ? "編號清單" : "浮動說明"}
                </button>
              ))}
            </div>
            <button onClick={() => { setFsPage(0); setFs(true) }} style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--accent)", border: "none", borderRadius: 11, padding: "9px 16px", cursor: "pointer", whiteSpace: "nowrap" }}>
              ▶ 全螢幕展示
            </button>
          </div>
        )}
      </div>

      {/* page tabs */}
      {pageCount > 1 ? (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginBottom: 12, background: "var(--bg-3)", padding: 5, borderRadius: 12, width: "fit-content" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", padding: "0 6px" }}>分頁檢視</span>
          <button style={seg(pageView === "all")} onClick={() => setPageView("all")}>全部</button>
          {Array.from({ length: pageCount }).map((_, i) => (
            <button key={i} style={seg(pageView === i)} onClick={() => setPageView(i)}>第 {i + 1} 頁</button>
          ))}
        </div>
      ) : null}

      {/* edit body */}
      {mode === "edit" ? (
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }} onClick={() => selectBlock(null)}>
            {templates.length === 0 && tplData ? (
              <div style={{ textAlign: "center", padding: "80px 20px", border: "2px dashed var(--border)", borderRadius: 18, background: "var(--bg-2)" }}>
                <p style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>還沒有模板</p>
                <p style={{ fontSize: 14, color: "var(--text-2)", margin: "0 0 22px", lineHeight: 1.6 }}>選一個起始版型，開始打造你的展示頁。</p>
                <button onClick={e => { e.stopPropagation(); setPickOpen(true) }} style={{ fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#fff", background: "var(--accent)", border: "none", borderRadius: 12, padding: "12px 24px", cursor: "pointer" }}>＋ 建立第一個模板</button>
              </div>
            ) : (
              <div ref={wrapRef} style={{ position: "relative", maxWidth: cap, margin: cap ? "0 auto" : undefined, width: "100%", transition: "max-width .25s ease" }}>
                <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "0 10px 36px rgba(0,0,0,0.06)" }}>{canvas(true, pageView)}</div>
                {fold ? Array.from({ length: Math.max(1, Math.ceil(contentH / foldH)) }).map((_, i) => (
                  <div key={i} style={{ position: "absolute", left: 0, right: 0, top: foldH * (i + 1), pointerEvents: "none" }}>
                    <div style={{ borderTop: "2px dashed #c0584f", opacity: 0.7 }} />
                    <span style={{ position: "absolute", right: 8, top: 2, fontSize: 10.5, fontWeight: 700, color: "#fff", background: "#c0584f", borderRadius: 6, padding: "2px 7px" }}>
                      {i === 0 ? `${DEVICES.find(d => d.key === device)?.label}首屏底線` : `第 ${i + 1} 屏`}
                    </span>
                  </div>
                )) : null}
              </div>
            )}
          </div>
          {!mobile ? (
            <aside style={{ width: 320, flexShrink: 0 }}>
              <div style={{ position: "sticky", top: 84, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 18, padding: 18, maxHeight: "calc(100vh - 110px)", overflowY: "auto" }}>
                {selected ? <BlockInspector block={selected} ctx={inspectorCtx} /> : noSelPanel}
              </div>
            </aside>
          ) : null}
        </div>
      ) : (
        <div style={{ maxWidth: cap, margin: cap ? "0 auto" : undefined, borderRadius: 18, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "0 10px 36px rgba(0,0,0,0.06)" }}>{canvas(false, pageView)}</div>
      )}

      {/* mobile bar (selected) */}
      {mode === "edit" && mobile && selected ? (
        <div style={{ position: "fixed", left: 10, right: 10, bottom: 10, zIndex: 59, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "0 12px 36px rgba(0,0,0,0.28)", display: "flex", alignItems: "center", gap: 6, padding: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-2)", padding: "0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{TYPE_LABEL[selected.type] ?? selected.type}</span>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            <button title="上移" style={iconBtn} onClick={() => moveBlockDir(selected.id, -1)}><Icon name="arrowUp" size={16} /></button>
            <button title="下移" style={iconBtn} onClick={() => moveBlockDir(selected.id, 1)}><Icon name="arrowDown" size={16} /></button>
            <button title="複製" style={iconBtn} onClick={() => duplicateBlock(selected.id)}><Icon name="copy" size={16} /></button>
            <button title="刪除" style={{ ...iconBtn, border: "1px solid #e0b3ad", background: "#fbeeec", color: "#c0584f" }} onClick={() => removeBlock(selected.id)}><Icon name="trash" size={16} /></button>
            <button style={{ ...iconBtn, width: "auto", padding: "0 12px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "none" }} onClick={() => setSheet("inspect")}>樣式</button>
            <button title="完成" style={iconBtn} onClick={() => selectBlock(null)}>✕</button>
          </div>
        </div>
      ) : null}

      {/* mobile FAB */}
      {mode === "edit" && mobile && !selected ? (
        <button onClick={() => setSheet("add")} style={{ position: "fixed", right: 16, bottom: 16, zIndex: 57, fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#fff", background: "var(--accent)", border: "none", borderRadius: 999, padding: "13px 18px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, boxShadow: "0 10px 28px rgba(0,0,0,0.35)" }}>
          <Icon name="plus" size={16} /> 積木
        </button>
      ) : null}

      {/* mobile slide-up sheet */}
      {mode === "edit" && mobile && sheet !== "none" ? (
        <>
          <div onClick={() => setSheet("none")} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(20,16,13,0.35)" }} />
          <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 61, background: "var(--bg-2)", borderRadius: "18px 18px 0 0", boxShadow: "0 -12px 36px rgba(0,0,0,0.25)", maxHeight: "76vh", overflowY: "auto", padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <span style={{ width: 40, height: 4, borderRadius: 999, background: "var(--border)" }} />
            </div>
            {sheet === "inspect" && selected ? <BlockInspector block={selected} ctx={inspectorCtx} /> : noSelPanel}
          </div>
        </>
      ) : null}

      {/* template preset chooser */}
      {pickOpen ? (
        <div onClick={() => setPickOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(20,16,13,0.5)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-2)", borderRadius: 20, boxShadow: "0 30px 80px rgba(0,0,0,0.4)", maxWidth: 560, width: "100%", padding: 24, maxHeight: "86vh", overflowY: "auto" }}>
            <h2 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 19, margin: "0 0 6px", color: "var(--text)" }}>建立新模板</h2>
            <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 18px" }}>選一個起始版型，之後都能自由調整。</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
              {PRESET_CARDS.map(p => (
                <button key={p.kind} onClick={() => addNewTemplate(p.kind)} style={{ textAlign: "left", fontFamily: "inherit", cursor: "pointer", background: "var(--bg-3)", border: "1.5px solid var(--border)", borderRadius: 16, padding: 16 }}>
                  <div style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 17, color: "var(--text)", marginBottom: 5 }}>{p.title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.5 }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* fullscreen presentation */}
      {fs ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, background: activeTpl?.template.design?.bg || "#fff", overflowY: "auto" }}>
          <button onClick={() => setFs(false)} title="關閉 (Esc)" style={{ position: "fixed", top: 18, right: 20, width: 42, height: 42, borderRadius: 12, border: "none", background: "rgba(0,0,0,0.22)", color: "#fff", cursor: "pointer", fontSize: 22, zIndex: 3 }}>×</button>
          <TemplateCanvas character={character} template={activeTpl!.template} annotateMode={annotateMode} viewport={device} pageView={pageCount > 1 ? fsPage : "all"} onNavTo={p => setFsPage(p as number)} />
          {pageCount > 1 ? (
            <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 14, background: "rgba(0,0,0,0.34)", backdropFilter: "blur(8px)", borderRadius: 999, padding: "8px 14px", zIndex: 3 }}>
              <button onClick={() => setFsPage(p => Math.max(0, p - 1))} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", cursor: "pointer", fontSize: 18 }}>‹</button>
              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                {Array.from({ length: pageCount }).map((_, i) => (
                  <button key={i} onClick={() => setFsPage(i)} style={{ width: i === fsPage ? 22 : 9, height: 9, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: i === fsPage ? "#fff" : "rgba(255,255,255,0.4)", transition: "all .2s" }} />
                ))}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", minWidth: 46, textAlign: "center" }}>{fsPage + 1} / {pageCount}</span>
              <button onClick={() => setFsPage(p => Math.min(pageCount - 1, p + 1))} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", cursor: "pointer", fontSize: 18 }}>›</button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* desktop selection label */}
      {mode === "edit" && !mobile && selected ? (
        <div style={{ position: "fixed", bottom: 14, left: "50%", transform: "translateX(-50%)", zIndex: 40, fontSize: 12, color: "var(--text-2)", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 999, padding: "6px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          已選取：<b style={{ color: "var(--accent)" }}>{TYPE_LABEL[selected.type] ?? selected.type}</b>
        </div>
      ) : null}
    </div>
  )
}
