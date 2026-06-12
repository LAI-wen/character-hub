import { useCharacterStore } from '@/store/useCharacterStore'
import { Icon } from '@/components/Icon'
import { PRESETS } from '@/data/palettePresets'
import { Card, CardHead, softBtn } from './FormControls'

export function ImagesCard() {
  const { character, updateCore, uploadCore, openCropper } = useCharacterStore()
  const fields: { key: 'avatarUrl' | 'mainVisualUrl'; label: string; crop?: boolean }[] = [
    { key: 'avatarUrl', label: '頭像 URL', crop: true },
    { key: 'mainVisualUrl', label: '主視覺 URL' },
  ]
  return (
    <Card>
      <CardHead icon={<Icon name="image" size={15} />} title="主要圖片" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 15 }}>
        {fields.map((f) => (
          <div key={f.key} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', margin: '0 0 6px' }}>{f.label}</span>
            <div style={{ display: 'flex', gap: 7 }}>
              <input value={character[f.key]} onChange={(e) => updateCore(f.key, e.target.value)} placeholder="https://…"
                style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 14, color: 'var(--text)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 13px', outline: 'none' }} />
              <button onClick={() => (f.crop ? openCropper(f.key) : uploadCore(f.key))}
                style={{ flexShrink: 0, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', borderRadius: 10, padding: '0 13px', cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="upload" size={14} /> 上傳
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function PaletteCard() {
  const { character, addSwatch, updateSwatch, removeSwatch, applyPreset, openEyedrop } = useCharacterStore()
  return (
    <Card>
      <CardHead icon={<Icon name="palette" size={15} />} title="色票"
        right={
          <div style={{ display: 'flex', gap: 7 }}>
            <button style={{ ...softBtn(), background: 'var(--bg-3)', color: 'var(--text-2)' }} onClick={openEyedrop}>
              <Icon name="droplet" size={14} /> 吸色
            </button>
            <button style={softBtn()} onClick={addSwatch}><Icon name="plus" size={14} /> 顏色</button>
          </div>
        }
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
        {PRESETS.map((p) => (
          <button key={p.name} onClick={() => applyPreset(p.colors)}
            style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--text-2)', borderRadius: 999, padding: '6px 10px 6px 7px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-flex', gap: 2 }}>
              {p.colors.map((c, i) => <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c.hex }} />)}
            </span>
            {p.name}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {character.palette.map((sw) => (
          <div key={sw.id} style={{ display: 'flex', gap: 9, alignItems: 'center', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 13, padding: '9px 11px' }}>
            <input type="color" value={sw.hex} onChange={(e) => updateSwatch(sw.id, 'hex', e.target.value)}
              style={{ width: 38, height: 38, border: 'none', background: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, borderRadius: 9 }} />
            <input value={sw.label} onChange={(e) => updateSwatch(sw.id, 'label', e.target.value)} placeholder="名稱（髮色…）"
              style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 14, color: 'var(--text)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 10px', outline: 'none' }} />
            <input value={sw.hex} onChange={(e) => updateSwatch(sw.id, 'hex', e.target.value)} placeholder="#000000"
              style={{ width: 104, boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 13, color: 'var(--text)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 10px', outline: 'none' }} />
            <button onClick={() => removeSwatch(sw.id)}
              style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 15 }}>×</button>
          </div>
        ))}
        {character.palette.length === 0 ? (
          <div style={{ border: '1.5px dashed var(--border)', borderRadius: 11, padding: 18, textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>
            還沒有色票，點右上「＋ 顏色」或套用上方配色組
          </div>
        ) : null}
      </div>
    </Card>
  )
}
