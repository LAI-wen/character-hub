import { useOctool } from '../../store/useOctool'
import { Icon } from '../../components/Icon'
import { TYPE_LABEL } from '../../data/blocks'
import { pickImage } from '../../data/upload'
import type { Block, BlockType } from '../../types'

const labelStyle = { fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 } as const
const iconBtn = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-2)',
  color: 'var(--text-2)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const

function seg(active: boolean) {
  return {
    flex: 1,
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    borderRadius: 8,
    padding: '7px 4px',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-2)',
    whiteSpace: 'nowrap' as const,
  }
}

const selectStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  fontFamily: 'inherit',
  fontSize: 13,
  color: 'var(--text)',
  background: 'var(--bg-3)',
  border: '1px solid var(--border)',
  borderRadius: 9,
  padding: '8px 9px',
  outline: 'none',
  cursor: 'pointer',
}
const textInput = {
  width: '100%',
  boxSizing: 'border-box' as const,
  fontFamily: 'inherit',
  fontSize: 13.5,
  lineHeight: 1.6,
  color: 'var(--text)',
  background: 'var(--bg-3)',
  border: '1px solid var(--border)',
  borderRadius: 9,
  padding: '8px 10px',
  outline: 'none',
}

const SIZE_TYPES = ['heading', 'tagline', 'avatar', 'cover', 'text']
const STYLED_TYPES = ['heading', 'tagline', 'section', 'palette', 'album', 'text', 'avatar', 'cover']

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={labelStyle}>{title}</div>
      {children}
    </div>
  )
}
function Segmented<T extends string | number>({ value, options, onPick }: { value: T; options: { v: T; l: string }[]; onPick: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', padding: 4, borderRadius: 10, flexWrap: 'wrap' }}>
      {options.map((o) => (
        <button key={String(o.v)} style={seg(value === o.v)} onClick={() => onPick(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  )
}

// Palette-swatch colour picker: library colours + an "other" native picker.
// `allowTransparent` adds a checkerboard chip that stores 'transparent'.
function Swatches({
  value,
  lib,
  allowTransparent,
  onPick,
}: {
  value?: string
  lib: string[]
  allowTransparent?: boolean
  onPick: (hex: string) => void
}) {
  const chip = (sel: boolean) => ({
    width: 30,
    height: 30,
    borderRadius: 9,
    cursor: 'pointer',
    padding: 0,
    border: sel ? '2px solid var(--accent)' : '1px solid var(--border)',
    flexShrink: 0,
  })
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {allowTransparent ? (
        <button
          title="透明"
          onClick={() => onPick('transparent')}
          style={{
            ...chip(value === 'transparent' || !value),
            background:
              'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 12px 12px',
          }}
        />
      ) : null}
      {lib.map((hex) => (
        <button key={hex} title={hex} onClick={() => onPick(hex)} style={{ ...chip(value === hex), background: hex }} />
      ))}
      <label style={{ ...chip(false), position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', background: 'var(--bg-2)', borderStyle: 'dashed' }}>
        <Icon name="droplet" size={14} />
        <input
          type="color"
          value={value && value[0] === '#' ? value : '#888888'}
          onChange={(e) => onPick(e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
        />
      </label>
    </div>
  )
}

const BORDER_W = [
  { v: 0, l: '無' },
  { v: 1, l: '細' },
  { v: 2, l: '中' },
  { v: 3, l: '粗' },
]
const BORDER_S = [
  { v: 'solid', l: '實線' },
  { v: 'dashed', l: '虛線' },
  { v: 'dotted', l: '點線' },
  { v: 'double', l: '雙線' },
]

export function BlockInspector({ block }: { block: Block }) {
  const {
    character,
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
    activeTemplate,
  } = useOctool()

  const st = block.style || {}
  const t = block.type
  const styled = true // 自訂外觀 對所有積木開放（與原版一致）
  // Swatch options come from the character's 色票 (their theme colours) first,
  // then the template colour library — deduped. The "+" still allows any colour.
  const lib = Array.from(
    new Set([...(character.palette || []).map((p) => p.hex).filter(Boolean), ...libColors()]),
  )
  const sv = <K extends keyof typeof st>(k: K, d: unknown) => (st[k] === undefined ? d : st[k])
  const nested = (activeTemplate?.blocks || []).some((x) => x.type === 'columns' && (x.children || []).some((col) => col.some((cb) => cb.id === block.id)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: -2 }}>
        <Icon name="sliders" size={16} style={{ color: 'var(--accent)' }} />
        <h3 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 17, margin: 0, flex: 1, color: 'var(--text)' }}>元件樣式</h3>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
          選取：<b style={{ color: 'var(--accent)' }}>{TYPE_LABEL[t as BlockType]}</b>
        </span>
        <div style={{ display: 'flex', gap: 5 }}>
          <button title="上移" style={iconBtn} onClick={() => moveBlockDir(block.id, -1)}><Icon name="arrowUp" size={15} /></button>
          <button title="下移" style={iconBtn} onClick={() => moveBlockDir(block.id, 1)}><Icon name="arrowDown" size={15} /></button>
          <button title="複製" style={iconBtn} onClick={() => duplicateBlock(block.id)}><Icon name="copy" size={15} /></button>
          <button title="刪除" style={{ ...iconBtn, border: '1px solid #e0b3ad', background: '#fbeeec', color: '#c0584f' }} onClick={() => removeBlock(block.id)}><Icon name="trash" size={15} /></button>
        </div>
      </div>

      {nested ? (
        <button onClick={() => moveOut(block.id)} style={{ alignSelf: 'flex-start', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', borderRadius: 9, padding: '8px 12px', cursor: 'pointer' }}>移出佈局</button>
      ) : null}

      {/* content source / text */}
      {t === 'section' ? (
        <>
          <Group title="資料來源（區塊）">
            <select value={block.sourceId || ''} onChange={(e) => updateBlock(block.id, 'sourceId', e.target.value)} style={selectStyle}>
              <option value="">（未綁定）</option>
              {character.sections.map((s) => (<option key={s.id} value={s.id}>{s.title || '未命名區塊'}</option>))}
            </select>
          </Group>
          <Group title="呈現方式"><Segmented value={block.variant || 'plain'} options={[{ v: 'plain', l: '列表' }, { v: 'cards', l: '卡片' }]} onPick={(v) => updateBlock(block.id, 'variant', v)} /></Group>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>隱藏區塊標題</div>
            <button onClick={() => updateBlock(block.id, 'hideTitle', !block.hideTitle)} style={{ flexShrink: 0, width: 46, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', background: block.hideTitle ? 'var(--accent)' : 'var(--border)', position: 'relative' }}><span style={{ position: 'absolute', top: 3, left: block.hideTitle ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff' }} /></button>
          </div>
          <Group title="自訂標題"><input value={block.titleOverride || ''} onChange={(e) => updateBlock(block.id, 'titleOverride', e.target.value)} placeholder="留空＝用區塊原本標題" style={textInput} /></Group>
        </>
      ) : null}

      {t === 'album' ? (
        <>
          <Group title="資料來源（相簿）">
            <select value={block.sourceId || ''} onChange={(e) => updateBlock(block.id, 'sourceId', e.target.value)} style={selectStyle}>
              <option value="">（未綁定）</option>
              {character.albums.map((a) => (<option key={a.id} value={a.id}>{a.name || '未命名相簿'}</option>))}
            </select>
          </Group>
          <Group title="排列方式"><Segmented value={block.mode || 'grid'} options={[{ v: 'grid', l: '方格' }, { v: 'carousel', l: '橫向捲動' }]} onPick={(v) => updateBlock(block.id, 'mode', v)} /></Group>
          <Group title="圖片比例"><Segmented value={block.ratio || 'square'} options={[{ v: 'square', l: '方形' }, { v: 'portrait', l: '直式' }, { v: 'landscape', l: '橫式' }, { v: 'natural', l: '原比例' }]} onPick={(v) => updateBlock(block.id, 'ratio', v)} /></Group>
          {block.mode !== 'carousel' ? (
            <Group title={`欄數 ${block.cols || 3}`}><input type="range" min={2} max={4} value={block.cols || 3} onChange={(e) => updateBlock(block.id, 'cols', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} /></Group>
          ) : null}
        </>
      ) : null}

      {t === 'palette' ? (
        <Group title="樣式"><Segmented value={block.pvar || 'swatch'} options={[{ v: 'swatch', l: '色塊' }, { v: 'dots', l: '圓點' }, { v: 'bar', l: '色條' }]} onPick={(v) => updateBlock(block.id, 'pvar', v)} /></Group>
      ) : null}

      {t === 'text' || t === 'button' || t === 'popup' || t === 'marquee' ? (
        <Group title={t === 'popup' ? '按鈕文字' : '文字內容'}>
          <textarea value={block.text || ''} onChange={(e) => updateBlock(block.id, 'text', e.target.value)} placeholder="輸入文字…" style={{ ...textInput, minHeight: t === 'text' ? 64 : 44, resize: 'vertical' }} />
          {t === 'popup' ? (
            <>
              <div style={{ marginTop: 8 }}><div style={labelStyle}>觸發樣式</div><Segmented value={block.trigger || 'button'} options={[{ v: 'button', l: '按鈕' }, { v: 'thumb', l: '縮圖' }]} onPick={(v) => updateBlock(block.id, 'trigger', v)} /></div>
              <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
                <input value={block.popupImg || ''} onChange={(e) => updateBlock(block.id, 'popupImg', e.target.value)} placeholder="圖片 URL（選填）" style={textInput} />
                <button onClick={() => pickImage((url) => updateBlock(block.id, 'popupImg', url))} style={{ flexShrink: 0, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', borderRadius: 9, padding: '0 13px', cursor: 'pointer' }}>上傳</button>
              </div>
              <input value={block.title || ''} onChange={(e) => updateBlock(block.id, 'title', e.target.value)} placeholder="視窗標題" style={{ ...textInput, marginTop: 8 }} />
              <textarea value={block.body || ''} onChange={(e) => updateBlock(block.id, 'body', e.target.value)} placeholder="點開後顯示的內容…" style={{ ...textInput, marginTop: 8, minHeight: 64, resize: 'vertical' }} />
            </>
          ) : null}
        </Group>
      ) : null}

      {t === 'marquee' ? (
        <Group title="捲動速度"><Segmented value={(block as { speed?: number }).speed || 18} options={[{ v: 28, l: '慢' }, { v: 18, l: '中' }, { v: 10, l: '快' }]} onPick={(v) => updateBlock(block.id, 'speed', v)} /></Group>
      ) : null}

      {t === 'badges' ? (
        <Group title="標籤">
          <Segmented value={block.tagStyle || 'solid'} options={[{ v: 'solid', l: '實心' }, { v: 'outline', l: '外框' }]} onPick={(v) => updateBlock(block.id, 'tagStyle', v)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
            {(block.tags || []).map((tg) => (
              <div key={tg.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="color" value={tg.color} onChange={(e) => updateTag(block.id, tg.id, 'color', e.target.value)} style={{ width: 30, height: 30, border: 'none', background: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, borderRadius: 7 }} />
                <input value={tg.label} onChange={(e) => updateTag(block.id, tg.id, 'label', e.target.value)} placeholder="標籤文字" style={{ ...textInput, padding: '6px 9px' }} />
                <button onClick={() => removeTag(block.id, tg.id)} style={{ ...iconBtn, flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
          <button onClick={() => addTag(block.id)} style={{ marginTop: 8, width: '100%', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', borderRadius: 9, padding: '8px', cursor: 'pointer' }}>＋ 標籤</button>
        </Group>
      ) : null}

      {t === 'columns' ? (
        <>
          <Group title="欄數"><Segmented value={block.cols || 2} options={[{ v: 2, l: '2 欄' }, { v: 3, l: '3 欄' }, { v: 4, l: '4 欄' }]} onPick={(v) => setCols(block.id, v)} /></Group>
          <Group title="各欄寬度">
            {(block.widths || []).map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-2)', width: 36 }}>欄 {i + 1}</span>
                <input type="range" min={20} max={80} value={w} onChange={(e) => setColWidth(block.id, i, Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-2)', width: 34, textAlign: 'right' }}>{w}%</span>
              </div>
            ))}
          </Group>
          <Group title="垂直對齊"><Segmented value={block.valign || 'start'} options={[{ v: 'start', l: '上' }, { v: 'center', l: '中' }, { v: 'end', l: '下' }]} onPick={(v) => updateBlock(block.id, 'valign', v)} /></Group>
        </>
      ) : null}

      {/* size */}
      {SIZE_TYPES.includes(t) ? (
        <Group title="大小"><Segmented value={block.size || 'md'} options={[{ v: 'sm', l: '小' }, { v: 'md', l: '中' }, { v: 'lg', l: '大' }, { v: 'xl', l: '特大' }]} onPick={(v) => updateBlock(block.id, 'size', v)} /></Group>
      ) : null}

      {/* ratio (cover) */}
      {t === 'cover' ? (
        <Group title="比例"><Segmented value={block.ratio || 'natural'} options={[{ v: 'natural', l: '原圖' }, { v: 'banner', l: '橫幅' }, { v: 'wide', l: '寬' }, { v: 'standard', l: '標準' }, { v: 'square', l: '正方' }]} onPick={(v) => updateBlock(block.id, 'ratio', v)} /></Group>
      ) : null}

      {/* alignment + width */}
      <Group title="對齊"><Segmented value={st.align || 'left'} options={[{ v: 'left', l: '左' }, { v: 'center', l: '中' }, { v: 'right', l: '右' }]} onPick={(v) => updateBlockStyle(block.id, 'align', v)} /></Group>
      <Group title="寬度"><Segmented value={(st as { width?: string }).width || 'full'} options={[{ v: 'full', l: '滿' }, { v: 'half', l: '½' }, { v: 'third', l: '⅓' }]} onPick={(v) => updateBlockStyle(block.id, 'width', v)} /></Group>

      {t !== 'columns' && t !== 'pagebreak' ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>滿版（與螢幕同寬）</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.5 }}>撐到整個畫面左右到邊，做成橫幅式元件。</div>
          </div>
          <button onClick={() => updateBlockStyle(block.id, 'fullBleed', !(st as { fullBleed?: boolean }).fullBleed)} style={{ flexShrink: 0, width: 46, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', background: (st as { fullBleed?: boolean }).fullBleed ? 'var(--accent)' : 'var(--border)', position: 'relative' }}>
            <span style={{ position: 'absolute', top: 3, left: (st as { fullBleed?: boolean }).fullBleed ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
          </button>
        </div>
      ) : null}

      {/* custom appearance (styled types) */}
      {styled ? (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--bg-3)', borderRadius: 12, padding: '10px 12px', border: st.custom ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="palette" size={15} style={{ color: 'var(--accent)' }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>自訂外觀</div>
            </div>
            <button onClick={() => updateBlockStyle(block.id, 'custom', !st.custom)} style={{ flexShrink: 0, width: 46, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', background: st.custom ? 'var(--accent)' : 'var(--border)', position: 'relative' }}>
              <span style={{ position: 'absolute', top: 3, left: st.custom ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
            </button>
          </div>
          {st.custom ? (
            <>
              <Group title="文字顏色"><Swatches value={st.textColor as string} lib={lib} onPick={(h) => updateBlockStyle(block.id, 'textColor', h)} /></Group>
              <Group title="底色"><Swatches value={(st.bgColor as string) || 'transparent'} lib={lib} allowTransparent onPick={(h) => updateBlockStyle(block.id, 'bgColor', h)} /></Group>
              <Group title="效果"><Segmented value={(st as { fx?: string }).fx || 'none'} options={[{ v: 'none', l: '無' }, { v: 'soft', l: '柔影' }, { v: 'float', l: '浮起' }, { v: 'glow', l: '光暈' }, { v: 'glass', l: '玻璃' }]} onPick={(v) => updateBlockStyle(block.id, 'fx', v === 'none' ? '' : v)} /></Group>
              <Group title={`透明度 ${st.opacity ?? 100}%`}><input type="range" min={0} max={100} value={st.opacity ?? 100} onChange={(e) => updateBlockStyle(block.id, 'opacity', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} /></Group>
              <Group title="邊框顏色"><Swatches value={st.borderColor as string} lib={lib} onPick={(h) => updateBlockStyle(block.id, 'borderColor', h)} /></Group>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}><Group title="邊框粗細"><select value={String(sv('borderWidth', 0))} onChange={(e) => updateBlockStyle(block.id, 'borderWidth', Number(e.target.value))} style={selectStyle}>{BORDER_W.map((o) => (<option key={o.v} value={o.v}>{o.l}</option>))}</select></Group></div>
                <div style={{ flex: 1 }}><Group title="邊框樣式"><select value={String(sv('borderStyle', 'solid'))} onChange={(e) => updateBlockStyle(block.id, 'borderStyle', e.target.value)} style={selectStyle}>{BORDER_S.map((o) => (<option key={o.v} value={o.v}>{o.l}</option>))}</select></Group></div>
              </div>
              <Group title={`圓角 ${st.radius ?? 0}px`}><input type="range" min={0} max={40} value={st.radius ?? 0} onChange={(e) => updateBlockStyle(block.id, 'radius', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} /></Group>
            </>
          ) : null}
        </div>
      ) : null}

      {/* divider style */}
      {t === 'divider' ? (
        <>
          <Group title="線條樣式"><Segmented value={st.borderStyle || 'solid'} options={[{ v: 'solid', l: '實線' }, { v: 'dashed', l: '虛線' }, { v: 'dotted', l: '點線' }]} onPick={(v) => updateBlockStyle(block.id, 'borderStyle', v)} /></Group>
          <Group title="粗細"><Segmented value={st.borderWidth || 1} options={[{ v: 1, l: '細' }, { v: 2, l: '中' }, { v: 3, l: '粗' }]} onPick={(v) => updateBlockStyle(block.id, 'borderWidth', v)} /></Group>
          <Group title="顏色"><Swatches value={st.borderColor as string} lib={lib} onPick={(h) => updateBlockStyle(block.id, 'borderColor', h)} /></Group>
        </>
      ) : null}

      {/* padding / spacer height */}
      {t === 'spacer' ? (
        <Group title={`高度 ${st.padding ?? 36}px`}><input type="range" min={8} max={160} value={st.padding ?? 36} onChange={(e) => updateBlockStyle(block.id, 'padding', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} /></Group>
      ) : (
        <Group title={`內距 ${st.padding ?? 14}px`}><input type="range" min={0} max={60} value={st.padding ?? 14} onChange={(e) => updateBlockStyle(block.id, 'padding', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} /></Group>
      )}

      <button onClick={() => selectBlock(null)} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--text-2)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px', cursor: 'pointer' }}>完成</button>
    </div>
  )
}
