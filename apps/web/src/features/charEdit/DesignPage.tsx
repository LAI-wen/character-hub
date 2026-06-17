import { useEffect, useRef, useState } from 'react'
import { useCharacterStore } from '@/store/useCharacterStore'
import { TemplateCanvas } from '@/components/TemplateCanvas'
import { Icon } from '@/components/Icon'
import { BLOCK_TYPES, INFO_TYPES, PRESET_CARDS, TYPE_LABEL, findParentArr } from '@/features/project/templateBuilder/blocks'
import { BlockInspector } from '@/features/project/templateBuilder/BlockInspector'
import { BlockListPanel } from '@/features/project/templateBuilder/BlockListPanel'
import { GlobalDesignPanel } from '@/features/project/templateBuilder/GlobalDesignPanel'
import type { Block, BlockType } from '@/store/useCharacterStore'
import type { CanvasCharacter, CanvasTemplate, CanvasBlock } from '@/components/TemplateCanvas'

const seg = (active: boolean) => ({
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
  borderRadius: 10,
  padding: '8px 14px',
  background: active ? 'var(--accent)' : 'transparent',
  color: active ? '#fff' : 'var(--text-2)',
})

type DeviceKey = 'desktop' | 'tablet' | 'phone'

const DEVICES: { key: DeviceKey; label: string; icon: string }[] = [
  { key: 'desktop', label: '電腦', icon: 'monitor' },
  { key: 'tablet', label: '平板', icon: 'tablet' },
  { key: 'phone', label: '手機', icon: 'phone' },
]
const DEVICE_CAP: Record<DeviceKey, number | undefined> = { desktop: undefined, tablet: 768, phone: 390 }
const FOLD_H: Record<DeviceKey, number> = { desktop: 800, tablet: 1024, phone: 844 }

function findBlock(blocks: Block[], id: string | null): Block | null {
  if (!id) return null
  const loc = findParentArr(blocks, id)
  return loc ? loc.arr[loc.idx] : null
}

const iconBtn = {
  width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border)',
  background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
} as const

