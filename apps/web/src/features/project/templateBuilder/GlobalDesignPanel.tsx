import { useState, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { AssetPickerModal } from '@/components/AssetPickerModal'
import { FONT_OPTS, type DeviceKey } from './blocks'
import type { CanvasCharacter, CanvasDesign, CanvasTemplate } from '@/components/TemplateCanvas'

export type DesignCtx = {
  character: CanvasCharacter
  activeTemplate: CanvasTemplate | null
  updateDesign: (key: string, val: unknown) => void
  libColors: () => string[]
  addLibColor: (hex: string) => void
  removeLibColor: (hex: string) => void
}

const labelStyle = { fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 } as const
const selectStyle = {
  width: '100%', boxSizing: 'border-box' as const, fontFamily: 'inherit', fontSize: 13,
  color: 'var(--text)', background: 'var(--bg-3)', border: '1px solid var(--border)',
  borderRadius: 9, padding: '8px 9px', outline: 'none', cursor: 'pointer',
}
const textInput = {
  width: '100%', boxSizing: 'border-box' as const, fontFamily: 'inherit', fontSize: 12.5,
  color: 'var(--text)', background: 'var(--bg-3)', border: '1px solid var(--border)',
  borderRadius: 9, padding: '8px 10px', outline: 'none',
}

function seg(active: boolean) {
  return {
    flex: 1, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
    borderRadius: 8, padding: '7px 4px', background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-2)',
  } as const
}

const WIDTH_OPTS = [{ key: 'narrow', label: '窄' }, { key: 'normal', label: '標準' }, { key: 'wide', label: '寬' }]
const BG_SIZE = [{ v: 'cover', l: '裁切填滿' }, { v: 'contain', l: '完整顯示' }, { v: 'auto', l: '原始大小' }]
const BG_REPEAT = [{ v: 'no-repeat', l: '不重複' }, { v: 'repeat', l: '重複' }, { v: 'repeat-x', l: '橫向' }, { v: 'repeat-y', l: '縱向' }]
const BG_ATTACH = [{ v: 'scroll', l: '隨頁捲動' }, { v: 'fixed', l: '固定畫面' }]
const DEV: { k: DeviceKey; l: string; key: keyof CanvasDesign; hint: string }[] = [
  { k: 'desktop', l: '電腦', key: 'bgImage', hint: '建議 2560 × 1600 px（橫向 16:10）' },
  { k: 'tablet', l: '平板', key: 'bgImageTablet', hint: '建議 1536 × 2048 px（直向 3:4）' },
  { k: 'phone', l: '手機', key: 'bgImagePhone', hint: '建議 1170 × 2532 px（直向 9:19.5）' },
]

function SwatchBtn({ hex, sel, onClick }: { hex: string; sel: boolean; onClick: () => void }) {
  return <button onClick={onClick} title={hex} style={{ width: 30, height: 30, borderRadius: 9, cursor: 'pointer', padding: 0, border: sel ? '2px solid var(--accent)' : '1px solid var(--border)', background: hex, flexShrink: 0 }} />
}

function Section({ id, icon, title, open, onToggle, children }: { id: string; icon: string; title: string; open: boolean; onToggle: (id: string) => void; children: ReactNode }) {
  return (
    <div>
      <button onClick={() => onToggle(id)} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', cursor: 'pointer', background: 'var(--bg-2)', border: open ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
        <Icon name={icon} size={16} style={{ color: 'var(--text-2)' }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{title}</span>
        <Icon name={open ? 'chevUp' : 'chevDown'} size={15} />
      </button>
      {open ? <div style={{ display: 'flex', flexDirection: 'column', gap: 13, padding: '13px 2px 4px' }}>{children}</div> : null}
    </div>
  )
}

export function GlobalDesignPanel({ ctx }: { ctx: DesignCtx }) {
  const { character, activeTemplate, updateDesign, libColors, addLibColor, removeLibColor } = ctx
  const d: CanvasDesign = activeTemplate?.design || {}
  const swatchLib = Array.from(new Set([...(character.palette || []).map(p => p.hex).filter(Boolean), ...libColors()]))
  const [open, setOpen] = useState<string | null>('bg')
  const [bgDev, setBgDev] = useState<DeviceKey>('desktop')
  const [showBgPicker, setShowBgPicker] = useState(false)
  const toggle = (id: string) => setOpen(o => o === id ? null : id)

  const dev = DEV.find(x => x.k === bgDev)!
  const curBg = (d[dev.key] as string) || ''

  return (
    <>
    {showBgPicker && (
      <AssetPickerModal
        onSelect={url => { updateDesign(dev.key as string, url); setShowBgPicker(false) }}
        onClose={() => setShowBgPicker(false)}
      />
    )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="layout" size={16} style={{ color: 'var(--accent)' }} />
          <h3 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 17, margin: 0, color: 'var(--text)' }}>全域網站設計</h3>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '6px 0 4px', lineHeight: 1.5 }}>這套模板的整體外觀。點積木可單獨調整該元件。</p>
      </div>

      <Section id="bg" icon="image" title="背景設定" open={open === 'bg'} onToggle={toggle}>
        <div>
          <div style={labelStyle}>背景圖（可分裝置）</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', padding: 4, borderRadius: 10 }}>
            {DEV.map(x => <button key={x.k} style={seg(bgDev === x.k)} onClick={() => setBgDev(x.k)}>{x.l}</button>)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--bg-3)', borderRadius: 9, padding: '9px 11px', margin: '8px 0' }}>
            {dev.hint}<br />未設定的裝置會自動沿用「電腦」背景。
          </div>
          <div style={labelStyle}>圖片 URL</div>
          <input value={curBg} onChange={e => updateDesign(dev.key as string, e.target.value)} placeholder="https://…" style={textInput} />
          <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
            <button onClick={() => setShowBgPicker(true)} style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', borderRadius: 9, padding: '6px 12px', cursor: 'pointer' }}>從圖庫選圖</button>
            {curBg ? (
              <button onClick={() => updateDesign(dev.key as string, '')} style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 9, padding: '6px 12px', cursor: 'pointer' }}>移除背景</button>
            ) : null}
          </div>
        </div>
        <div>
          <div style={labelStyle}>背景色</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
            {swatchLib.map(hex => <SwatchBtn key={hex} hex={hex} sel={(d.bg || '#ffffff') === hex} onClick={() => updateDesign('bg', hex)} />)}
            <label style={{ width: 30, height: 30, borderRadius: 9, border: '1px dashed var(--border)', background: 'var(--bg-2)', position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', cursor: 'pointer', flexShrink: 0 }}>
              <Icon name="droplet" size={14} />
              <input type="color" value={d.bg || '#ffffff'} onChange={e => updateDesign('bg', e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}><div style={labelStyle}>重複</div><select value={d.bgRepeat || 'no-repeat'} onChange={e => updateDesign('bgRepeat', e.target.value)} style={selectStyle}>{BG_REPEAT.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
          <div style={{ flex: 1 }}><div style={labelStyle}>填充</div><select value={d.bgSize || 'cover'} onChange={e => updateDesign('bgSize', e.target.value)} style={selectStyle}>{BG_SIZE.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
        </div>
        <div><div style={labelStyle}>圖片捲動</div><select value={d.bgAttach || 'scroll'} onChange={e => updateDesign('bgAttach', e.target.value)} style={selectStyle}>{BG_ATTACH.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
        <div><div style={labelStyle}>亮度 {d.maskBright ?? 100}%</div><input type="range" min={20} max={150} value={d.maskBright ?? 100} onChange={e => updateDesign('maskBright', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} /></div>
        <div>
          <div style={labelStyle}>模糊 {d.maskBlur ?? 0}px ・ 飽和 {d.maskSat ?? 100}%</div>
          <input type="range" min={0} max={20} value={d.maskBlur ?? 0} onChange={e => updateDesign('maskBlur', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <input type="range" min={0} max={200} value={d.maskSat ?? 100} onChange={e => updateDesign('maskSat', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)', marginTop: 6 }} />
        </div>
      </Section>

      <Section id="font" icon="type" title="字型與主色" open={open === 'font'} onToggle={toggle}>
        <div>
          <div style={labelStyle}>字體</div>
          <select value={d.font || 'noto-serif'} onChange={e => updateDesign('font', e.target.value)} style={selectStyle}>
            {FONT_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <div style={labelStyle}>匯入字體（Google Fonts 名稱）</div>
          <input value={d.fontImport || ''} onChange={e => updateDesign('fontImport', e.target.value)} placeholder="例：Zen Maru Gothic" style={textInput} />
        </div>
        <div>
          <div style={labelStyle}>全局對齊</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', padding: 4, borderRadius: 10 }}>
            {(['left', 'center', 'right'] as const).map(a => (
              <button key={a} style={seg((d.align || 'left') === a)} onClick={() => updateDesign('align', a)}>{a === 'left' ? '靠左' : a === 'center' ? '置中' : '靠右'}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={labelStyle}>主色</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
            {swatchLib.map(hex => <SwatchBtn key={hex} hex={hex} sel={(d.primary || '#c98a5e') === hex} onClick={() => updateDesign('primary', hex)} />)}
            <label style={{ width: 30, height: 30, borderRadius: 9, border: '1px dashed var(--border)', background: 'var(--bg-2)', position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', cursor: 'pointer', flexShrink: 0 }}>
              <Icon name="droplet" size={14} />
              <input type="color" value={d.primary || '#c98a5e'} onChange={e => updateDesign('primary', e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </label>
          </div>
        </div>
      </Section>

      <Section id="lib" icon="palette" title="主題色彩庫" open={open === 'lib'} onToggle={toggle}>
        <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>背景、主色與所有積木顏色都取自這組色庫。</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(58px,1fr))', gap: 10 }}>
          {libColors().map(hex => (
            <div key={hex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <span style={{ width: '100%', height: 44, borderRadius: 12, background: hex, border: '1px solid var(--border)' }} />
              <button onClick={() => removeLibColor(hex)} title="刪除" style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="trash" size={13} />
              </button>
            </div>
          ))}
        </div>
        <label style={{ width: '100%', boxSizing: 'border-box', position: 'relative', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--text-2)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="plus" size={14} /> 新增顏色
          <input type="color" defaultValue="#c98a5e" onChange={e => addLibColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
        </label>
      </Section>

      <Section id="width" icon="layout" title="佈局寬度" open={open === 'width'} onToggle={toggle}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', padding: 4, borderRadius: 10 }}>
          {WIDTH_OPTS.map(o => <button key={o.key} style={seg((d.width || 'normal') === o.key)} onClick={() => updateDesign('width', o.key)}>{o.label}</button>)}
        </div>
        <div>
          <div style={labelStyle}>每頁高度（全螢幕翻頁）</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', padding: 4, borderRadius: 10 }}>
            <button style={seg(d.pageFit === 'fixed')} onClick={() => updateDesign('pageFit', 'fixed')}>固定一屏</button>
            <button style={seg((d.pageFit || 'auto') === 'auto')} onClick={() => updateDesign('pageFit', 'auto')}>自動高度</button>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.6, marginTop: 7 }}>固定一屏：每頁置中、剛好一個螢幕；自動高度：內容多時頁內可捲動。</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>頁面導覽列</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.5 }}>有多頁（分頁）時，自動在頂端顯示「第 N 頁」跳頁列。</div>
          </div>
          <button onClick={() => updateDesign('autoNav', !d.autoNav)} style={{ flexShrink: 0, width: 46, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', background: d.autoNav ? 'var(--accent)' : 'var(--border)', position: 'relative' }}>
            <span style={{ position: 'absolute', top: 3, left: d.autoNav ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
          </button>
        </div>
      </Section>
    </div>
    </>
  )
}