export function DesignPage() {
  const store = useCharacterStore()
  const {
    ui, character, activeTemplate,
    setDesignMode, setActiveTpl, addTemplate, renameTemplate, duplicateTemplate, removeTemplate,
    setAnnotateMode, setDevice, toggleFold, setPageView,
    selectBlock, addBlock, moveBlock, dropToColumn, colResize, moveBlockDir, duplicateBlock, removeBlock, autoPaginate,
    updateBlock, updateBlockStyle, setCols, setColWidth, addTag, updateTag, removeTag,
    libColors, addLibColor, removeLibColor, moveOut, moveColChild, updateDesign,
  } = store

  const [pickOpen, setPickOpen] = useState(false)
  const [addGroup, setAddGroup] = useState<'info' | 'layout' | null>('info')
  const [panelTab, setPanelTab] = useState<'blocks' | 'list' | 'design'>('design')
  const [fs, setFs] = useState(false)
  const [fsPage, setFsPage] = useState(0)
  const [sheet, setSheet] = useState<'none' | 'add' | 'inspect'>('none')
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  const [winH, setWinH] = useState(typeof window !== 'undefined' ? window.innerHeight : 900)
  const [contentH, setContentH] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  const mobile = vw < 900

  useEffect(() => {
    const onResize = () => { setVw(window.innerWidth); setWinH(window.innerHeight) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const inner = el.querySelector('[data-bid]')?.parentElement
      setContentH(inner ? inner.scrollHeight : el.scrollHeight)
    })
    ro.observe(el)
    return () => ro.disconnect()
  })

  const templates = character.templates
  const isEdit = ui.designMode === 'edit'
  const selected = activeTemplate ? findBlock(activeTemplate.blocks, ui.selBlock) : null

  const infoBtns = BLOCK_TYPES.filter(b => INFO_TYPES.includes(b.type))
  const layoutBtns = BLOCK_TYPES.filter(b => !INFO_TYPES.includes(b.type))

  const pageCount = (activeTemplate?.blocks || []).filter(b => b.type === 'pagebreak').length + 1
  const cap = DEVICE_CAP[ui.device as DeviceKey]
  const foldH = ui.device === 'desktop' ? winH : FOLD_H[ui.device as DeviceKey] ?? 844
  const overflow = ui.fold && contentH > foldH + 8

  useEffect(() => {
    if (!fs) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFs(false)
      else if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        setFsPage(p => Math.min(pageCount - 1, p + 1))
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        setFsPage(p => Math.max(0, p - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fs, pageCount])

  const runAutoSplit = () => {
    const el = wrapRef.current
    if (!el) return
    const all = Array.from(el.querySelectorAll('[data-bid]')) as HTMLElement[]
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
        ids.push(tops[i].getAttribute('data-bid') || '')
        while (top >= threshold - 8) threshold += foldH
      }
    }
    autoPaginate(ids.filter(Boolean))
  }

  // Build ctx objects for existing templateBuilder sub-components
  const listCtx = {
    selBlock: ui.selBlock,
    activeTemplate: activeTemplate as CanvasTemplate | null,
    selectBlock,
    moveBlockDir,
    duplicateBlock,
    removeBlock,
    moveColChild,
  }

  const inspectorCtx = {
    character: character as CanvasCharacter,
    activeTemplate: activeTemplate as CanvasTemplate | null,
    selectBlock,
    moveBlockDir,
    duplicateBlock,
    removeBlock,
    updateBlock,
    updateBlockStyle,
    setCols,
    setColWidth,
    addTag,
    updateTag,
    removeTag,
    libColors,
    moveOut,
  }

  const designCtx = {
    character: character as CanvasCharacter,
    activeTemplate: activeTemplate as CanvasTemplate | null,
    updateDesign,
    libColors,
    addLibColor,
    removeLibColor,
  }

  const canvas = (editable: boolean, page: number | 'all' | null) => (
    <TemplateCanvas
      character={character as CanvasCharacter}
      template={activeTemplate as CanvasTemplate | null}
      annotateMode={ui.annotateMode}
      viewport={ui.device}
      pageView={page}
      editable={editable}
      selectedId={editable ? ui.selBlock : null}
      onSelect={editable ? selectBlock : undefined}
      onReorder={editable ? moveBlock : undefined}
      onDropToColumn={editable ? dropToColumn : undefined}
      onColResize={editable ? colResize : undefined}
      onNavTo={!editable ? p => setPageView(p) : undefined}
    />
  )

  const addPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(['info', 'layout'] as const).map(grp => {
        const open = addGroup === grp
        const list = grp === 'info' ? infoBtns : layoutBtns
        return (
          <div key={grp}>
            <button
              onClick={() => setAddGroup(open ? null : grp)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', cursor: 'pointer', background: open ? 'var(--bg-3)' : 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}
            >
              <Icon name={grp === 'info' ? 'list' : 'columns'} size={16} />
              <span style={{ flex: 1, textAlign: 'left' }}>{grp === 'info' ? '資訊積木' : '排版積木'}</span>
              <Icon name={open ? 'chevUp' : 'chevDown'} size={15} />
            </button>
            {open ? (
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', padding: '11px 2px 4px' }}>
                {list.map(bt => (
                  <button
                    key={bt.type}
                    onClick={() => { addBlock(bt.type as BlockType); if (mobile) setSheet('none') }}
                    style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    {bt.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
      <p style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.6, margin: '4px 0 0' }}>
        點積木加到模板最底部。<b>先選取一個積木</b>，新積木就會加在它下方。
      </p>
    </div>
  )

  const noSelPanel = (
    <>
      <div style={{ display: 'flex', gap: 5, background: 'var(--bg-3)', padding: 5, borderRadius: 12, marginBottom: 14 }}>
        <button style={{ ...seg(panelTab === 'design'), flex: 1, padding: '8px 4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} onClick={() => setPanelTab('design')}>
          <Icon name="palette" size={13} /> 設計
        </button>
        <button style={{ ...seg(panelTab === 'blocks'), flex: 1, padding: '8px 4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} onClick={() => setPanelTab('blocks')}>
          <Icon name="plus" size={13} /> 加入積木
        </button>
        <button style={{ ...seg(panelTab === 'list'), flex: 1, padding: '8px 4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} onClick={() => setPanelTab('list')}>
          <Icon name="list" size={13} /> 列表
        </button>
      </div>
      {panelTab === 'design' ? <GlobalDesignPanel ctx={designCtx} /> : panelTab === 'list' ? <BlockListPanel ctx={listCtx} /> : addPanel}
    </>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 26, margin: 0, color: 'var(--text)' }}>模板與展示</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-2)', maxWidth: 520 }}>
            {isEdit ? '用積木拼出展示頁，點積木調整、拖曳左側握把排序。' : '預覽最終展示效果，可切換圖片標記顯示方式。'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 5, background: 'var(--bg-3)', padding: 5, borderRadius: 14, flexShrink: 0 }}>
          <button style={seg(isEdit)} onClick={() => setDesignMode('edit')}>編輯</button>
          <button style={seg(!isEdit)} onClick={() => setDesignMode('preview')}>預覽</button>
        </div>
      </div>

      {/* template toolbar */}
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 5, background: 'var(--bg-3)', padding: 5, borderRadius: 13, flexWrap: 'wrap' }}>
          {templates.map(t => (
            <button key={t.id ?? ''} onClick={() => setActiveTpl(t.id!)} style={{ ...seg(t.id === activeTemplate?.id), background: t.id === activeTemplate?.id ? 'var(--accent)' : 'var(--bg-2)' }}>
              {t.name || '模板'}
            </button>
          ))}
        </div>
        {activeTemplate ? (
          <input
            value={activeTemplate.name}
            onChange={e => renameTemplate(activeTemplate.id!, e.target.value)}
            placeholder="模板名稱"
            style={{ width: 130, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--text)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 11px', outline: 'none' }}
          />
        ) : null}
        <button style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', borderRadius: 10, padding: '8px 13px', cursor: 'pointer' }} onClick={() => setPickOpen(true)}>
          <Icon name="plus" size={14} /> 模板
        </button>
        {activeTemplate ? (
          <>
            <button style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 13px', cursor: 'pointer' }} onClick={() => duplicateTemplate(activeTemplate.id!)}>複製</button>
            <button style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#c0584f', background: 'var(--bg-2)', border: '1px solid #e0b3ad', borderRadius: 10, padding: '8px 13px', cursor: 'pointer' }} onClick={() => removeTemplate(activeTemplate.id!)}>刪除</button>
          </>
        ) : null}

        {isEdit ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>裝置</span>
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', padding: 4, borderRadius: 11 }}>
                {DEVICES.map(d => (
                  <button key={d.key} onClick={() => setDevice(d.key)} title={d.label} style={{ ...seg(ui.device === d.key), padding: '6px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name={d.icon} size={14} />
                  </button>
                ))}
              </div>
            </div>
            <button onClick={toggleFold} style={{ ...seg(ui.fold), background: ui.fold ? 'var(--accent)' : 'var(--bg-2)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="minus" size={14} /> 首屏輔助線
            </button>
            {overflow ? (
              <button onClick={runAutoSplit} title="依首屏高度，自動在本頁插入分頁符號" style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#c0584f', border: 'none', borderRadius: 10, padding: '8px 13px', cursor: 'pointer' }}>
                ⤓ 自動分頁這頁
              </button>
            ) : null}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 5, background: 'var(--bg-3)', padding: 5, borderRadius: 11 }}>
              {(['list', 'tooltip'] as const).map(m => (
                <button key={m} style={seg(ui.annotateMode === m)} onClick={() => setAnnotateMode(m)}>
                  {m === 'list' ? '編號清單' : '浮動說明'}
                </button>
              ))}
            </div>
            <button onClick={() => { setFsPage(0); setFs(true) }} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 11, padding: '9px 16px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ▶ 全螢幕展示
            </button>
          </div>
        )}
      </div>

      {/* page tabs */}
      {pageCount > 1 ? (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, background: 'var(--bg-3)', padding: 5, borderRadius: 12, width: 'fit-content' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', padding: '0 6px' }}>分頁檢視</span>
          <button style={seg(ui.pageView === 'all')} onClick={() => setPageView('all')}>全部</button>
          {Array.from({ length: pageCount }).map((_, i) => (
            <button key={i} style={seg(ui.pageView === i)} onClick={() => setPageView(i)}>第 {i + 1} 頁</button>
          ))}
        </div>
      ) : null}

      {/* body */}
      {isEdit ? (
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }} onClick={() => selectBlock(null)}>
            <div ref={wrapRef} style={{ position: 'relative', maxWidth: cap, margin: cap ? '0 auto' : undefined, width: '100%', transition: 'max-width .25s ease' }}>
              <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 10px 36px rgba(0,0,0,0.06)' }}>{canvas(true, ui.pageView)}</div>
              {ui.fold
                ? Array.from({ length: Math.max(1, Math.ceil(contentH / foldH)) }).map((_, i) => (
                    <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: foldH * (i + 1), pointerEvents: 'none' }}>
                      <div style={{ borderTop: '2px dashed #c0584f', opacity: 0.7 }} />
                      <span style={{ position: 'absolute', right: 8, top: 2, fontSize: 10.5, fontWeight: 700, color: '#fff', background: '#c0584f', borderRadius: 6, padding: '2px 7px' }}>
                        {i === 0 ? `${DEVICES.find(d => d.key === ui.device)?.label}首屏底線` : `第 ${i + 1} 屏`}
                      </span>
                    </div>
                  ))
                : null}
            </div>
          </div>

          {!mobile ? (
            <aside style={{ width: 320, flexShrink: 0 }}>
              <div style={{ position: 'sticky', top: 84, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 18, padding: 18, maxHeight: 'calc(100vh - 110px)', overflowY: 'auto' }}>
                {selected ? <BlockInspector block={selected as CanvasBlock} ctx={inspectorCtx} /> : noSelPanel}
              </div>
            </aside>
          ) : null}
        </div>
      ) : (
        <div style={{ maxWidth: cap, margin: cap ? '0 auto' : undefined, borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 10px 36px rgba(0,0,0,0.06)' }}>{canvas(false, ui.pageView)}</div>
      )}

      {/* mobile editing chrome */}
      {isEdit && mobile && selected ? (
        <div style={{ position: 'fixed', left: 10, right: 10, bottom: 10, zIndex: 59, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 12px 36px rgba(0,0,0,0.28)', display: 'flex', alignItems: 'center', gap: 6, padding: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-2)', padding: '0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{TYPE_LABEL[selected.type as BlockType]}</span>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button title="上移" style={iconBtn} onClick={() => moveBlockDir(selected.id, -1)}><Icon name="arrowUp" size={16} /></button>
            <button title="下移" style={iconBtn} onClick={() => moveBlockDir(selected.id, 1)}><Icon name="arrowDown" size={16} /></button>
            <button title="複製" style={iconBtn} onClick={() => duplicateBlock(selected.id)}><Icon name="copy" size={16} /></button>
            <button title="刪除" style={{ ...iconBtn, border: '1px solid #e0b3ad', background: '#fbeeec', color: '#c0584f' }} onClick={() => removeBlock(selected.id)}><Icon name="trash" size={16} /></button>
            <button style={{ ...iconBtn, width: 'auto', padding: '0 12px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', gap: 5 }} onClick={() => setSheet('inspect')}>樣式</button>
            <button title="完成" style={iconBtn} onClick={() => selectBlock(null)}>✕</button>
          </div>
        </div>
      ) : null}

      {isEdit && mobile && !selected ? (
        <button onClick={() => setSheet('add')} style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 57, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 999, padding: '13px 18px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 10px 28px rgba(0,0,0,0.35)' }}>
          <Icon name="plus" size={16} /> 積木
        </button>
      ) : null}

      {/* mobile slide-up sheet */}
      {isEdit && mobile && sheet !== 'none' ? (
        <>
          <div onClick={() => setSheet('none')} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(20,16,13,0.35)' }} />
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 61, background: 'var(--bg-2)', borderRadius: '18px 18px 0 0', boxShadow: '0 -12px 36px rgba(0,0,0,0.25)', maxHeight: '76vh', overflowY: 'auto', padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <span style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--border)' }} />
            </div>
            {sheet === 'inspect' && selected ? <BlockInspector block={selected as CanvasBlock} ctx={inspectorCtx} /> : noSelPanel}
          </div>
        </>
      ) : null}

      {/* template preset chooser */}
      {pickOpen ? (
        <div onClick={() => setPickOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(20,16,13,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-2)', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', maxWidth: 560, width: '100%', padding: 24, maxHeight: '86vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 19, margin: '0 0 6px', color: 'var(--text)' }}>建立新模板</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 18px' }}>選一個起始版型，之後都能自由調整。</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {PRESET_CARDS.map(p => (
                <button
                  key={p.kind}
                  onClick={() => { addTemplate(p.kind); setPickOpen(false) }}
                  style={{ textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 16 }}
                >
                  <div style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 17, color: 'var(--text)', marginBottom: 5 }}>{p.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* fullscreen presentation */}
      {fs ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: activeTemplate?.design?.bg || '#fff', overflowY: 'auto' }}>
          <button onClick={() => setFs(false)} title="關閉 (Esc)" style={{ position: 'fixed', top: 18, right: 20, width: 42, height: 42, borderRadius: 12, border: 'none', background: 'rgba(0,0,0,0.22)', color: '#fff', cursor: 'pointer', fontSize: 22, zIndex: 3 }}>×</button>
          <TemplateCanvas character={character as CanvasCharacter} template={activeTemplate as CanvasTemplate | null} annotateMode={ui.annotateMode} viewport={ui.device} pageView={pageCount > 1 ? fsPage : 'all'} onNavTo={p => setFsPage(p as number)} />
          {pageCount > 1 ? (
            <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(0,0,0,0.34)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '8px 14px', zIndex: 3 }}>
              <button onClick={() => setFsPage(p => Math.max(0, p - 1))} title="上一頁 (↑)" style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer', fontSize: 18 }}>‹</button>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                {Array.from({ length: pageCount }).map((_, i) => (
                  <button key={i} onClick={() => setFsPage(i)} style={{ width: i === fsPage ? 22 : 9, height: 9, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer', background: i === fsPage ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all .2s' }} />
                ))}
              </div>
              <span style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', minWidth: 46, textAlign: 'center' }}>{fsPage + 1} / {pageCount}</span>
              <button onClick={() => setFsPage(p => Math.min(pageCount - 1, p + 1))} title="下一頁 (↓)" style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer', fontSize: 18 }}>›</button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* desktop selection label */}
      {isEdit && !mobile && selected ? (
        <div style={{ position: 'fixed', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 40, fontSize: 12, color: 'var(--text-2)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 999, padding: '6px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          已選取：<b style={{ color: 'var(--accent)' }}>{TYPE_LABEL[selected.type as BlockType]}</b>
        </div>
      ) : null}
    </div>
  )
}
